import { prisma } from "@/lib/prisma"
import { fetchLatestJobs, ScrapedJob } from "@/lib/browserAIJobs"
import { getScraperConfig } from "@/lib/apifyClient"

/**
 * Syncs jobs from Browser AI to the database.
 * Creates new jobs and updates existing ones based on sourceUrl (unique identifier).
 * Optionally uses Apify config for sync settings (batchSize, etc.)
 * 
 * @returns Object with counts of created, updated, and total jobs
 */
export async function syncJobsToDatabase(): Promise<{
    created: number
    updated: number
    total: number
    errors: string[]
}> {
    const errors: string[] = []
    let created = 0
    let updated = 0

    try {
        // Try to load sync configuration from Apify
        const apifyConfig = await getScraperConfig("job-sync")
        const batchSize = (apifyConfig?.batchSize as number) || 10
        
        if (apifyConfig) {
            console.log("✅ Loaded sync configuration from Apify")
        }

        console.log("Starting job sync from Browser AI...")
        const scrapedJobs = await fetchLatestJobs()
        
        if (scrapedJobs.length === 0) {
            console.warn("No jobs fetched from Browser AI")
            return { created: 0, updated: 0, total: 0, errors: ["No jobs fetched from Browser AI"] }
        }

        console.log(`Fetched ${scrapedJobs.length} jobs from Browser AI. Syncing to database...`)
        console.log(`Using batch size: ${batchSize}`)

        // Process jobs in batches to avoid overwhelming the database
        for (let i = 0; i < scrapedJobs.length; i += batchSize) {
            const batch = scrapedJobs.slice(i, i + batchSize)
            
            await Promise.all(
                batch.map(async (scrapedJob) => {
                    try {
                        // Use sourceUrl as unique identifier (or create a composite key)
                        // If sourceUrl is not unique, use title + company + location
                        const uniqueKey = scrapedJob.sourceUrl || 
                            `${scrapedJob.title}|${scrapedJob.company}|${scrapedJob.location}`

                        // Check if job already exists
                        const existingJob = await prisma.job.findFirst({
                            where: {
                                OR: [
                                    { sourceUrl: scrapedJob.sourceUrl },
                                    // Fallback: match by title, company, and location if sourceUrl is missing
                                    ...(scrapedJob.sourceUrl === "#" || !scrapedJob.sourceUrl ? [{
                                        title: scrapedJob.title,
                                        company: scrapedJob.company,
                                        location: scrapedJob.location,
                                    }] : [])
                                ]
                            }
                        })

                        if (existingJob) {
                            // Update existing job
                            await prisma.job.update({
                                where: { id: existingJob.id },
                                data: {
                                    title: scrapedJob.title,
                                    company: scrapedJob.company,
                                    location: scrapedJob.location,
                                    jobType: scrapedJob.jobType,
                                    shortDescription: scrapedJob.shortDescription,
                                    fullDescription: scrapedJob.fullDescription,
                                    sourceUrl: scrapedJob.sourceUrl || existingJob.sourceUrl,
                                    updatedAt: new Date(),
                                    // Only update postedAt if it's a new posting (optional logic)
                                }
                            })
                            updated++
                        } else {
                            // Create new job
                            await prisma.job.create({
                                data: {
                                    title: scrapedJob.title,
                                    company: scrapedJob.company,
                                    location: scrapedJob.location,
                                    jobType: scrapedJob.jobType,
                                    shortDescription: scrapedJob.shortDescription,
                                    fullDescription: scrapedJob.fullDescription,
                                    sourceUrl: scrapedJob.sourceUrl || null,
                                    postedAt: new Date(),
                                }
                            })
                            created++
                        }
                    } catch (error: any) {
                        const errorMsg = `Error syncing job "${scrapedJob.title}" at ${scrapedJob.company}: ${error.message}`
                        console.error(errorMsg)
                        errors.push(errorMsg)
                    }
                })
            )
        }

        console.log(`Job sync completed: ${created} created, ${updated} updated, ${scrapedJobs.length} total`)

        return {
            created,
            updated,
            total: scrapedJobs.length,
            errors
        }
    } catch (error: any) {
        const errorMsg = `Failed to sync jobs: ${error.message}`
        console.error(errorMsg, error)
        errors.push(errorMsg)
        return { created, updated, total: 0, errors }
    }
}

/**
 * Get all jobs from the database, optionally filtered and sorted
 */
export async function getJobsFromDatabase(options?: {
    limit?: number
    offset?: number
    orderBy?: "postedAt" | "createdAt" | "updatedAt"
    order?: "asc" | "desc"
}) {
    const {
        limit = 100,
        offset = 0,
        orderBy = "postedAt",
        order = "desc"
    } = options || {}

    return await prisma.job.findMany({
        take: limit,
        skip: offset,
        orderBy: {
            [orderBy]: order
        }
    })
}

/**
 * Get a single job by ID from the database
 */
export async function getJobFromDatabase(jobId: string) {
    return await prisma.job.findUnique({
        where: { id: jobId }
    })
}

