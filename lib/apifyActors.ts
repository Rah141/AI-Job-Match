/**
 * Apify Actors Client
 * 
 * This module provides utilities to interact with Apify actors,
 * fetch jobs from actor runs, and sync them to the database.
 */

export interface ApifyActorRun {
    id: string
    status: string
    startedAt: string
    finishedAt?: string
    defaultDatasetId?: string
    defaultKeyValueStoreId?: string
}

export interface ApifyActor {
    id: string
    name: string
    username: string
}

export interface ApifyDatasetItem {
    [key: string]: unknown
}

/**
 * Get Apify API token from environment
 */
function getApiToken(): string {
    const token = process.env.APIFY_API_TOKEN
    if (!token) {
        throw new Error("APIFY_API_TOKEN environment variable is required but not set")
    }
    return token
}

/**
 * Make a request to Apify API
 */
async function apifyRequest<T>(endpoint: string): Promise<T> {
    const token = getApiToken()
    const url = `https://api.apify.com/v2${endpoint}`
    
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
        },
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`Apify API error (${response.status}): ${errorText.substring(0, 200)}`)
    }

    return response.json()
}

/**
 * List all actors for the authenticated user
 */
export async function listActors(): Promise<ApifyActor[]> {
    try {
        const response = await apifyRequest<{ data: { items: ApifyActor[] } }>("/acts")
        return response.data?.items || []
    } catch (error) {
        console.error("Failed to list actors:", error)
        throw error
    }
}

/**
 * Get actor details by ID
 */
export async function getActor(actorId: string): Promise<ApifyActor> {
    try {
        const response = await apifyRequest<{ data: ApifyActor }>(`/acts/${actorId}`)
        return response.data
    } catch (error) {
        console.error(`Failed to get actor ${actorId}:`, error)
        throw error
    }
}

/**
 * List runs for a specific actor
 */
export async function listActorRuns(actorId: string, limit: number = 10): Promise<ApifyActorRun[]> {
    try {
        const response = await apifyRequest<{ data: { items: ApifyActorRun[] } }>(
            `/acts/${actorId}/runs?limit=${limit}&desc=1`
        )
        return response.data?.items || []
    } catch (error) {
        console.error(`Failed to list runs for actor ${actorId}:`, error)
        throw error
    }
}

/**
 * Get the latest successful run for an actor
 */
export async function getLatestSuccessfulRun(actorId: string): Promise<ApifyActorRun | null> {
    try {
        const runs = await listActorRuns(actorId, 20)
        const successfulRun = runs.find(run => run.status === "SUCCEEDED")
        return successfulRun || null
    } catch (error) {
        console.error(`Failed to get latest run for actor ${actorId}:`, error)
        return null
    }
}

/**
 * Get dataset info
 */
export async function getDatasetInfo(datasetId: string): Promise<{ itemCount: number; cleanItemCount: number }> {
    try {
        const response = await apifyRequest<{ data: { itemCount: number; cleanItemCount: number } }>(
            `/datasets/${datasetId}`
        )
        return response.data || { itemCount: 0, cleanItemCount: 0 }
    } catch (error) {
        console.error(`Failed to get dataset info for ${datasetId}:`, error)
        return { itemCount: 0, cleanItemCount: 0 }
    }
}

/**
 * Get items from an Apify dataset
 */
export async function getDatasetItems(datasetId: string, limit: number = 1000, offset: number = 0): Promise<ApifyDatasetItem[]> {
    try {
        // First check dataset info
        const info = await getDatasetInfo(datasetId)
        console.log(`    Dataset has ${info.itemCount} total items, ${info.cleanItemCount} clean items`)
        
        if (info.itemCount === 0) {
            return []
        }

        // Try different API endpoint formats
        const token = getApiToken()
        let items: ApifyDatasetItem[] = []
        
        // Method 1: Try standard API endpoint
        try {
            const url = `https://api.apify.com/v2/datasets/${datasetId}/items?limit=${limit}&offset=${offset}`
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json",
                },
            })
            
            if (response.ok) {
                const text = await response.text()
                try {
                    const parsed = JSON.parse(text)
                    // Handle different response formats:
                    // 1. Direct array: [...]
                    // 2. Object with data.items: { data: { items: [...] } }
                    // 3. Object with items: { items: [...] }
                    if (Array.isArray(parsed)) {
                        items = parsed
                    } else if (parsed.data?.items && Array.isArray(parsed.data.items)) {
                        items = parsed.data.items
                    } else if (parsed.items && Array.isArray(parsed.items)) {
                        items = parsed.items
                    } else if (parsed.data && Array.isArray(parsed.data)) {
                        items = parsed.data
                    }
                } catch (parseError) {
                    console.log(`    Failed to parse response as JSON. Response: ${text.substring(0, 200)}...`)
                }
            } else {
                const errorText = await response.text().catch(() => "")
                console.log(`    API returned ${response.status}: ${errorText.substring(0, 200)}`)
            }
        } catch (error) {
            console.log(`    Standard fetch failed: ${error instanceof Error ? error.message : String(error)}`)
        }
        
        // Method 2: If no items, try without offset
        if (items.length === 0 && offset === 0) {
            try {
                const url = `https://api.apify.com/v2/datasets/${datasetId}/items?limit=${limit}`
                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json",
                    },
                })
                
                if (response.ok) {
                    const data = await response.json() as { data?: { items?: ApifyDatasetItem[] }, items?: ApifyDatasetItem[] }
                    items = data.data?.items || data.items || []
                }
            } catch (error) {
                console.log(`    Alternative fetch also failed`)
            }
        }
        
        console.log(`    Fetched ${items.length} items from dataset`)
        return items
    } catch (error) {
        console.error(`Failed to get dataset items from ${datasetId}:`, error)
        // Return empty array instead of throwing to allow continuation
        return []
    }
}

