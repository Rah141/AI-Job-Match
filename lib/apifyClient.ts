/**
 * Apify Key-Value Store Client
 * 
 * This module provides utilities to read configuration and state from Apify key-value stores.
 * Scrapers can use this to fetch configuration before running, enabling dynamic configuration
 * without code changes.
 */

export interface ApifyRecordOptions {
    storeId: string
    recordKey: string
}

export interface ScraperConfig {
    [key: string]: unknown
}

/**
 * Get a record from an Apify key-value store.
 * 
 * @param options - Object containing storeId and recordKey
 * @returns The record data (parsed JSON if content-type is JSON, otherwise raw text)
 * @throws Error if APIFY_API_TOKEN is missing or if the request fails
 * 
 * @example
 * ```typescript
 * const config = await getApifyRecord({
 *   storeId: 'abc123',
 *   recordKey: 'my-config'
 * })
 * ```
 */
export async function getApifyRecord<T = unknown>(
    options: ApifyRecordOptions
): Promise<T | string> {
    const { storeId, recordKey } = options

    // Fail fast if API token is missing
    const apiToken = process.env.APIFY_API_TOKEN
    if (!apiToken) {
        const errorMsg = "APIFY_API_TOKEN environment variable is required but not set"
        console.error(`❌ ${errorMsg}`)
        throw new Error(errorMsg)
    }

    const url = `https://api.apify.com/v2/key-value-stores/${storeId}/records/${recordKey}`

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Accept-Encoding": "gzip, deflate, br", // Support automatic decompression
                "Accept": "application/json, text/plain, */*",
            },
        })

        // Handle 404 gracefully (record not found)
        if (response.status === 404) {
            console.warn(`⚠️  Apify record not found: ${storeId}/${recordKey}`)
            throw new ApifyRecordNotFoundError(`Record not found: ${storeId}/${recordKey}`)
        }

        // Handle other non-2xx responses
        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error")
            const errorMsg = `Apify API error (${response.status}): ${errorText.substring(0, 200)}`
            console.error(`❌ ${errorMsg}`)
            throw new Error(errorMsg)
        }

        // Check content-type to determine if we should parse as JSON
        const contentType = response.headers.get("content-type") || ""
        const isJson = contentType.includes("application/json")

        if (isJson) {
            try {
                const jsonData = await response.json()
                return jsonData as T
            } catch (parseError) {
                console.warn(`⚠️  Failed to parse JSON response from Apify: ${parseError}`)
                // Fallback to text if JSON parsing fails
                const textData = await response.text()
                return textData
            }
        } else {
            // Return raw text/body for non-JSON responses
            const textData = await response.text()
            return textData
        }
    } catch (error) {
        // Re-throw known errors
        if (error instanceof ApifyRecordNotFoundError || error instanceof Error) {
            throw error
        }
        // Handle network errors and other unexpected errors
        const errorMsg = `Failed to fetch Apify record: ${error instanceof Error ? error.message : String(error)}`
        console.error(`❌ ${errorMsg}`)
        throw new Error(errorMsg)
    }
}

/**
 * Custom error class for when a record is not found (404)
 */
export class ApifyRecordNotFoundError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ApifyRecordNotFoundError"
    }
}

/**
 * Get scraper configuration from Apify key-value store.
 * 
 * This is a convenience wrapper that uses a configurable store ID and
 * derives the record key from the scraper name.
 * 
 * @param scraperName - Name of the scraper (e.g., 'job-scraper')
 * @returns The scraper configuration object, or null if not found
 * 
 * @example
 * ```typescript
 * const config = await getScraperConfig('job-scraper')
 * if (config) {
 *   console.log('Using config from Apify:', config)
 * }
 * ```
 */
export async function getScraperConfig(
    scraperName: string
): Promise<ScraperConfig | null> {
    const storeId = process.env.APIFY_KV_STORE_ID

    if (!storeId) {
        console.warn(
            "⚠️  APIFY_KV_STORE_ID not set. Skipping Apify config fetch. " +
            "Set APIFY_KV_STORE_ID in your environment to enable Apify config."
        )
        return null
    }

    const recordKey = `${scraperName}-config`

    try {
        const config = await getApifyRecord<ScraperConfig>({
            storeId,
            recordKey,
        })

        if (typeof config === "string") {
            // If we got a string, try to parse it as JSON
            try {
                return JSON.parse(config) as ScraperConfig
            } catch {
                console.warn(`⚠️  Apify config for ${scraperName} is not valid JSON`)
                return null
            }
        }

        return config as ScraperConfig
    } catch (error) {
        // Handle 404 gracefully - config not found is not a fatal error
        if (error instanceof ApifyRecordNotFoundError) {
            console.log(`ℹ️  No Apify config found for scraper: ${scraperName}. Using defaults.`)
            return null
        }
        // For other errors, log but don't throw - allow scraper to continue with defaults
        console.warn(
            `⚠️  Failed to fetch Apify config for ${scraperName}: ${error instanceof Error ? error.message : String(error)}. ` +
            "Continuing with default configuration."
        )
        return null
    }
}

