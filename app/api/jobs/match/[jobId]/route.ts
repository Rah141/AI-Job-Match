import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { scoreJobsForResume } from "@/lib/ai"
import { ParsedResume } from "@/lib/openai/parseResume"
import { getJobFromDatabase } from "@/lib/jobSync"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { sanitizeError } from "@/lib/utils"

/**
 * GET /api/jobs/match/[jobId]?resumeId=xxx
 * Get match score for a single job against user's resume
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    return withRateLimit(req, async (req) => {
        try {
            const headers = { "Content-Type": "application/json" }
            const { jobId } = await params
            
            // Get resume ID from query params
            const { searchParams } = new URL(req.url)
            const resumeId = searchParams.get("resumeId")

            // Get current user session
            const session = await getServerSession(authOptions)
            const userId = (session?.user as any)?.id
            
            if (!userId) {
                return NextResponse.json(
                    { message: "Unauthorized. Please sign in." },
                    { status: 401, headers }
                )
            }

            if (!resumeId) {
                return NextResponse.json(
                    { message: "Resume ID is required as query parameter" },
                    { status: 400, headers }
                )
            }

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

            // Get job from database
            const job = await getJobFromDatabase(jobId)
            
            if (!job) {
                return NextResponse.json(
                    { message: "Job not found" },
                    { status: 404, headers }
                )
            }

            // Convert job to format expected by scoring function
            const jobForScoring = {
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                jobType: job.jobType || "Full-time",
                shortDescription: job.shortDescription || "",
                fullDescription: job.fullDescription,
                sourceUrl: job.sourceUrl || "",
                postedAt: job.postedAt,
            }

            // Score the single job using OpenAI
            const scores = await scoreJobsForResume(parsedResume, [jobForScoring])

            if (scores.length === 0) {
                return NextResponse.json(
                    { message: "Failed to generate match score" },
                    { status: 500, headers }
                )
            }

            const scoreData = scores[0]

            return NextResponse.json({
                jobId: job.id,
                matchScore: scoreData.score,
                job: {
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    jobType: job.jobType,
                },
            }, { headers })
        } catch (error: any) {
            return NextResponse.json(
                { 
                    message: "Failed to match job", 
                    error: sanitizeError(error)
                },
                { status: 500, headers: { "Content-Type": "application/json" } }
            )
        }
    }, rateLimiters.ai)
}

