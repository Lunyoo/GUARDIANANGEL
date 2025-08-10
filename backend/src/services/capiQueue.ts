import { Queue, Worker, JobsOptions, Job } from 'bullmq'
import IORedis from 'ioredis'
import logger from '../config/logger.js'
import { processSingleSalesEvent } from './attributionForwarder.js'

let queue: Queue | null = null
let workerStarted = false

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
  })
  workerStarted = true
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
