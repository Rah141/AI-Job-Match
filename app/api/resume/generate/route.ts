import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { generateResumeFromProfile } from "@/lib/ai"
import { ParsedResume } from "@/lib/openai/parseResume"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { validateRequestBody } from "@/lib/validations"
import { resumeGenerateSchema } from "@/lib/validations"
import { sanitizeError } from "@/lib/utils"

export async function POST(req: NextRequest) {
    return withRateLimit(req, async (req) => {
        const headers = { "Content-Type": "application/json" }
        
        try {
            // Validate request body
            const validation = await validateRequestBody(req, resumeGenerateSchema)
            if (!validation.success) {
                return validation.error
            }

            const { fullName, email, role, skills, experience } = validation.data

        // Prepare profile data for AI generation
        const profileData = {
            fullName,
            email,
            role,
            skills: Array.isArray(skills) ? skills : (skills || "").split(",").map((s: string) => s.trim()).filter(Boolean),
            experience: experience || "",
        }

        // Generate resume using AI
        const generatedResume = await generateResumeFromProfile(profileData)

        // Transform to match ParsedResume format
        const parsedResume: ParsedResume = {
            fullName: generatedResume.fullName || fullName,
            email: generatedResume.contact?.email || email,
            phone: generatedResume.contact?.phone,
            location: generatedResume.contact?.location,
            headlineOrTitle: role,
            summary: generatedResume.summary || `Experienced ${role} with expertise in ${(profileData.skills as string[]).slice(0, 3).join(", ")}.`,
            experience: (generatedResume.experience || []).map((exp: any) => ({
                jobTitle: exp.role || role,
                company: exp.company || "Previous Company",
                startDate: exp.dates?.split(" - ")[0],
                endDate: exp.dates?.split(" - ")[1] || "Present",
                description: Array.isArray(exp.responsibilities) 
                    ? exp.responsibilities.join(". ")
                    : (exp.description || ""),
            })),
            education: (generatedResume.education || []).map((edu: any) => ({
                degree: edu.degree || "Degree",
                institution: edu.institution || "Institution",
                startDate: edu.dates?.split(" - ")[0],
                endDate: edu.dates?.split(" - ")[1],
            })),
            skills: generatedResume.skills || profileData.skills,
            keywords: generatedResume.skills || profileData.skills,
            links: generatedResume.contact?.links || [],
        }

        return NextResponse.json(parsedResume, { headers })
        } catch (error: any) {
            return NextResponse.json(
                { message: "Failed to generate resume", error: sanitizeError(error) },
                { status: 500, headers }
            )
        }
    }, rateLimiters.ai)
}

