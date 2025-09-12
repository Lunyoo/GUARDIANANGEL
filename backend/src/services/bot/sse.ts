/** Simple in-memory SSE broadcaster (restored minimal version) */
import type { Request, Response } from 'express'

interface Client { id: string; res: Response; subscribedAt: number }
const clients: Client[] = []

export function sseHandler(req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  })
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  clients.push({ id, res, subscribedAt: Date.now() })
  res.write(`event: connected\ndata: {"id":"${id}"}\n\n`)
  req.on('close', () => {
    const idx = clients.findIndex(c => c.id === id)
    if (idx >= 0) clients.splice(idx, 1)
  })
}

export function broadcast(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const c of clients) {
    try { c.res.write(payload) } catch {}
  }
}

export function getClientCount(){ return clients.length }
