function toBase64(bytes) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function encodeAccessBundle(bundle) {
  const json = JSON.stringify(bundle)
  return toBase64(new TextEncoder().encode(json))
}

export function decodeAccessBundle(encodedBundle) {
  const decoded = new TextDecoder().decode(fromBase64(encodedBundle))
  return JSON.parse(decoded)
}
