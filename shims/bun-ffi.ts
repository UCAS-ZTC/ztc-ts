export const dlopen = () => {
  throw new Error('bun:ffi is not available in this build')
}
export const ptr = () => null
export const CString = null
export const FFIType = {}
export default { dlopen, ptr, CString, FFIType }
