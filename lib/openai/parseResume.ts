import fs from "fs"
import path from "path"
import os from "os"

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

/**
 * Parse a PDF resume by extracting text and using OpenAI to structure it
 * Extracts text from PDF first, then uses AI to parse structured data
 */
export async function parseResumeWithOpenAI(fileBuffer: Buffer, fileName: string = "resume.pdf"): Promise<ParsedResume> {
    const tempFilePath = path.join(os.tmpdir(), `resume-${Date.now()}.pdf`)

    try {
        // Write PDF to temp file for pdf-parse
        fs.writeFileSync(tempFilePath, fileBuffer)

        console.log(`📄 Extracting text from PDF: ${fileName}...`)

        // Extract text from PDF using pdf-parse (v2 API)
        // pdf-parse v2 uses PDFParse class - instantiate and call getText()
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParseModule = require("pdf-parse")
        const PDFParse = pdfParseModule.PDFParse
        if (typeof PDFParse !== "function") {
            throw new Error("Failed to load pdf-parse: PDFParse is not a function")
        }
        // Create parser instance with buffer
        const pdfParser = new PDFParse({ data: fileBuffer })
        // Call getText() to extract text
        const pdfData = await pdfParser.getText()
        const extractedText = pdfData.text

        if (!extractedText || extractedText.trim().length < 50) {
            throw new Error("Could not extract sufficient text from PDF. The PDF might be corrupted, password-protected, or contain only images.")
        }

        console.log(`✅ Extracted ${extractedText.length} characters from PDF`)
        // Note: pdf-parse v2 API structure may differ, numpages might be in pdfParser or pdfData
        const pageCount = pdfData.pages?.length || pdfParser.doc?.numPages || "unknown"
        console.log(`📄 PDF has ${pageCount} page(s)`)

        // Import parseResumeFromText to use existing text parsing logic
        const { parseResumeFromText } = await import("@/lib/ai")

        console.log("🤖 Parsing extracted text with OpenAI...")

        // Use existing text-based parser which handles structured extraction
        const parsedData = await parseResumeFromText(extractedText)

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
            ...parsedData.keywords,
            ...parsedData.skills,
        ])
        parsedData.keywords = Array.from(allKeywords)

        console.log(`✅ Successfully parsed resume for ${parsedData.fullName || "unknown"}`)
        console.log(`📊 Extracted ${parsedData.skills.length} skills and ${parsedData.keywords.length} keywords`)

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
            throw new Error("OpenAI API authentication failed. Please check your OPENAI_API_KEY.")
        } else if (error?.status === 429) {
            throw new Error("OpenAI API quota exceeded. Please check your plan and billing details, or wait for your quota to reset. For more information: https://platform.openai.com/docs/guides/error-codes/api-errors")
        } else if (error?.status === 404 && error?.message?.includes("model")) {
            throw new Error(`Model not found: ${error.message}. Please check your OPENAI_MODEL environment variable or use a valid model like 'gpt-4o'.`)
        } else if (error?.message) {
            throw new Error(`PDF parsing failed: ${error.message}`)
        }
        
        throw error
    } finally {
        // Cleanup temp file
        if (fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath)
            } catch (cleanupError) {
                console.warn("Failed to delete temp file:", cleanupError)
            }
        }
    }
}
