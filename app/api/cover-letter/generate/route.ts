import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateCoverLetter } from "@/lib/ai"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { validateRequestBody } from "@/lib/validations"
import { coverLetterSchema } from "@/lib/validations"
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
        const validation = await validateRequestBody(req, coverLetterSchema)
        if (!validation.success) {
            return validation.error
        }

        const { jobId, resumeId } = validation.data
        
        // Get job description from jobId
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
        
        const jobDescription = job.fullDescription || job.shortDescription || ""
        
        if (!jobDescription) {
            return NextResponse.json(
                { message: "Job description not available" },
                { status: 400, headers }
            )
        }

        // Fetch user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true },
        })

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404, headers }
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

        // Generate cover letter using AI
        const coverLetter = await generateCoverLetter(
            { name: user.name || user.email },
            resumeData,
            jobDescription
        )

        return NextResponse.json(
            { 
                message: "Cover letter generated successfully",
                coverLetter: coverLetter,
            },
            { status: 200, headers }
        )
    } catch (error: any) {
        return NextResponse.json(
            { message: "Failed to generate cover letter", error: sanitizeError(error) },
            { status: 500, headers }
        )
    }
    }, rateLimiters.ai)
}

