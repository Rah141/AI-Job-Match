#!/usr/bin/env tsx
/**
 * Test script for PDF parsing
 * Usage: tsx scripts/test-pdf-parse.ts <path-to-pdf-file>
 */

import fs from "fs"
import path from "path"
import dotenv from "dotenv"
import { parseResumeWithOpenAI } from "../lib/openai/parseResume"

// Load environment variables
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

const PDF_PATH = process.argv[2]

if (!PDF_PATH) {
    console.error("❌ Error: Please provide a PDF file path")
    console.log("\nUsage: tsx scripts/test-pdf-parse.ts <path-to-pdf-file>")
    console.log("Example: tsx scripts/test-pdf-parse.ts ./test-resume.pdf")
    process.exit(1)
}

if (!fs.existsSync(PDF_PATH)) {
    console.error(`❌ Error: File not found: ${PDF_PATH}`)
    process.exit(1)
}

if (!path.extname(PDF_PATH).toLowerCase().endsWith(".pdf")) {
    console.error(`❌ Error: File must be a PDF: ${PDF_PATH}`)
    process.exit(1)
}

async function testPDFParsing() {
    console.log("🧪 Testing PDF Parsing with OpenAI Vision API...")
    console.log(`📄 PDF File: ${PDF_PATH}`)
    console.log("")

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
        console.error("❌ Error: OPENAI_API_KEY is not set in environment variables")
        console.log("   Please add it to your .env or .env.local file")
        process.exit(1)
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o"
    console.log(`✅ OpenAI API Key found`)
    console.log(`🤖 Using model: ${model}`)
    console.log("")

    try {
        // Read PDF file
        const pdfBuffer = fs.readFileSync(PDF_PATH)
        console.log(`📦 PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
        console.log("")

        console.log("🚀 Parsing PDF with OpenAI Vision API...")
        console.log("   This may take 10-30 seconds...")
        console.log("")

        const startTime = Date.now()

        // Parse the PDF
        const data = await parseResumeWithOpenAI(pdfBuffer, path.basename(PDF_PATH))

        const duration = ((Date.now() - startTime) / 1000).toFixed(2)

        console.log("✅ Successfully parsed resume!")
        console.log(`⏱️  Parsing took ${duration} seconds`)
        console.log("")
        console.log("📊 Parsed Data:")
        console.log("─".repeat(50))
        console.log(`Name: ${data.fullName || "N/A"}`)
        console.log(`Email: ${data.email || "N/A"}`)
        console.log(`Phone: ${data.phone || "N/A"}`)
        console.log(`Location: ${data.location || "N/A"}`)
        console.log(`Headline: ${data.headlineOrTitle || "N/A"}`)
        if (data.summary) {
            console.log(`Summary: ${data.summary.substring(0, 100)}${data.summary.length > 100 ? "..." : ""}`)
        }
        console.log("")
        console.log(`Skills (${data.skills?.length || 0}):`)
        if (data.skills && data.skills.length > 0) {
            console.log(`   ${data.skills.slice(0, 10).join(", ")}${data.skills.length > 10 ? "..." : ""}`)
        }
        console.log("")
        console.log(`Keywords (${data.keywords?.length || 0}):`)
        if (data.keywords && data.keywords.length > 0) {
            console.log(`   ${data.keywords.slice(0, 10).join(", ")}${data.keywords.length > 10 ? "..." : ""}`)
        }
        console.log("")
        console.log(`Experience (${data.experience?.length || 0}):`)
        if (data.experience && data.experience.length > 0) {
            data.experience.slice(0, 3).forEach((exp: any, i: number) => {
                console.log(`   ${i + 1}. ${exp.jobTitle} at ${exp.company} (${exp.startDate || "?"} - ${exp.endDate || "?"})`)
            })
        }
        console.log("")
        console.log(`Education (${data.education?.length || 0}):`)
        if (data.education && data.education.length > 0) {
            data.education.slice(0, 3).forEach((edu: any, i: number) => {
                console.log(`   ${i + 1}. ${edu.degree} at ${edu.institution}`)
            })
        }
        console.log("─".repeat(50))
        console.log("")
        console.log("✅ Test completed successfully!")

    } catch (error: any) {
        console.error("❌ Test failed:")
        console.error(`   ${error.message}`)
        if (error.stack) {
            console.error("\nStack trace:")
            console.error(error.stack)
        }
        process.exit(1)
    }
}

testPDFParsing()
