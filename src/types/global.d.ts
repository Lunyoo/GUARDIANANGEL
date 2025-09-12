// Global type definitions

declare global {
  interface Window {
    spark?: any
  }

  // Spark LLM mock for compatibility
  const spark: {
    llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
    llm: (prompt: string, model?: string, structured?: boolean) => Promise<any>
  }

  // Node.js Buffer for browser compatibility
  const Buffer: {
    from: (str: string) => Buffer
  }
}

// Mock implementations for compatibility
if (typeof window !== 'undefined') {
  window.spark = {
    llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => {
      return strings.reduce((result, string, i) => {
        return result + string + (values[i] || '')
      }, '')
    },
    llm: async (prompt: string, model?: string, structured?: boolean) => {
      console.warn('LLM call attempted but not implemented:', { prompt, model, structured })
      return { error: 'LLM not available in browser' }
    }
  }

  // Mock Buffer for browser
  ;(globalThis as any).Buffer = {
    from: (str: string) => ({ toString: () => str })
  }
}

export {}
