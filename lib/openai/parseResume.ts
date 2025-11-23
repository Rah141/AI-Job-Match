// lib/openai/parseResume.ts

export interface ParsedResume {
    fullName: string
    email: string
    phone?: string
    location?: string
    headlineOrTitle?: string
    summary?: string
    experience: Array<{
        jobTitle: string
        company: string
        startDate?: string
        endDate?: string
        description: string
    }>
    education: Array<{
        degree: string
        institution: string
        startDate?: string
        endDate?: string
    }>
    skills: string[]
    keywords?: string[] // Extracted keywords for job matching
    links?: string[]
}

// Cache for the pdf-parse module so we only load it once
let cachedPdfParseModule: any | null = null

async function getPdfParseModule() {
    if (!cachedPdfParseModule) {
        // pdf-parse / pdfjs-dist expect DOMMatrix to exist in the global scope.
        // In Node (Vercel serverless), it's undefined, so we stub a minimal class.
        if (typeof (globalThis as any).DOMMatrix === "undefined") {
            ;(globalThis as any).DOMMatrix = class DOMMatrix {
                constructor(_init?: any) {}
            } as any
        }

        const mod = await import("pdf-parse")
        cachedPdfParseModule = mod as any
    }

    return cachedPdfParseModule
}

/**
 * Parse a PDF resume by extracting text and using OpenAI to structure it.
 * Extracts text from PDF first (via pdf-parse v2), then uses AI to parse structured data.
 */
export async function parseResumeWithOpenAI(
    fileBuffer: Buffer,
    fileName: string = "resume.pdf"
): Promise<ParsedResume> {
    try {
        console.log(`📄 Extracting text from PDF: ${fileName}...`)

        // Load pdf-parse v2 dynamically (after DOMMatrix stub is in place)
        const pdfParseModule = await getPdfParseModule()
        const PDFParse = pdfParseModule.PDFParse ?? pdfParseModule.default ?? pdfParseModule

        if (typeof PDFParse !== "function") {
            throw new Error("Failed to load pdf-parse: PDFParse is not a function")
        }

        // v2 API: instantiate PDFParse and call getText()
        const pdfParser = new PDFParse({ data: fileBuffer })
        const pdfData = await pdfParser.getText()
        const extractedText: string = pdfData?.text ?? ""

        if (!extractedText || extractedText.trim().length < 50) {
            throw new Error(
                "Could not extract sufficient text from PDF. The PDF might be corrupted, password-protected, or contain only images."
            )
        }

        console.log(`✅ Extracted ${extractedText.length} characters from PDF`)

        const pageCount =
            pdfData?.pages?.length ||
            (pdfParser as any)?.doc?.numPages ||
            "unknown"
        console.log(`📄 PDF has ${pageCount} page(s)`)

        // Import parseResumeFromText to use existing text parsing logic
        const { parseResumeFromText } = await import("@/lib/ai")

        console.log("🤖 Parsing extracted text with OpenAI...")

        // Use existing text-based parser which handles structured extraction
        const parsedData: ParsedResume = await parseResumeFromText(extractedText)

        // Ensure arrays exist
        if (!Array.isArray(parsedData.experience)) {
            parsedData.experience = []
        }
        if (!Array.isArray(parsedData.education)) {
            parsedData.education = []
        }
        if (!Array.isArray(parsedData.skills)) {
            parsedData.skills = []
        }
        if (!Array.isArray(parsedData.keywords)) {
            // If keywords not extracted, derive from skills
            parsedData.keywords = [...parsedData.skills]
        }

        // Merge skills into keywords if not already present
        const allKeywords = new Set([
            ...(parsedData.keywords || []),
            ...(parsedData.skills || []),
        ])
        parsedData.keywords = Array.from(allKeywords)

        console.log(`✅ Successfully parsed resume for ${parsedData.fullName || "unknown"}`)
        console.log(
            `📊 Extracted ${parsedData.skills.length} skills and ${parsedData.keywords.length} keywords`
        )

        return parsedData
    } catch (error: any) {
        console.error("PDF Resume Parsing Error:", error)
        console.error("Error details:", {
            message: error?.message,
            status: error?.status,
            code: error?.code,
            type: error?.type,
        })

        // Provide helpful error messages
        if (error?.status === 401) {
            throw new Error(
                "OpenAI API authentication failed. Please check your OPENAI_API_KEY."
            )
        } else if (error?.status === 429) {
            throw new Error(
                "OpenAI API quota exceeded. Please check your plan and billing details, or wait for your quota to reset. For more information: https://platform.openai.com/docs/guides/error-codes/api-errors"
            )
        } else if (error?.status === 404 && error?.message?.includes("model")) {
            throw new Error(
                `Model not found: ${error.message}. Please check your OPENAI_MODEL environment variable or use a valid model like 'gpt-4o'.`
            )
        } else if (error?.message) {
            throw new Error(`PDF parsing failed: ${error.message}`)
        }

        throw error
    }
}
