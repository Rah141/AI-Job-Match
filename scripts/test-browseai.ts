#!/usr/bin/env tsx
/**
 * Test script for Browse AI integration
 * Tests API connection, robot tasks, and job fetching
 * Usage: tsx scripts/test-browseai.ts
 */

// Load environment variables FIRST before any imports
import dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: false })
dotenv.config({ path: ".env", override: true })

// Now import modules that use environment variables
import { browseAiClient } from "../lib/browseAiClient"
import { fetchLatestJobs, normalizeJobs } from "../lib/browserAIJobs"
import { BROWSEAI_CONFIG } from "../lib/config/browseAi"

async function testBrowseAI() {
    console.log("🧪 Testing Browse AI Integration\n")
    console.log("=" .repeat(50))

    // Check configuration - check process.env directly since config might be cached
    const apiKey = process.env.BROWSEAI_API_KEY || BROWSEAI_CONFIG.apiKey
    const robotIds = BROWSEAI_CONFIG.robotIds.length > 0 
        ? BROWSEAI_CONFIG.robotIds 
        : (process.env.BROWSEAI_ROBOT_ID && process.env.BROWSEAI_ROBOT_ID !== "default-robot-id"
            ? [process.env.BROWSEAI_ROBOT_ID]
            : [])
    const baseUrl = BROWSEAI_CONFIG.baseUrl

    console.log("\n📋 Configuration Check:")
    console.log(`   API Key: ${apiKey ? "✅ Set" : "❌ Missing"}`)
    console.log(`   Base URL: ${baseUrl}`)
    console.log(`   Robot IDs: ${robotIds.length > 0 ? `✅ ${robotIds.length} robot(s) configured` : "❌ Not set"}`)
    if (robotIds.length > 0) {
        robotIds.forEach((id, index) => {
            console.log(`      ${index + 1}. ${id}`)
        })
    }

    if (!apiKey) {
        console.error("\n❌ Error: BROWSEAI_API_KEY is not set in environment variables")
        console.log("   Please add it to your .env or .env.local file")
        process.exit(1)
    }

    if (robotIds.length === 0) {
        console.error("\n❌ Error: No robot IDs configured")
        console.log("   Please set BROWSEAI_ROBOT_IDS (comma-separated) or BROWSEAI_ROBOT_ID in your .env file")
        console.log("   Example: BROWSEAI_ROBOT_IDS=robot-id-1,robot-id-2")
        console.log("   Run 'tsx scripts/list-robots.ts' to see available robots")
        process.exit(1)
    }

    try {
        // Test 1: API Status
        console.log("\n🔍 Test 1: Checking API Status...")
        try {
            const status = await browseAiClient.getStatus()
            console.log("   ✅ API Status:", status)
        } catch (error: any) {
            console.error("   ❌ Failed to get API status:", error.message)
            throw error
        }

        // Test 2: List Robots
        console.log("\n🔍 Test 2: Listing Available Robots...")
        try {
            const robotsResponse = await browseAiClient.getRobots()
            const robots = robotsResponse.robots?.items || []
            console.log(`   ✅ Found ${robots.length} robot(s)`)
            
            if (robots.length > 0) {
                console.log("\n   Available Robots:")
                robots.forEach((robot: any) => {
                    const isCurrent = robotIds.includes(robot.id)
                    console.log(`   ${isCurrent ? "👉" : "  "} ${robot.name || "Unnamed"} (ID: ${robot.id})`)
                    if (isCurrent && robot.inputParameters) {
                        console.log(`      Required Parameters:`)
                        robot.inputParameters.forEach((param: any) => {
                            console.log(`        - ${param.name} (${param.type}): ${param.label || param.name}`)
                        })
                    }
                })
            } else {
                console.log("   ⚠️  No robots found. Create a robot in Browse AI dashboard.")
            }
        } catch (error: any) {
            console.error("   ❌ Failed to list robots:", error.message)
            // Don't throw - continue with robot task test
            console.log("   ⚠️  Continuing with robot task test anyway...")
        }

        // Test 3: Run Robot Task (test first robot only)
        console.log("\n🔍 Test 3: Running Robot Task...")
        const taskRobotId = robotIds[0] // Test first robot
        console.log(`   Testing Robot ID: ${taskRobotId} (1 of ${robotIds.length})`)
        
        // Get robot details to check required parameters
        let inputParameters: Record<string, unknown> = {}
        try {
            const robotsResponse = await browseAiClient.getRobots()
            const robots = robotsResponse.robots?.items || []
            const targetRobot = robots.find((r: any) => r.id === taskRobotId)
            
            if (targetRobot && targetRobot.inputParameters) {
                console.log("   📋 Robot requires input parameters:")
                targetRobot.inputParameters.forEach((param: any) => {
                    // Use default value if available
                    const value = param.defaultValue !== undefined ? param.defaultValue : 
                                  param.type === "number" ? 10 : 
                                  param.type === "url" ? "https://www.petrojobs.om/en-us/Pages/Home.aspx" :
                                  "test"
                    inputParameters[param.name] = value
                    console.log(`      - ${param.name}: ${value}`)
                })
            }
        } catch (e) {
            console.log("   ⚠️  Could not fetch robot details, proceeding without input parameters")
        }
        
        try {
            console.log("   Starting task...")
            const { result: task } = await browseAiClient.runRobotTask(taskRobotId, inputParameters)
            console.log(`   ✅ Task started successfully!`)
            console.log(`   Task ID: ${task.id}`)
            console.log(`   Initial Status: ${task.status}`)

            // Test 4: Wait for Task Completion
            console.log("\n🔍 Test 4: Waiting for Task Completion...")
            console.log("   (This may take 30-60 seconds depending on the robot)")
            
            const startTime = Date.now()
            const completedTask = await browseAiClient.waitForTaskCompletion(taskRobotId, task.id, 120000) // 2 minute timeout
            const duration = ((Date.now() - startTime) / 1000).toFixed(1)
            
            console.log(`   ✅ Task completed in ${duration} seconds!`)
            console.log(`   Final Status: ${completedTask.status}`)
            
            // Show captured data
            if (completedTask.capturedLists) {
                console.log("\n   📊 Captured Lists:")
                Object.keys(completedTask.capturedLists).forEach(key => {
                    const list = completedTask.capturedLists![key]
                    console.log(`      - ${key}: ${list.length} item(s)`)
                })
            }

            if (completedTask.capturedTexts) {
                console.log("\n   📝 Captured Texts:")
                Object.keys(completedTask.capturedTexts).forEach(key => {
                    const text = completedTask.capturedTexts![key]
                    console.log(`      - ${key}: ${text.substring(0, 100)}...`)
                })
            }

        } catch (error: any) {
            console.error("   ❌ Task failed:", error.message)
            throw error
        }

        // Test 5: Fetch Jobs using the actual function (tests all robots)
        console.log("\n🔍 Test 5: Fetching Jobs using fetchLatestJobs()...")
        console.log(`   This will fetch from all ${robotIds.length} configured robot(s)`)
        try {
            const jobs = await fetchLatestJobs()
            console.log(`   ✅ Successfully fetched ${jobs.length} unique job(s) from all robots`)

            if (jobs.length > 0) {
                console.log("\n   📋 Sample Jobs:")
                jobs.slice(0, 3).forEach((job, index) => {
                    console.log(`\n   ${index + 1}. ${job.title}`)
                    console.log(`      Company: ${job.company}`)
                    console.log(`      Location: ${job.location}`)
                    console.log(`      Type: ${job.jobType}`)
                    console.log(`      Description: ${job.shortDescription.substring(0, 80)}...`)
                    console.log(`      URL: ${job.sourceUrl}`)
                })

                if (jobs.length > 3) {
                    console.log(`\n   ... and ${jobs.length - 3} more job(s)`)
                }
            } else {
                console.log("   ⚠️  No jobs returned. Check your robot's output configuration.")
            }

            // Test normalization
            const normalizedJobs = normalizeJobs(jobs)
            console.log(`\n   ✅ Normalized ${normalizedJobs.length} job(s)`)

        } catch (error: any) {
            console.error("   ❌ Failed to fetch jobs:", error.message)
            throw error
        }

        console.log("\n" + "=".repeat(50))
        console.log("✅ All tests passed! Browse AI integration is working correctly.")
        console.log("=".repeat(50))

    } catch (error: any) {
        console.error("\n" + "=".repeat(50))
        console.error("❌ Test failed:", error.message)
        console.error("=".repeat(50))
        
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
            console.error("\n💡 Tip: Check that your BROWSEAI_API_KEY is correct")
        } else if (error.message.includes("404") || error.message.includes("Not Found")) {
            console.error("\n💡 Tip: Check that your BROWSEAI_ROBOT_ID is correct")
            console.error("   Run 'tsx scripts/list-robots.ts' to see available robots")
        } else if (error.message.includes("credits_limit_reached") || error.message.includes("credits")) {
            console.error("\n💡 Tip: Your Browse AI account has run out of credits.")
            console.error("   Please add credits to your Browse AI account at: https://www.browse.ai/")
            console.error("   The API integration is working correctly, but you need credits to run robots.")
        } else if (error.message.includes("timeout")) {
            console.error("\n💡 Tip: The robot task is taking longer than expected.")
            console.error("   This might be normal for complex scraping tasks.")
        }
        
        process.exit(1)
    }
}

testBrowseAI()

