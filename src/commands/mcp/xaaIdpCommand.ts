/**
 * `claude mcp xaa` — manage the XAA (SEP-990) IdP connection.
 *
 * The IdP connection is user-level: configure once, all XAA-enabled MCP
 * servers reuse it. Lives in settings.xaaIdp (non-secret) + a keychain slot
 * keyed by issuer (secret). Separate trust domain from per-server AS secrets.
 */
import type { Command } from '@commander-js/extra-typings'
import { cliError, cliOk } from '../../cli/exit.js'
import {
  acquireIdpIdToken,
  clearIdpClientSecret,
  clearIdpIdToken,
  getCachedIdpIdToken,
  getIdpClientSecret,
  getXaaIdpSettings,
  issuerKey,
  saveIdpClientSecret,
  saveIdpIdTokenFromJwt,
} from '../../services/mcp/xaaIdpLogin.js'
import { errorMessage } from '../../utils/errors.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'
import { uiText } from '../../utils/uiLocale.js'

export function registerMcpXaaIdpCommand(mcp: Command): void {
  const xaaIdp = mcp
    .command('xaa')
    .description(uiText('Manage the XAA (SEP-990) IdP connection', '管理 XAA（SEP-990）IdP 连接'))

  xaaIdp
    .command('setup')
    .description(
      uiText(
        'Configure the IdP connection (one-time setup for all XAA-enabled servers)',
        '配置 IdP 连接（对所有启用 XAA 的服务器一次配置即可）',
      ),
    )
    .requiredOption('--issuer <url>', uiText('IdP issuer URL (OIDC discovery)', 'IdP 发行者 URL（用于 OIDC 发现）'))
    .requiredOption('--client-id <id>', uiText("Claude Code's client_id at the IdP", 'Claude Code 在 IdP 的 client_id'))
    .option(
      '--client-secret',
      uiText(
        'Read IdP client secret from MCP_XAA_IDP_CLIENT_SECRET env var',
        '从 MCP_XAA_IDP_CLIENT_SECRET 环境变量读取 IdP client secret',
      ),
    )
    .option(
      '--callback-port <port>',
      uiText(
        'Fixed loopback callback port (only if IdP does not honor RFC 8252 port-any matching)',
        '固定回调端口（仅在 IdP 不支持 RFC 8252 任意端口匹配时使用）',
      ),
    )
    .action(options => {
      // Validate everything BEFORE any writes. An exit(1) mid-write leaves
      // settings configured but keychain missing — confusing state.
      // updateSettingsForSource doesn't schema-check on write; a non-URL
      // issuer lands on disk and then poisons the whole userSettings source
      // on next launch (SettingsSchema .url() fails → parseSettingsFile
      // returns { settings: null }, dropping everything, not just xaaIdp).
      let issuerUrl: URL
      try {
        issuerUrl = new URL(options.issuer)
      } catch {
        return cliError(
          uiText(
            `Error: --issuer must be a valid URL (got "${options.issuer}")`,
            `错误：--issuer 必须是有效 URL（当前为 "${options.issuer}"）`,
          ),
        )
      }
      // OIDC discovery + token exchange run against this host. Allow http://
      // only for loopback (conformance harness mock IdP); anything else leaks
      // the client secret and authorization code over plaintext.
      if (
        issuerUrl.protocol !== 'https:' &&
        !(
          issuerUrl.protocol === 'http:' &&
          (issuerUrl.hostname === 'localhost' ||
            issuerUrl.hostname === '127.0.0.1' ||
            issuerUrl.hostname === '[::1]')
        )
      ) {
        return cliError(
          uiText(
            `Error: --issuer must use https:// (got "${issuerUrl.protocol}//${issuerUrl.host}")`,
            `错误：--issuer 必须使用 https://（当前为 "${issuerUrl.protocol}//${issuerUrl.host}"）`,
          ),
        )
      }
      const callbackPort = options.callbackPort
        ? parseInt(options.callbackPort, 10)
        : undefined
      // callbackPort <= 0 fails Zod's .positive() on next launch — same
      // settings-poisoning failure mode as the issuer check above.
      if (
        callbackPort !== undefined &&
        (!Number.isInteger(callbackPort) || callbackPort <= 0)
      ) {
        return cliError(
          uiText(
            'Error: --callback-port must be a positive integer',
            '错误：--callback-port 必须是正整数',
          ),
        )
      }
      const secret = options.clientSecret
        ? process.env.MCP_XAA_IDP_CLIENT_SECRET
        : undefined
      if (options.clientSecret && !secret) {
        return cliError(
          uiText(
            'Error: --client-secret requires MCP_XAA_IDP_CLIENT_SECRET env var',
            '错误：--client-secret 需要设置 MCP_XAA_IDP_CLIENT_SECRET 环境变量',
          ),
        )
      }

      // Read old config now (before settings overwrite) so we can clear stale
      // keychain slots after a successful write. `clear` can't do this after
      // the fact — it reads the *current* settings.xaaIdp, which by then is
      // the new one.
      const old = getXaaIdpSettings()
      const oldIssuer = old?.issuer
      const oldClientId = old?.clientId

      // callbackPort MUST be present (even as undefined) — mergeWith deep-merges
      // and only deletes on explicit `undefined`, not on absent key. A conditional
      // spread would leak a prior fixed port into a new IdP's config.
      const { error } = updateSettingsForSource('userSettings', {
        xaaIdp: {
          issuer: options.issuer,
          clientId: options.clientId,
          callbackPort,
        },
      })
      if (error) {
        return cliError(
          uiText(
            `Error writing settings: ${error.message}`,
            `写入设置失败：${error.message}`,
          ),
        )
      }

      // Clear stale keychain slots only after settings write succeeded —
      // otherwise a write failure leaves settings pointing at oldIssuer with
      // its secret already gone. Compare via issuerKey(): trailing-slash or
      // host-case differences normalize to the same keychain slot.
      if (oldIssuer) {
        if (issuerKey(oldIssuer) !== issuerKey(options.issuer)) {
          clearIdpIdToken(oldIssuer)
          clearIdpClientSecret(oldIssuer)
        } else if (oldClientId !== options.clientId) {
          // Same issuer slot but different OAuth client registration — the
          // cached id_token's aud claim and the stored secret are both for the
          // old client. `xaa login` would send {new clientId, old secret} and
          // fail with opaque `invalid_client`; downstream SEP-990 exchange
          // would fail aud validation. Keep both when clientId is unchanged:
          // re-setup without --client-secret means "tweak port, keep secret".
          clearIdpIdToken(oldIssuer)
          clearIdpClientSecret(oldIssuer)
        }
      }

      if (secret) {
        const { success, warning } = saveIdpClientSecret(options.issuer, secret)
        if (!success) {
          return cliError(
            uiText(
              `Error: settings written but keychain save failed${warning ? ` — ${warning}` : ''}. ` +
                `Re-run with --client-secret once keychain is available.`,
              `错误：设置已写入，但钥匙串保存失败${warning ? ` — ${warning}` : ''}。` +
                `钥匙串可用后，请重新执行并加上 --client-secret。`,
            ),
          )
        }
      }

      cliOk(
        uiText(
          `XAA IdP connection configured for ${options.issuer}`,
          `已配置 XAA IdP 连接：${options.issuer}`,
        ),
      )
    })

  xaaIdp
    .command('login')
    .description(
      uiText(
        'Cache an IdP id_token so XAA-enabled MCP servers authenticate ' +
          'silently. Default: run the OIDC browser login. With --id-token: ' +
          'write a pre-obtained JWT directly (used by conformance/e2e tests ' +
          'where the mock IdP does not serve /authorize).',
        '缓存 IdP id_token，使启用 XAA 的 MCP 服务器可静默认证。默认执行 OIDC 浏览器登录。使用 --id-token 时，直接写入预先获取的 JWT（用于 mock IdP 不提供 /authorize 的一致性/e2e 测试）。',
      ),
    )
    .option(
      '--force',
      uiText(
        'Ignore any cached id_token and re-login (useful after IdP-side revocation)',
        '忽略已缓存 id_token 并重新登录（适用于 IdP 侧撤销后）',
      ),
    )
    // TODO(paulc): read the JWT from stdin instead of argv to keep it out of
    // shell history. Fine for conformance (docker exec uses argv directly,
    // no shell parser), but a real user would want `echo $TOKEN | ... --stdin`.
    .option(
      '--id-token <jwt>',
      uiText(
        'Write this pre-obtained id_token directly to cache, skipping the OIDC browser login',
        '将预先获取的 id_token 直接写入缓存，跳过 OIDC 浏览器登录',
      ),
    )
    .action(async options => {
      const idp = getXaaIdpSettings()
      if (!idp) {
        return cliError(
          uiText(
            "Error: no XAA IdP connection. Run 'claude mcp xaa setup' first.",
            "错误：尚未配置 XAA IdP 连接。请先执行 'claude mcp xaa setup'。",
          ),
        )
      }

      // Direct-inject path: skip cache check, skip OIDC. Writing IS the
      // operation. Issuer comes from settings (single source of truth), not
      // a separate flag — one less thing to desync.
      if (options.idToken) {
        const expiresAt = saveIdpIdTokenFromJwt(idp.issuer, options.idToken)
        return cliOk(
          uiText(
            `id_token cached for ${idp.issuer} (expires ${new Date(expiresAt).toISOString()})`,
            `已为 ${idp.issuer} 缓存 id_token（过期时间 ${new Date(expiresAt).toISOString()}）`,
          ),
        )
      }

      if (options.force) {
        clearIdpIdToken(idp.issuer)
      }

      const wasCached = getCachedIdpIdToken(idp.issuer) !== undefined
      if (wasCached) {
        return cliOk(
          uiText(
            `Already logged in to ${idp.issuer} (cached id_token still valid). Use --force to re-login.`,
            `已登录 ${idp.issuer}（缓存 id_token 仍有效）。如需重新登录请使用 --force。`,
          ),
        )
      }

      process.stdout.write(
        uiText(
          `Opening browser for IdP login at ${idp.issuer}…\n`,
          `正在打开浏览器以登录 IdP：${idp.issuer}…\n`,
        ),
      )
      try {
        await acquireIdpIdToken({
          idpIssuer: idp.issuer,
          idpClientId: idp.clientId,
          idpClientSecret: getIdpClientSecret(idp.issuer),
          callbackPort: idp.callbackPort,
          onAuthorizationUrl: url => {
            process.stdout.write(
              uiText(
                `If the browser did not open, visit:\n  ${url}\n`,
                `如果浏览器未自动打开，请访问：\n  ${url}\n`,
              ),
            )
          },
        })
        cliOk(
          uiText(
            'Logged in. MCP servers with --xaa will now authenticate silently.',
            '登录成功。带 --xaa 的 MCP 服务器现在可静默认证。',
          ),
        )
      } catch (e) {
        cliError(
          uiText(
            `IdP login failed: ${errorMessage(e)}`,
            `IdP 登录失败：${errorMessage(e)}`,
          ),
        )
      }
    })

  xaaIdp
    .command('show')
    .description(uiText('Show the current IdP connection config', '显示当前 IdP 连接配置'))
    .action(() => {
      const idp = getXaaIdpSettings()
      if (!idp) {
        return cliOk(uiText('No XAA IdP connection configured.', '尚未配置 XAA IdP 连接。'))
      }
      const hasSecret = getIdpClientSecret(idp.issuer) !== undefined
      const hasIdToken = getCachedIdpIdToken(idp.issuer) !== undefined
      process.stdout.write(`${uiText('Issuer', '发行者')}:        ${idp.issuer}\n`)
      process.stdout.write(`${uiText('Client ID', '客户端 ID')}:     ${idp.clientId}\n`)
      if (idp.callbackPort !== undefined) {
        process.stdout.write(`${uiText('Callback port', '回调端口')}: ${idp.callbackPort}\n`)
      }
      process.stdout.write(
        uiText(
          `Client secret: ${hasSecret ? '(stored in keychain)' : '(not set — PKCE-only)'}\n`,
          `客户端密钥：${hasSecret ? '（已存入钥匙串）' : '（未设置，仅 PKCE）'}\n`,
        ),
      )
      process.stdout.write(
        uiText(
          `Logged in:     ${hasIdToken ? 'yes (id_token cached)' : "no — run 'claude mcp xaa login'"}\n`,
          `登录状态：     ${hasIdToken ? '是（已缓存 id_token）' : "否 —— 请执行 'claude mcp xaa login'"}\n`,
        ),
      )
      cliOk()
    })

  xaaIdp
    .command('clear')
    .description(uiText('Clear the IdP connection config and cached id_token', '清除 IdP 连接配置和已缓存 id_token'))
    .action(() => {
      // Read issuer first so we can clear the right keychain slots.
      const idp = getXaaIdpSettings()
      // updateSettingsForSource uses mergeWith: set to undefined (not delete)
      // to signal key removal.
      const { error } = updateSettingsForSource('userSettings', {
        xaaIdp: undefined,
      })
      if (error) {
        return cliError(
          uiText(
            `Error writing settings: ${error.message}`,
            `写入设置失败：${error.message}`,
          ),
        )
      }
      // Clear keychain only after settings write succeeded — otherwise a
      // write failure leaves settings pointing at the IdP with its secrets
      // already gone (same pattern as `setup`'s old-issuer cleanup).
      if (idp) {
        clearIdpIdToken(idp.issuer)
        clearIdpClientSecret(idp.issuer)
      }
      cliOk(uiText('XAA IdP connection cleared', '已清除 XAA IdP 连接'))
    })
}