/**
 * Get a specific record from a key-value store
 */
export async function getKeyValueStoreRecord(storeId: string, recordKey: string): Promise<unknown> {
    try {
        const token = getApiToken()
        const url = `https://api.apify.com/v2/key-value-stores/${storeId}/records/${recordKey}`
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json, text/plain, */*",
            },
        })

        if (response.status === 404) {
            return null
        }

        if (!response.ok) {
            throw new Error(`Failed to get record: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
            return await response.json()
        } else {
            // For non-JSON, return as text (might be binary, but we'll try)
            return await response.text()
        }
    } catch (error) {
        console.error(`Failed to get record ${recordKey} from store ${storeId}:`, error)
        return null
    }
}

/**
 * Get all records from a key-value store (list keys first, then fetch each)
 */
export async function listKeyValueStoreRecords(storeId: string): Promise<Record<string, unknown>> {
    try {
        const token = getApiToken()
        // First, get the list of record keys
        const listUrl = `https://api.apify.com/v2/key-value-stores/${storeId}/keys`
        
        const listResponse = await fetch(listUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json",
            },
        })

        if (!listResponse.ok) {
            throw new Error(`Failed to list keys: ${listResponse.status}`)
        }

        const keysData = await listResponse.json() as { data: { items: Array<{ key: string }> } }
        const keys = keysData.data?.items?.map(item => item.key) || []
        
        console.log(`    Found ${keys.length} record key(s) in store`)

        // Fetch each record individually
        const records: Record<string, unknown> = {}
        for (const key of keys) {
            const record = await getKeyValueStoreRecord(storeId, key)
            if (record !== null) {
                records[key] = record
            }
        }

        return records
    } catch (error) {
        console.error(`Failed to list records from store ${storeId}:`, error)
        // Try common record keys as fallback
        const commonKeys = ["OUTPUT", "results", "jobs", "data", "items", "listings"]
        const records: Record<string, unknown> = {}
        
        for (const key of commonKeys) {
            const record = await getKeyValueStoreRecord(storeId, key)
            if (record !== null && typeof record === "object") {
                records[key] = record
            }
        }
        
        return records
    }
}

/**
 * Fetch jobs from Apify actor runs
 * Tries to find jobs in datasets or key-value stores
 */
