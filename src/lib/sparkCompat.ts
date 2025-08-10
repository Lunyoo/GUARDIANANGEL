// Minimal Spark compatibility layer for browser runtime
// Provides: spark.kv (localStorage-backed), spark.llmPrompt (template tag), spark.llm (noop JSON)

export type KV = {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
}

const kv: KV = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch {
      // ignore quota or serialization errors silently
    }
  }
}

function llmPrompt(strings: TemplateStringsArray, ...expr: any[]): string {
  let out = ''
  for (let i = 0; i < strings.length; i++) {
    out += strings[i]
    if (i < expr.length) {
      const v = expr[i]
      out += typeof v === 'object' ? JSON.stringify(v) : String(v)
    }
  }
  return out
}

async function llm(prompt: string, model?: string, jsonOnly?: boolean): Promise<string> {
  try {
    const base = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001'
    const resp = await fetch(`${base}/api/public/openai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, json: !!jsonOnly })
    })
    if (!resp.ok) {
      const t = await resp.text()
      throw new Error(`OpenAI proxy error: ${t}`)
    }
    const data = await resp.json()
    return data?.content || ''
  } catch (e) {
    // Hard fail per request to remove simulations
    throw e
  }
}

export const spark = { kv, llmPrompt, llm }
