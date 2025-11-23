/**
 * Utility functions for production-ready code
 */

/**
 * Sanitize error messages to prevent leaking sensitive information
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    let message = error.message
    
    // Mask API keys
    message = message.replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-***")
    message = message.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, "***")
    
    // Mask email addresses in error messages
    message = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "***@***")
    
    return message
  }
  
  return "Unknown error"
}

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    retryable?: (error: unknown) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    retryable = (error: unknown) => {
      // Retry on network errors and rate limits
      if (error && typeof error === "object" && "status" in error) {
        const status = (error as { status: number }).status
        return status === 429 || status >= 500
      }
      return true
    },
  } = options

  let lastError: unknown
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !retryable(error)) {
        throw error
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * 2, maxDelay)
    }
  }

  throw lastError
}

/**
 * Timeout wrapper for async functions
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "Operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ])
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
}

/**
 * Validate file type
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.includes("*")) {
      const extension = type.split(".").pop()
      return file.name.toLowerCase().endsWith(`.${extension}`)
    }
    return file.type === type
  })
}

