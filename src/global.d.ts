declare const MACRO: {
  VERSION: string
  VERSION_CHANGELOG: string
  PACKAGE_URL: string
  NATIVE_PACKAGE_URL: string
}

declare module '*.md' {
  const content: string
  export default content
}
