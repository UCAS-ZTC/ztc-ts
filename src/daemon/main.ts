export async function main() {
  console.error('Daemon mode is not available in this local build.')
  process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
