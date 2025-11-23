import * as dotenv from "dotenv"
import fs from "fs"
import path from "path"

// Load env vars from .env file manually if dotenv fails or just to be sure
const envPath = path.resolve(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
}

const API_KEY = process.env.BROWSEAI_API_KEY

async function main() {
    if (!API_KEY) {
        console.error("BROWSEAI_API_KEY not found in .env")
        return
    }

    try {
        console.log("Fetching robots with key:", API_KEY.substring(0, 10) + "...")
        const response = await fetch("https://api.browse.ai/v2/robots", {
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`)
            const text = await response.text()
            console.error(text)
            return
        }

        const data = await response.json()
        console.log("Robots found:", data.robots)

        if (data.robots && data.robots.length > 0) {
            console.log("\nAVAILABLE ROBOTS:")
            data.robots.forEach((r: any) => {
                console.log(`- Name: ${r.name}`)
                console.log(`  ID: ${r.id}`)
            })
            console.log("\nCopy one of the IDs above and set it as BROWSEAI_ROBOT_ID in your .env file.")
        } else {
            console.log("No robots found. Please create a robot in Browse AI dashboard.")
        }
    } catch (error) {
        console.error("Error fetching robots:", error)
    }
}

main()
