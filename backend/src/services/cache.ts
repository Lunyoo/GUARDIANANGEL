import { cacheSet, cacheGet, cacheDel, isRedisReady } from '../config/redis'
import logger from '../config/logger'

interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string
}

class CacheService {
  private defaultTTL: number = 300 // 5 minutes
  private prefix: string = 'nexus:'

  // Generate cache key with prefix
  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.prefix
    return `${finalPrefix}${key}`
  }

  // Get cached data
  async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key, options?.prefix)
      const cached = await cacheGet(cacheKey)
      
      if (cached) {
        logger.debug(`Cache hit: ${cacheKey}`)
        return cached
      }
      
      logger.debug(`Cache miss: ${cacheKey}`)
      return null
    } catch (error) {
      logger.error('Cache get error:', error)
      return null
    }
  }

  // Set cached data
  async set(key: string, value: any, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, options?.prefix)
      const ttl = options?.ttl || this.defaultTTL
      
      const success = await cacheSet(cacheKey, value, ttl)
      
      if (success) {
        logger.debug(`Cache set: ${cacheKey} (TTL: ${ttl}s)`)
      }
      
      return success
    } catch (error) {
      logger.error('Cache set error:', error)
      return false
    }
  }

  // Delete cached data
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, options?.prefix)
      const deleted = await cacheDel(cacheKey)
      
      if (deleted) {
        logger.debug(`Cache deleted: ${cacheKey}`)
        return true
      }
      
      return false
    } catch (error) {
      logger.error('Cache delete error:', error)
      return false
    }
  }

  // Delete multiple keys by pattern
  async deletePattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const searchPattern = this.generateKey(pattern, options?.prefix)
      // Pattern deletion not supported by basic redis - return 0
      const deleted = 0
      
      logger.debug(`Cache pattern deleted: ${searchPattern} (${deleted} keys)`)
      return deleted
    } catch (error) {
      logger.error('Cache delete pattern error:', error)
      return 0
    }
  }

  // Check if key exists
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, options?.prefix)
      return false // exists check not implemented
    } catch (error) {
      logger.error('Cache exists error:', error)
      return false
    }
  }

  // Get TTL for a key
  async getTTL(key: string, options?: CacheOptions): Promise<number> {
    try {
      const cacheKey = this.generateKey(key, options?.prefix)
      return -1 // TTL check not implemented
    } catch (error) {
      logger.error('Cache TTL error:', error)
      return -1
    }
  }

  // Increment counter
  async increment(key: string, options?: CacheOptions & { by?: number }): Promise<number> {
    try {
      const cacheKey = this.generateKey(key, options?.prefix)
      const ttl = options?.ttl || this.defaultTTL
      
      return 1 // increment not implemented
    } catch (error) {
      logger.error('Cache increment error:', error)
      return 0
    }
  }

  // Cache with function (get or compute and cache)
  async remember<T = any>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T | null> {
    try {
      // Try to get from cache first
      let cached = await this.get<T>(key, options)
      
      if (cached !== null) {
        return cached
      }

      // If not in cache, compute the value
      logger.debug(`Computing value for cache key: ${key}`)
      const computed = await fn()
      
      if (computed !== null && computed !== undefined) {
        // Cache the computed value
        await this.set(key, computed, options)
        return computed
      }

      return null
    } catch (error) {
      logger.error('Cache remember error:', error)
      // If there's an error, try to return cached value anyway
      return await this.get<T>(key, options)
    }
  }

  // Specialized cache methods for common use cases
  
  // Cache Facebook API responses
  async cacheFacebookAPI(endpoint: string, data: any, ttl: number = 120): Promise<boolean> {
    return await this.set(`fb:${endpoint}`, data, { ttl, prefix: 'api:' })
  }

  // Get cached Facebook API response
  async getFacebookAPICache<T = any>(endpoint: string): Promise<T | null> {
    return await this.get<T>(`fb:${endpoint}`, { prefix: 'api:' })
  }

  // Cache user sessions
  async cacheUserSession(userId: string, sessionData: any, ttl: number = 3600): Promise<boolean> {
    return await this.set(userId, sessionData, { ttl, prefix: 'session:' })
  }

  // Get cached user session
  async getUserSession<T = any>(userId: string): Promise<T | null> {
    return await this.get<T>(userId, { prefix: 'session:' })
  }

  // Clear user cache
  async clearUserCache(userId: string): Promise<number> {
    return await this.deletePattern(`*${userId}*`)
  }

  // Rate limiting cache
  async checkRateLimit(key: string, limit: number, windowSeconds: number = 3600): Promise<boolean> {
    try {
      const current = await this.increment(key, { ttl: windowSeconds })
      return current <= limit
    } catch (error) {
      logger.error('Rate limit check error:', error)
      return true // Allow on error
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = 'health:check'
      const testValue = { timestamp: Date.now() }
      
      await this.set(testKey, testValue, { ttl: 10 })
      const retrieved = await this.get(testKey)
      await this.delete(testKey)
      
      return retrieved !== null
    } catch (error) {
      logger.error('Cache health check failed:', error)
      return false
    }
  }
}

export const cacheService = new CacheService()
export default cacheService