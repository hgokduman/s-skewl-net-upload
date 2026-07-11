const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateId(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const byte of bytes) {
    id += ALPHABET[byte % ALPHABET.length];
  }
  return id;
}
