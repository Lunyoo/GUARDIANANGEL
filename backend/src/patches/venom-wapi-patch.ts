// @ts-nocheck
/**
 * Aggressive WAPI Error Suppression Patch
 * This patches venom-bot at runtime to prevent WAPI errors completely
 */

export function patchVenomWAPI() {
  // Patch puppeteer evaluate to suppress WAPI errors
  const originalModuleRequire = require

  require = function patchedRequire(id: string) {
    const module = originalModuleRequire.call(this, id)
    
    // Patch puppeteer-core if loaded
    if (id.includes('puppeteer-core') || id.includes('ExecutionContext')) {
      if (module && module.prototype && module.prototype.evaluate) {
        const originalEvaluate = module.prototype.evaluate
        module.prototype.evaluate = async function(...args: any[]) {
          try {
            const result = await originalEvaluate.apply(this, args)
            return result
          } catch (error: any) {
            // Suppress WAPI-related errors completely
            if (error && error.message && 
                (error.message.includes('getMaybeMeUser') ||
                 error.message.includes('WAPI') ||
                 error.message.includes('sendExist') ||
                 error.message.includes('getHost'))) {
              return null // Return null instead of throwing
            }
            throw error
          }
        }
      }
    }
    
    // Patch venom-bot sender layer
    if (id.includes('sender.layer') || id.includes('venom-bot')) {
      if (module && typeof module === 'object') {
        // Wrap any function that might cause WAPI errors
        Object.keys(module).forEach(key => {
          if (typeof module[key] === 'function') {
            const originalFunc = module[key]
            module[key] = async function(...args: any[]) {
              try {
                return await originalFunc.apply(this, args)
              } catch (error: any) {
                if (error && error.message &&
                    (error.message.includes('getMaybeMeUser') ||
                     error.message.includes('WAPI') ||
                     error.message.includes('sendExist'))) {
                  return null // Suppress and return null
                }
                throw error
              }
            }
          }
        })
      }
    }
    
    return module
  } as any
}

// Runtime error interception
export function interceptRuntimeErrors() {
  // Override global promise rejection handling
  const originalAddEventListener = globalThis.addEventListener
  if (originalAddEventListener) {
    globalThis.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === 'unhandledrejection') {
        const wrappedListener = function(event: any) {
          const reason = event.reason
          if (reason && typeof reason === 'object' && reason.message &&
              (reason.message.includes('getMaybeMeUser') ||
               reason.message.includes('WAPI') ||
               reason.message.includes('sendExist') ||
               reason.message.includes('getHost'))) {
            event.preventDefault()
            event.stopPropagation()
            return false
          }
          return listener.call(this, event)
        }
        return originalAddEventListener.call(this, type, wrappedListener, options)
      }
      return originalAddEventListener.call(this, type, listener, options)
    }
  }
}
