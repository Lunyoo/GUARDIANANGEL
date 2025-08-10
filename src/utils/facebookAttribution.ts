export function getCookie(name: string): string | undefined {
  try {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()!.split(';').shift()
    return undefined
  } catch {
    return undefined
  }
}

export function getFBP(): string | undefined {
  return getCookie('_fbp')
}

export function getFBC(): string | undefined {
  // _fbc is set by FB Pixel on ad click landing; if absent, try parsing from URL fbclid
  const fromCookie = getCookie('_fbc')
  if (fromCookie) return fromCookie
  try {
    const url = new URL(window.location.href)
    const fbclid = url.searchParams.get('fbclid')
    if (fbclid) {
      // Emulate FBC format: fb.1.<timestamp>.<fbclid>
      return `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`
    }
  } catch {}
  return undefined
}

export function ensureUTMs(url: string, utm: Partial<Record<string, string>>): string {
  try {
    const u = new URL(url)
    Object.entries(utm).forEach(([k, v]) => {
      if (!v) return
      if (!u.searchParams.get(k)) u.searchParams.set(k, v)
    })
    return u.toString()
  } catch {
    return url
  }
}

export function newEventId(prefix = 'evt'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
