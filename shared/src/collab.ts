// shared/src/collab.ts — helpers shared by client + server so they agree.

const PALETTE = [
  '#39ff14', // phosphor green
  '#ffb347', // amber
  '#9b59ff', // UV purple
  '#00e5ff', // cyan
  '#ff6b6b', // coral
  '#ffd23f', // yellow
  '#7afcff', // ice
  '#ff5e3a', // orange
]

/** Deterministic color for a user — same on every peer. */
export function colorForUser(userId: string): string {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars

/** Short room code like "TRM-4F9". `rand` defaults to Math.random. */
export function generateRoomCode(rand: () => number = Math.random): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)]).join('')
  return `${pick(3)}-${pick(3)}`
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '')
}
