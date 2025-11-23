import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getJobsFromDatabase, getJobFromDatabase } from "@/lib/jobSync"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { sanitizeError } from "@/lib/utils"

/**
 * GET /api/jobs/list
 * Returns all jobs from the database, or a single job if id is provided
 */
export async function GET(req: NextRequest) {
    return withRateLimit(req, async (req) => {
    try {
        const { searchParams } = new URL(req.url)
        const jobId = searchParams.get("id")

        // If ID is provided, return a single job
        if (jobId) {
            const job = await getJobFromDatabase(jobId)
            if (!job) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Job not found"
                    },
                    {
                        status: 404,
                        headers: { "Content-Type": "application/json" }
                    }
                )
            }
            return NextResponse.json({
                success: true,
                jobs: [job],
                total: 1,
                showing: 1
            }, {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        }

        // Otherwise, return all jobs with pagination
        const limit = parseInt(searchParams.get("limit") || "100")
        const offset = parseInt(searchParams.get("offset") || "0")
        const orderBy = (searchParams.get("orderBy") || "postedAt") as "postedAt" | "createdAt" | "updatedAt"
        const order = (searchParams.get("order") || "desc") as "asc" | "desc"

        const jobs = await getJobsFromDatabase({
            limit,
            offset,
            orderBy,
            order
        })

        // Get total count
        const { prisma } = await import("@/lib/prisma")
        const total = await prisma.job.count()

        return NextResponse.json({
            success: true,
            jobs,
            total,
            limit,
            offset,
            showing: jobs.length
        }, {
            status: 200,
            headers: { "Content-Type": "application/json" }
        })
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                message: "Failed to list jobs",
                error: sanitizeError(error)
            },
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        )
    }
    }, rateLimiters.api)
}

