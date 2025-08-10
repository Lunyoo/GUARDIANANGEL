// Utility functions for safe property access
// Helps prevent "Cannot read properties of undefined" errors

export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  const keys = path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue
    }
    current = current[key]
  }
  
  return current !== undefined ? current : defaultValue
}

export function safeGetNumber(obj: any, path: string, defaultValue = 0): number {
  return safeGet(obj, path, defaultValue)
}

export function safeGetString(obj: any, path: string, defaultValue = ''): string {
  return safeGet(obj, path, defaultValue)
}

export function safeGetArray<T>(obj: any, path: string, defaultValue: T[] = []): T[] {
  return safeGet(obj, path, defaultValue)
}

// For handling ML analysis confidence scores specifically
export function getConfidenceScore(analysis: any, defaultValue = 0): number {
  if (!analysis) return defaultValue
  
  // Support both 'confidence' and 'confianca' properties
  return analysis.confidence ?? analysis.confianca ?? defaultValue
}