export async function fetchJobsFromApifyActors(actorIds?: string[]): Promise<any[]> {
    const jobs: any[] = []
    
    try {
        // If no actor IDs provided, list all actors
        let actors: ApifyActor[] = []
        if (actorIds && actorIds.length > 0) {
            actors = await Promise.all(actorIds.map(id => getActor(id)))
        } else {
            actors = await listActors()
        }

        console.log(`Found ${actors.length} actor(s) to check`)

        for (const actor of actors) {
            try {
                console.log(`\nChecking actor: ${actor.name} (${actor.id})`)
                
                // Get latest successful run
                const latestRun = await getLatestSuccessfulRun(actor.id)
                if (!latestRun) {
                    console.log(`  ⚠️  No successful runs found for ${actor.name}`)
                    continue
                }

                console.log(`  ✅ Found successful run: ${latestRun.id} (finished: ${latestRun.finishedAt || "N/A"})`)

                // Try to get jobs from dataset
                if (latestRun.defaultDatasetId) {
                    console.log(`  📊 Checking dataset: ${latestRun.defaultDatasetId}`)
                    try {
                        // Try to get all items (with pagination if needed)
                        let allItems: ApifyDatasetItem[] = []
                        let offset = 0
                        const pageSize = 1000
                        
                        while (true) {
                            const pageItems = await getDatasetItems(latestRun.defaultDatasetId, pageSize, offset)
                            if (pageItems.length === 0) break
                            
                            allItems.push(...pageItems)
                            offset += pageSize
                            
                            // Limit to first 10000 items to avoid infinite loops
                            if (allItems.length >= 10000 || pageItems.length < pageSize) break
                        }
                        
                        console.log(`  ✅ Found ${allItems.length} items in dataset`)
                        
                        // Try to extract jobs from dataset items
                        // Common patterns: items might be jobs directly, or in a nested structure
                        for (const item of allItems) {
                            // Check if item is a job object
                            if (item && typeof item === "object" && !Array.isArray(item)) {
                                // Check if it looks like a job (has common job fields)
                                const hasJobFields = 
                                    (item as any).title || 
                                    (item as any).jobTitle || 
                                    (item as any).position ||
                                    (item as any).company ||
                                    (item as any).location ||
                                    (item as any).url ||
                                    (item as any).link
                                
                                if (hasJobFields) {
                                    // Looks like a job object
                                    jobs.push(item)
                                } else if ((item as any).jobs && Array.isArray((item as any).jobs)) {
                                    // Jobs might be nested in a 'jobs' property
                                    jobs.push(...(item as any).jobs)
                                } else if ((item as any).data && Array.isArray((item as any).data)) {
                                    // Jobs might be in a 'data' property
                                    jobs.push(...(item as any).data)
                                } else if ((item as any).results && Array.isArray((item as any).results)) {
                                    // Jobs might be in a 'results' property
                                    jobs.push(...(item as any).results)
                                }
                            } else if (Array.isArray(item)) {
                                // If item is an array, it might be a list of jobs
                                jobs.push(...item.filter(i => i && typeof i === "object"))
                            }
                        }
                        
                        if (jobs.length > 0) {
                            console.log(`  ✅ Extracted ${jobs.length} job(s) from dataset`)
                        }
                    } catch (error) {
                        console.log(`  ⚠️  Failed to read dataset: ${error instanceof Error ? error.message : String(error)}`)
                    }
                }

                // Try to get jobs from key-value store
                if (latestRun.defaultKeyValueStoreId) {
                    console.log(`  📦 Checking key-value store: ${latestRun.defaultKeyValueStoreId}`)
                    try {
                        const records = await listKeyValueStoreRecords(latestRun.defaultKeyValueStoreId)
                        console.log(`  ✅ Found ${Object.keys(records).length} records in store`)
                        
                        // Process all records (not just job-named ones, as jobs might be in any key)
                        for (const [key, value] of Object.entries(records)) {
                            if (Array.isArray(value)) {
                                // If value is an array, treat each item as a potential job
                                jobs.push(...value.filter(item => item && typeof item === "object"))
                            } else if (value && typeof value === "object" && !Array.isArray(value)) {
                                // Check if it's a wrapper object with jobs inside
                                const obj = value as any
                                if (obj.jobs && Array.isArray(obj.jobs)) {
                                    jobs.push(...obj.jobs)
                                } else if (obj.data && Array.isArray(obj.data)) {
                                    jobs.push(...obj.data)
                                } else if (obj.items && Array.isArray(obj.items)) {
                                    jobs.push(...obj.items)
                                } else if (obj.results && Array.isArray(obj.results)) {
                                    jobs.push(...obj.results)
                                } else if (obj.title || obj.jobTitle || obj.position) {
                                    // Looks like a job object itself
                                    jobs.push(value)
                                }
                            }
                        }
                        
                        if (jobs.length > 0) {
                            console.log(`  ✅ Extracted ${jobs.length} job(s) from key-value store`)
                        }
                    } catch (error) {
                        console.log(`  ⚠️  Failed to read key-value store: ${error instanceof Error ? error.message : String(error)}`)
                    }
                }
            } catch (error) {
                console.error(`  ❌ Error processing actor ${actor.name}: ${error instanceof Error ? error.message : String(error)}`)
            }
        }

        console.log(`\n✅ Total jobs found from Apify actors: ${jobs.length}`)
        return jobs
    } catch (error) {
        console.error("Failed to fetch jobs from Apify actors:", error)
        throw error
    }
}

/**
 * Normalize Apify job data to match our ScrapedJob interface
 */
export function normalizeApifyJob(apifyJob: any): {
    title: string
    company: string
    location: string
    jobType: string
    shortDescription: string
    fullDescription: string
    sourceUrl: string
} | null {
    if (!apifyJob || typeof apifyJob !== "object") {
        return null
    }

    // Try to extract job fields with various possible field names
    const title = apifyJob.title || apifyJob.jobTitle || apifyJob.position || apifyJob.name || "Untitled Role"
    const company = apifyJob.company || apifyJob.companyName || apifyJob.employer || "Unknown Company"
    const location = apifyJob.location || apifyJob.city || apifyJob.place || "Remote"
    const jobType = apifyJob.jobType || apifyJob.type || apifyJob.employmentType || "Full-time"
    const description = apifyJob.description || apifyJob.summary || apifyJob.details || ""
    const sourceUrl = apifyJob.url || apifyJob.link || apifyJob.sourceUrl || apifyJob.applyUrl || "#"

    // Skip if essential fields are missing
    if (!title || title === "Untitled Role") {
        return null
    }

    return {
        title: String(title),
        company: String(company),
        location: String(location),
        jobType: String(jobType),
        shortDescription: description.substring(0, 150) + (description.length > 150 ? "..." : ""),
        fullDescription: String(description),
        sourceUrl: String(sourceUrl),
    }
}

