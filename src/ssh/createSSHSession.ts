// Auto-generated stub — missing from source snapshot

export type SSHSession = any

export class SSHSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSHSessionError'
  }
}

export async function createSSHSession(..._args: any[]): Promise<any> {
  return { remoteCwd: '' as any } as any
}

export function createLocalSSHSession(..._args: any[]): any {
  return { remoteCwd: '' as any } as any
}
