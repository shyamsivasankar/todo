import { webcrypto } from 'node:crypto'

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto
}

if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = (buffer) => {
    return webcrypto.getRandomValues(buffer)
  }
}
