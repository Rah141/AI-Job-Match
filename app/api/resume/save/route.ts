import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ParsedResume } from "@/lib/openai/parseResume"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { validateRequestBody } from "@/lib/validations"
import { resumeSaveSchema } from "@/lib/validations"
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
        const validation = await validateRequestBody(req, resumeSaveSchema)
        if (!validation.success) {
            return validation.error
        }

        const { content, title, type, rawText: providedRawText } = validation.data
        
        // Parse and validate resume content
        let resumeData: any
        try {
            resumeData = typeof content === "string" ? JSON.parse(content) : content
        } catch (error) {
            return NextResponse.json(
                { message: "Invalid resume content format. Expected valid JSON." },
                { status: 400, headers }
            )
        }

        // Validate that resumeData matches ParsedResume structure
        if (!resumeData.fullName && !resumeData.skills) {
            return NextResponse.json(
                { message: "Invalid resume data format" },
                { status: 400, headers }
            )
        }

        // Create raw text representation if not provided
        const resumeRawText = providedRawText || `
            Name: ${resumeData.fullName || ""}
            Email: ${resumeData.email || ""}
            Headline: ${resumeData.headlineOrTitle || ""}
            Summary: ${resumeData.summary || ""}
            Skills: ${(resumeData.skills || []).join(", ")}
            Keywords: ${(resumeData.keywords || []).join(", ")}
            Experience:
            ${(resumeData.experience || []).map((exp: any) => 
                `${exp.jobTitle} at ${exp.company} (${exp.startDate || ""} - ${exp.endDate || ""}): ${exp.description}`
            ).join("\n")}
            Education:
            ${(resumeData.education || []).map((edu: any) => 
                `${edu.degree} at ${edu.institution}`
            ).join("\n")}
        `.trim()

        // Save resume to database
        let resume
        try {
            resume = await prisma.resume.create({
                data: {
                    userId: userId,
                    title: title || resumeData.headlineOrTitle || "My Resume",
                    content: typeof content === "string" ? content : JSON.stringify(content),
                    rawText: resumeRawText,
                    type: type || "UPLOADED", // "UPLOADED" or "GENERATED"
                },
            })
        } catch (dbError: any) {
            // Check if it's a database connection issue
            if (dbError?.code === "P1001" || dbError?.message?.includes("connect")) {
                return NextResponse.json(
                    { message: "Database connection error. Please check your database configuration.", error: sanitizeError(dbError) },
                    { status: 500, headers }
                )
            }
            // Re-throw to be caught by outer catch
            throw dbError
        }

        return NextResponse.json(
            { 
                message: "Resume saved successfully",
                resumeId: resume.id,
                resume: {
                    id: resume.id,
                    title: resume.title,
                    type: resume.type,
                    createdAt: resume.createdAt,
                }
            },
            { status: 201, headers }
        )
    } catch (error: any) {
        return NextResponse.json(
            { message: "Failed to save resume", error: sanitizeError(error) },
            { status: 500, headers }
        )
    }
    }, rateLimiters.api)
}

