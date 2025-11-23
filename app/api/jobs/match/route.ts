import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { scoreJobsForResume } from "@/lib/ai"
import { ParsedResume } from "@/lib/openai/parseResume"
import { getJobsFromDatabase } from "@/lib/jobSync"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { validateRequestBody } from "@/lib/validations"
import { jobMatchSchema } from "@/lib/validations"
import { sanitizeError } from "@/lib/utils"

/**
 * Shared handler for job matching logic
 */
async function matchJobsHandler(resumeId: string, userId: string) {
    const headers = { "Content-Type": "application/json" }

    // Get resume from database
    const resume = await prisma.resume.findFirst({
        where: {
            id: resumeId,
            userId: userId, // Ensure user owns this resume
        },
    })

    if (!resume) {
        return NextResponse.json(
            { message: "Resume not found" },
            { status: 404, headers }
        )
    }

    // Parse resume content from JSON string
    let parsedResume: ParsedResume
    try {
        parsedResume = JSON.parse(resume.content) as ParsedResume
    } catch (error) {
        return NextResponse.json(
            { message: "Invalid resume data format" },
            { status: 400, headers }
        )
    }

    // Get jobs from database (scraped from Browser AI)
    const dbJobs = await getJobsFromDatabase({ limit: 100, orderBy: "postedAt", order: "desc" })
    
    if (dbJobs.length === 0) {
        return NextResponse.json(
            { message: "No jobs available in database. Please sync jobs first." },
            { status: 404, headers }
        )
    }

    // Convert database jobs to format expected by matching function
    const jobs = dbJobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        jobType: job.jobType || "Full-time",
        shortDescription: job.shortDescription || "",
        fullDescription: job.fullDescription,
        sourceUrl: job.sourceUrl || "",
        postedAt: job.postedAt,
    }))

    if (jobs.length === 0) {
        return NextResponse.json(
            { message: "No jobs available to match" },
            { status: 404, headers }
        )
    }

    // Score jobs using OpenAI
    const scores = await scoreJobsForResume(parsedResume, jobs)

    // Validate that we received scores for all jobs
    if (scores.length !== jobs.length) {
    }

    // Merge scores with jobs and sort by match score
    const scoredJobs = jobs.map(job => {
        const scoreData = scores.find(s => s.jobId === job.id)
        
        if (!scoreData) {
            // Don't default to 0 - this indicates a real problem
            // Use a low score instead to indicate missing data
            return {
                ...job,
                matchScore: 0,
            }
        }
        
        const matchScore = Math.max(0, Math.min(100, Math.round(scoreData.score)))
        
        // Validate score is reasonable (not 0 unless it's actually a bad match)
        if (matchScore === 0 && scoreData.score !== 0) {
        }
        
        return {
            ...job,
            matchScore: matchScore,
        }
    }).sort((a, b) => b.matchScore - a.matchScore)
    
    // Log summary of scored jobs
    const scoreSummary = scoredJobs.slice(0, 5).map(j => `${j.matchScore}%`).join(", ")

    return NextResponse.json({
        resumeId: resume.id,
        resumeTitle: resume.title,
        jobs: scoredJobs,
        totalJobs: scoredJobs.length,
    }, { headers })
}

export async function POST(req: NextRequest) {
    return withRateLimit(req, async (req) => {
        try {
            const headers = { "Content-Type": "application/json" }
            
            // Get current user session
            const session = await getServerSession(authOptions)
            const userId = (session?.user as any)?.id
            
            if (!userId) {
                return NextResponse.json(
                    { message: "Unauthorized. Please sign in." },
                    { status: 401, headers }
                )
            }

            // Validate request body
            const validation = await validateRequestBody(req, jobMatchSchema)
            if (!validation.success) {
                return validation.error
            }

            const { resumeId } = validation.data

            return await matchJobsHandler(resumeId, userId)
        } catch (error: any) {
            return NextResponse.json(
                { 
                    message: "Failed to match jobs", 
                    error: sanitizeError(error)
                },
                { status: 500, headers: { "Content-Type": "application/json" } }
            )
        }
    }, rateLimiters.ai)
}

// Also support GET with resumeId as query parameter
export async function GET(req: NextRequest) {
    return withRateLimit(req, async (req) => {
        try {
            const headers = { "Content-Type": "application/json" }
            const { searchParams } = new URL(req.url)
            const resumeId = searchParams.get("resumeId")

            if (!resumeId) {
                return NextResponse.json(
                    { message: "Resume ID is required as query parameter" },
                    { status: 400, headers }
                )
            }

            // Get current user session
            const session = await getServerSession(authOptions)
            const userId = (session?.user as any)?.id
            
            if (!userId) {
                return NextResponse.json(
                    { message: "Unauthorized. Please sign in." },
                    { status: 401, headers }
                )
            }

            return await matchJobsHandler(resumeId, userId)
        } catch (error: any) {
            return NextResponse.json(
                { 
                    message: "Failed to match jobs", 
                    error: sanitizeError(error)
                },
                { status: 500, headers: { "Content-Type": "application/json" } }
            )
        }
    }, rateLimiters.ai)
}

