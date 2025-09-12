import { Queue, Worker, JobsOptions, Job } from 'bullmq'
import IORedis from 'ioredis'
import logger from '../config/logger.js'
import { processSingleSalesEvent } from './attributionForwarder.js'

let queue: Queue | null = null
let workerStarted = false
let workerRef: Worker | null = null

async function isWritableMaster(conn: IORedis): Promise<boolean> {
  try {
    // Prefer ROLE command (works on standalone and cluster nodes)
    const roleRes = await (conn as any).role().catch(() => null)
    if (Array.isArray(roleRes)) {
      const role = String(roleRes[0] || '').toLowerCase()
      return role === 'master'
    }
  } catch {}
  try {
    const info = await conn.info('replication')
    if (typeof info === 'string') {
      const m = /role:(\w+)/i.exec(info)
      if (m) return m[1].toLowerCase() === 'master'
    }
  } catch {}
  // If we can't determine, assume not writable to be safe
  return false
}

function isReplicaError(err: any): boolean {
  const msg = (err?.message || String(err || '')).toLowerCase()
  return (
    msg.includes('readonly') ||
    msg.includes('read only') ||
    msg.includes('master -> replica') ||
    msg.includes('replica') ||
    msg.includes('slave') ||
    msg.includes('unblocked') // "UNBLOCKED force unblock from blocking operation, instance state changed"
  )
}

async function shutdownQueue(reason: string) {
  try {
    if (workerRef) {
      await workerRef.close()
      workerRef = null
    }
  } catch {}
  try {
    if (queue) {
      // @ts-ignore
      const qConn: IORedis | undefined = (queue as any)?.opts?.connection
      await queue.close().catch(() => {})
      queue = null
      if (qConn) await qConn.quit().catch(() => {})
    }
  } catch {}
  workerStarted = false
  logger.warn(`CAPI Queue disabled: ${reason}`)
}

export function isQueueEnabled() {
  return !!queue
}

export async function initCapiQueue() {
  if (queue) return queue
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })
    // basic ping to validate
    await connection.ping()
    // Ensure we're on a writable master; if not, disable queue to avoid READONLY errors
    const writable = await isWritableMaster(connection)
    if (!writable) {
      logger.warn('Redis is in replica/read-only mode. Disabling BullMQ CAPI queue to avoid errors.')
      await connection.quit().catch(() => {})
      queue = null
      return null
    }
    queue = new Queue('capi-events', { connection })
    logger.info('CAPI Queue initialized (BullMQ)')
    return queue
  } catch (e: any) {
    logger.warn('CAPI Queue not initialized (Redis unavailable): ' + (e?.message || e))
    queue = null
    return null
  }
}

export async function startCapiWorkers() {
  if (workerStarted) return
  const q = await initCapiQueue()
  if (!q) return
  const connection = (q as any).opts?.connection as IORedis
  // Guard against replica state changes at runtime
  connection.on('error', async (err: any) => {
    if (isReplicaError(err)) {
      await shutdownQueue('Redis switched to replica/read-only mode')
    }
  })
  connection.on('end', async () => {
    // Connection dropped; worker will error soon. Let bullmq handle reconnect,
    // but if it reconnects to a replica we'll catch it via error above.
  })

  const worker = new Worker(
    'capi-events',
    async (job: Job) => {
      const { eventId } = job.data || {}
      if (!eventId) throw new Error('eventId missing')
      const result = await processSingleSalesEvent(eventId)
      return result
    },
    {
      connection,
      concurrency: 5
    }
  )
  worker.on('completed', (job: Job) => {
    logger.info(`CAPI job completed id=${job.id}`)
  })
  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`CAPI job failed id=${job?.id}: ${err?.message}`)
    if (isReplicaError(err)) {
      // Stop workers to prevent log spam in replica mode
      shutdownQueue('Worker encountered replica/READONLY error').catch(() => {})
    }
  })
  worker.on('error', (err: Error) => {
    if (isReplicaError(err)) {
      shutdownQueue('BullMQ worker error (replica/READONLY)').catch(() => {})
    }
  })
  workerStarted = true
  workerRef = worker
  logger.info('CAPI Worker started (BullMQ)')
}

