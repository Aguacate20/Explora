// lib/auth.js
// Utilidades de autenticación segura.
// Usa Web Crypto API (disponible en Node 18+, sin dependencias extra).

// Genera un salt aleatorio
export function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Hashea una contraseña con su salt
export async function hashPassword(password, salt) {
  const data   = new TextEncoder().encode(password + salt);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Verifica una contraseña contra su hash almacenado
export async function verifyPassword(password, salt, storedHash) {
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
}
