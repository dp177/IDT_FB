export function generateTokenNo() {
  return `TK-${Math.floor(100000 + Math.random() * 900000)}`
}
