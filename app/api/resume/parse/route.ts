import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { parseResumeFromText } from "@/lib/ai"
import { parseResumeWithOpenAI } from "@/lib/openai/parseResume"
import mammoth from "mammoth"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { isValidFileType, formatFileSize } from "@/lib/utils"
import { sanitizeError } from "@/lib/utils"

const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5MB (Vercel serverless function limit)
const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export async function POST(req: NextRequest) {
    return withRateLimit(req, async (req) => {
        const headers = { "Content-Type": "application/json" }
        
        try {
            const formData = await req.formData()
            const file = formData.get("file") as File

            if (!file) {
                return NextResponse.json(
                    { message: "No file uploaded" },
                    { status: 400, headers }
                )
            }

            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    { 
                        message: `File size exceeds limit. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`,
                        maxSize: MAX_FILE_SIZE,
                        receivedSize: file.size,
                    },
                    { status: 400, headers }
                )
            }

            // Validate file type
            if (!isValidFileType(file, [...ALLOWED_FILE_TYPES, ".pdf", ".docx"])) {
                return NextResponse.json(
                    { message: "Unsupported file format. Please upload PDF or DOCX." },
                    { status: 400, headers }
                )
            }

            const buffer = Buffer.from(await file.arrayBuffer())

        if (file.type === "application/pdf") {
            // Extract text from PDF and parse with OpenAI
            const resumeData = await parseResumeWithOpenAI(buffer, file.name)
            return NextResponse.json(resumeData, { headers })
        } else if (
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.name.endsWith(".docx")
        ) {
            // Use Mammoth for DOCX (faster text extraction)
            const result = await mammoth.extractRawText({ buffer })
            const text = result.value

            if (!text.trim()) {
                return NextResponse.json(
                    { message: "Could not extract text from file." },
                    { status: 400, headers }
                )
            }

            // Use existing text-based parser (needs to be updated to match schema)
            const resumeData = await parseResumeFromText(text)
            return NextResponse.json(resumeData, { headers })
        } else {
            return NextResponse.json(
                { message: "Unsupported file format. Please upload PDF or DOCX." },
                { status: 400, headers }
            )
        }
        } catch (error: any) {
            return NextResponse.json(
                { 
                    message: "Failed to parse resume",
                    error: sanitizeError(error),
                },
                { status: 500, headers }
            )
        }
    }, rateLimiters.ai)
}
