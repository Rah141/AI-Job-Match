import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { tailorResumeToJob } from "@/lib/ai"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { validateRequestBody } from "@/lib/validations"
import { resumeTailorSchema } from "@/lib/validations"
import { sanitizeError } from "@/lib/utils"

export async function POST(req: NextRequest) {
    return withRateLimit(req, async (req) => {
    const headers = { "Content-Type": "application/json" }
    
    try {
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
        const validation = await validateRequestBody(req, resumeTailorSchema)
        if (!validation.success) {
            return validation.error
        }

        const { jobId, jobDescription: bodyJobDescription, resumeId } = validation.data
        
        // Get job description from jobId if provided, otherwise use body
        let jobDescription: string
        if (jobId) {
            const job = await prisma.job.findUnique({
                where: { id: jobId },
                select: { fullDescription: true, shortDescription: true }
            })
            
            if (!job) {
                return NextResponse.json(
                    { message: "Job not found" },
                    { status: 404, headers }
                )
            }
            
            jobDescription = job.fullDescription || job.shortDescription || ""
        } else if (bodyJobDescription) {
            jobDescription = bodyJobDescription
        } else {
            return NextResponse.json(
                { message: "Job description is required" },
                { status: 400, headers }
            )
        }

        // Fetch user's resume from database
        let resume
        if (resumeId) {
            resume = await prisma.resume.findFirst({
                where: {
                    id: resumeId,
                    userId: userId,
                },
            })
        } else {
            // Get latest resume for user
            resume = await prisma.resume.findFirst({
                where: {
                    userId: userId,
                },
                orderBy: {
                    createdAt: "desc",
                },
            })
        }

        if (!resume) {
            return NextResponse.json(
                { message: "No resume found. Please upload or generate a resume first." },
                { status: 404, headers }
            )
        }

        // Parse resume content
        let resumeData: any
        try {
            resumeData = JSON.parse(resume.content)
        } catch (error) {
            return NextResponse.json(
                { message: "Failed to parse resume content" },
                { status: 400, headers }
            )
        }

        // Tailor resume using AI
        const tailoredResume = await tailorResumeToJob(resumeData, jobDescription)

        // Try to save or update Application record
        // Note: This may fail if the job doesn't exist in the database, but we'll still return the tailored resume
        let application = null
        try {
            if (jobId) {
                // Check if job exists in database
                const job = await prisma.job.findUnique({
                    where: { id: jobId },
                })

                if (job) {
                    // Check if application already exists
                    const existingApp = await prisma.application.findFirst({
                        where: {
                            userId: userId,
                            jobId: jobId,
                        },
                    })

                    if (existingApp) {
                        // Update existing application
                        application = await prisma.application.update({
                            where: { id: existingApp.id },
                            data: {
                                tailoredResume: JSON.stringify(tailoredResume),
                                resumeId: resume.id,
                            },
                        })
                    } else {
                        // Create new application
                        application = await prisma.application.create({
                            data: {
                                userId: userId,
                                jobId: jobId,
                                resumeId: resume.id,
                                tailoredResume: JSON.stringify(tailoredResume),
                                status: "DRAFT",
                            },
                        })
                    }
                }
            }
        } catch (dbError: any) {
            // Continue without saving to DB - tailored resume is still returned
            // Error is silently ignored as the tailored resume is still valid
        }

        return NextResponse.json(
            { 
                message: "Resume tailored successfully",
                tailoredResume: tailoredResume,
                applicationId: application?.id,
            },
            { status: 200, headers }
        )
    } catch (error: any) {
        return NextResponse.json(
            { message: "Failed to tailor resume", error: sanitizeError(error) },
            { status: 500, headers }
        )
    }
    }, rateLimiters.ai)
}