export async function enqueueSalesEventRetry(eventId: string, opts?: JobsOptions) {
  const q = await initCapiQueue()
  if (!q) return { enqueued: false, reason: 'queue_unavailable' }
  await q.add(
    'retry-event',
    { eventId },
    {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: false,
      ...opts
    }
  )
  return { enqueued: true }
}

export async function getFailedJobs(limit = 50, offset = 0) {
  const q = await initCapiQueue()
  if (!q) return { enabled: false, jobs: [] as any[], total: 0, limit, offset }
  const start = Math.max(0, offset)
  const end = Math.max(start, start + limit - 1)
  const jobs = await q.getJobs(['failed'], start, end, true)
  // total failed count
  let total = 0
  try {
    const counts = await q.getJobCounts('failed') as any
    total = counts?.failed || 0
  } catch {}
  return {
    enabled: true,
    total,
    limit,
    offset,
    jobs: jobs.map(j => ({
      id: j.id,
      name: j.name,
      attemptsMade: j.attemptsMade,
      failedReason: (j as any).failedReason || '',
      data: j.data
    }))
  }
}

export async function retryFailedJob(jobId: string) {
  const q = await initCapiQueue()
  if (!q) return { ok: false, error: 'queue_unavailable' }
  const job = await q.getJob(jobId)
  if (!job) return { ok: false, error: 'job_not_found' }
  try {
    if (typeof (job as any).retry === 'function') {
      await (job as any).retry()
      return { ok: true, retried: true }
    } else {
      // fallback: re-add with same payload
      await q.add(job.name || 'retry-event', job.data, { attempts: 5, backoff: { type: 'exponential', delay: 1000 } })
      return { ok: true, enqueued: true }
    }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function removeJob(jobId: string) {
  const q = await initCapiQueue()
  if (!q) return { ok: false, error: 'queue_unavailable' }
  const job = await q.getJob(jobId)
  if (!job) return { ok: false, error: 'job_not_found' }
  try {
    await job.remove()
    return { ok: true, removed: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function retryAllFailedJobs(limit = 200) {
  const q = await initCapiQueue()
  if (!q) return { ok: false, error: 'queue_unavailable' }
  const end = Math.max(0, limit - 1)
  const jobs = await q.getJobs(['failed'], 0, end, true)
  let attempted = 0
  let retried = 0
  let readded = 0
  const errors: Array<{ id: string | null; error: string }> = []
  for (const j of jobs) {
    attempted++
    try {
      if (typeof (j as any).retry === 'function') {
        await (j as any).retry()
        retried++
      } else {
        await q.add(j.name || 'retry-event', j.data, { attempts: 5, backoff: { type: 'exponential', delay: 1000 } })
        readded++
      }
    } catch (e: any) {
      errors.push({ id: j.id as any, error: e?.message || String(e) })
    }
  }
  return { ok: true, attempted, retried, readded, errors }
}

export async function getQueueCounts() {
  const q = await initCapiQueue()
  if (!q) return { enabled: false }
  try {
    const counts = await q.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'completed',
      'failed',
      'paused',
      'waiting-children'
    )
    return { enabled: true, counts }
  } catch (e: any) {
    return { enabled: true, error: e?.message || String(e) }
  }
}

export async function findEventInQueue(eventId: string, scanLimit = 1000) {
  const q = await initCapiQueue()
  if (!q) return { enabled: false, found: false, presentIn: [] as string[], jobs: [] as any[] }
  const limit = Math.max(1, Math.min(5000, scanLimit))
  // Scan across relevant states
  const jobs = await q.getJobs(['waiting', 'active', 'delayed', 'failed'], 0, limit - 1, true)
  const matches = [] as Job[]
  for (const j of jobs) {
    if ((j as any)?.data?.eventId === eventId) {
      matches.push(j)
    }
  }
  const presentInSet = new Set<string>()
  const outJobs: Array<{ id: string | number | null; name: string | undefined; state: string; attemptsMade: number; failedReason?: string; data: any }> = []
  for (const j of matches) {
    let state = 'unknown'
    try {
      state = await j.getState()
    } catch {}
    presentInSet.add(state)
    outJobs.push({
      id: j.id as any,
      name: j.name,
      state,
      attemptsMade: j.attemptsMade,
      failedReason: (j as any).failedReason,
      data: j.data
    })
  }
  return {
    enabled: true,
    found: matches.length > 0,
    presentIn: Array.from(presentInSet),
    jobs: outJobs
  }
}
