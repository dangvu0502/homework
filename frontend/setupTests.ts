import '@testing-library/jest-dom'

// Polyfill URL.createObjectURL / revokeObjectURL for jsdom tests
if (!('createObjectURL' in URL)) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  URL.createObjectURL = () => 'blob:mock-url'
}

if (!('revokeObjectURL' in URL)) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  URL.revokeObjectURL = () => {}
}
