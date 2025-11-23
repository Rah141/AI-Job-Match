import * as dotenv from "dotenv"
import fs from "fs"
import path from "path"

// Load env vars
const envPath = path.resolve(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
}

const API_KEY = process.env.BROWSEAI_API_KEY
const ROBOT_ID = process.env.BROWSEAI_ROBOT_ID

async function verify() {
    if (!API_KEY || !ROBOT_ID) {
        console.error("Error: BROWSEAI_API_KEY or BROWSEAI_ROBOT_ID not set in .env")
        return
    }

    console.log(`Verifying integration with Robot ID: ${ROBOT_ID}`)

    try {
        // 1. Check Status
        console.log("Checking API status...")
        const statusRes = await fetch("https://api.browse.ai/v2/status", {
            headers: { "Authorization": `Bearer ${API_KEY}` }
        })
        const status = await statusRes.json()
        console.log("API Status:", status)

        // 2. Run a test task
        console.log("Starting a task...")
        const taskRes = await fetch(`https://api.browse.ai/v2/robots/${ROBOT_ID}/tasks`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputParameters: {} })
        })

        if (!taskRes.ok) {
            const err = await taskRes.text()
            throw new Error(`Failed to start task: ${taskRes.status} ${err}`)
        }

        const { result: task } = await taskRes.json()
        console.log("Task started successfully!")
        console.log(`Task ID: ${task.id}`)
        console.log(`Task Status: ${task.status}`)
        console.log("\nIntegration Verified! The app can now scrape jobs.")

    } catch (error) {
        console.error("Verification failed:", error)
    }
}

verify()
