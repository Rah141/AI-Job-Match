import { browseAiClient } from "@/lib/browseAiClient"
import { BROWSEAI_CONFIG } from "@/lib/config/browseAi"
import { getScraperConfig } from "@/lib/apifyClient"

// This module integrates with the Browser AI agent to fetch jobs.
// For this implementation, we will simulate the agent's output.

export interface ScrapedJob {
    title: string
    company: string
    location: string
    jobType: string
    shortDescription: string
    fullDescription: string
    sourceUrl: string
}

/**
 * Fetch jobs from a single robot
 */
async function fetchJobsFromRobot(robotId: string): Promise<ScrapedJob[]> {
    try {
        // Get robot details to determine input parameters
        const robotsResponse = await browseAiClient.getRobots()
        const robots = robotsResponse.robots?.items || []
        const robot = robots.find((r: any) => r.id === robotId) as any

        if (!robot) {
            console.warn(`Robot ${robotId} not found`)
            return []
        }

        // Build input parameters based on robot requirements
        const inputParameters: Record<string, unknown> = {}
        if (robot.inputParameters) {
            robot.inputParameters.forEach((param: any) => {
                // Use default value if available
                if (param.defaultValue !== undefined) {
                    inputParameters[param.name] = param.defaultValue
                } else if (param.type === "number") {
                    inputParameters[param.name] = 10
                } else if (param.type === "url") {
                    inputParameters[param.name] = "https://www.petrojobs.om/en-us/Pages/Home.aspx"
                } else {
                    inputParameters[param.name] = param.value || "test"
                }
            })
        }

        console.log(`Starting Browse AI task for robot: ${robot.name} (${robotId})`)
        const { result: task } = await browseAiClient.runRobotTask(robotId, inputParameters)
        console.log(`Task started: ${task.id}. Waiting for completion...`)

        const completedTask = await browseAiClient.waitForTaskCompletion(robotId, task.id)
        console.log(`Task completed successfully for robot: ${robot.name}`)

        // Try different possible list names that robots might use
        const possibleListNames = ['jobs', 'job_listings', 'listings', 'results', 'items']
        let rawJobs: any[] = []

        for (const listName of possibleListNames) {
            if (completedTask.capturedLists?.[listName]) {
                rawJobs = completedTask.capturedLists[listName]
                console.log(`Found ${rawJobs.length} jobs in list: ${listName}`)
                break
            }
        }

        // If no jobs found in lists, check if there's a single captured list
        if (rawJobs.length === 0 && completedTask.capturedLists) {
            const listKeys = Object.keys(completedTask.capturedLists)
            if (listKeys.length > 0) {
                rawJobs = completedTask.capturedLists[listKeys[0]]
                console.log(`Found ${rawJobs.length} jobs in list: ${listKeys[0]}`)
            }
        }

        return rawJobs.map((job: any) => ({
            title: job.title || job.job_title || "Untitled Role",
            company: job.company || job.company_name || "Unknown Company",
            location: job.location || job.job_location || "Remote",
            jobType: job.job_type || job.type || "Full-time",
            shortDescription: (job.description || job.summary || "").substring(0, 150) + "..." || "",
            fullDescription: job.description || job.summary || "",
            sourceUrl: job.url || job.link || job.source_url || "#",
        }))

    } catch (error: any) {
        console.error(`Failed to fetch jobs from robot ${robotId}:`, error.message)
        // Return empty array instead of throwing - allows other robots to continue
        return []
    }
}

export async function fetchLatestJobs(): Promise<ScrapedJob[]> {
    try {
        // Try to load configuration from Apify key-value store
        // This allows dynamic configuration without code changes
        const apifyConfig = await getScraperConfig("browser-ai-jobs")
        if (apifyConfig) {
            console.log("✅ Loaded configuration from Apify:", apifyConfig)
            // You can use apifyConfig to override defaults, e.g.:
            // - robotIds: apifyConfig.robotIds
            // - batchSize: apifyConfig.batchSize
            // - timeout: apifyConfig.timeout
        }

        // If no API key is set, return mock data (fallback for dev without key)
        if (!BROWSEAI_CONFIG.apiKey) {
            console.warn("Using mock data because BROWSEAI_API_KEY is missing")
            return getMockJobs()
        }

        // Get robot IDs - prefer BROWSEAI_ROBOT_IDS (comma-separated) over single BROWSEAI_ROBOT_ID
        const robotIds = BROWSEAI_CONFIG.robotIds.length > 0 
            ? BROWSEAI_CONFIG.robotIds 
            : (BROWSEAI_CONFIG.defaultRobotId && BROWSEAI_CONFIG.defaultRobotId !== "default-robot-id"
                ? [BROWSEAI_CONFIG.defaultRobotId]
                : [])

        if (robotIds.length === 0) {
            console.warn("Using mock data because no robot IDs are configured")
            console.warn("Set BROWSEAI_ROBOT_IDS (comma-separated) or BROWSEAI_ROBOT_ID in your .env file")
            return getMockJobs()
        }

        console.log(`Fetching jobs from ${robotIds.length} robot(s): ${robotIds.join(", ")}`)

        // Fetch jobs from all robots in parallel
        const jobPromises = robotIds.map(robotId => fetchJobsFromRobot(robotId))
        const jobArrays = await Promise.all(jobPromises)

        // Combine all jobs from all robots
        const allJobs = jobArrays.flat()
        
        // Remove duplicates based on title + company + location
        const uniqueJobs = allJobs.filter((job, index, self) =>
            index === self.findIndex((j) => 
                j.title === job.title && 
                j.company === job.company && 
                j.location === job.location
            )
        )

        console.log(`Successfully fetched ${uniqueJobs.length} unique jobs from ${robotIds.length} robot(s)`)

        if (uniqueJobs.length === 0) {
            console.warn("No jobs found from any robot. Returning mock data.")
            return getMockJobs()
        }

        return uniqueJobs

    } catch (error) {
        console.error("Failed to fetch jobs from Browse AI:", error)
        return getMockJobs() // Fallback on error to keep app usable
    }
}

function getMockJobs(): ScrapedJob[] {
    return [
        {
            title: "Senior Frontend Engineer (Mock)",
            company: "TechCorp AI",
            location: "Remote",
            jobType: "Full-time",
            shortDescription: "We are looking for a React expert to build our next-gen AI interface.",
            fullDescription: "We are looking for a Senior Frontend Engineer to join our team. You will be responsible for building the UI for our AI-powered platform. Requirements: React, TypeScript, Tailwind CSS, Next.js. Experience with AI integrations is a plus.",
            sourceUrl: "https://example.com/jobs/1",
        },
        {
            title: "Full Stack Developer (Mock)",
            company: "StartupX",
            location: "San Francisco, CA",
            jobType: "Hybrid",
            shortDescription: "Join a fast-paced startup building the future of finance.",
            fullDescription: "StartupX is seeking a Full Stack Developer. You will work on both the frontend and backend of our fintech application. Stack: Node.js, PostgreSQL, React. Competitive salary and equity.",
            sourceUrl: "https://example.com/jobs/2",
        },
    ]
}

export function normalizeJobs(rawJobs: ScrapedJob[]) {
    return rawJobs.map(job => ({
        ...job,
        postedAt: new Date(),
    }))
}
