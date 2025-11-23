#!/usr/bin/env tsx
/**
 * Test script for Apify Actors integration
 * Tests API connection, lists actors, and fetches jobs from actor runs
 * Usage: tsx scripts/test-apify-actors.ts
 */

// Load environment variables FIRST before any imports
import dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: false })
dotenv.config({ path: ".env", override: true })

// Set temporary NEXTAUTH_SECRET if needed
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    process.env.NEXTAUTH_SECRET = "temporary-secret-for-apify-testing-only-32chars"
}

// Import modules
import { PrismaClient } from "@prisma/client"
import { 
    listActors, 
    getActor, 
    listActorRuns, 
    getLatestSuccessfulRun,
    fetchJobsFromApifyActors,
    normalizeApifyJob
} from "../lib/apifyActors"
import { syncJobsToDatabase } from "../lib/jobSync"

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "file:./dev.db",
        },
    },
})

async function testApifyActors() {
    console.log("🧪 Testing Apify Actors Integration\n")
    console.log("=".repeat(60))

    // Check configuration
    const apiToken = process.env.APIFY_API_TOKEN
    const actorIds = process.env.APIFY_ACTOR_IDS ? process.env.APIFY_ACTOR_IDS.split(",").map(id => id.trim()) : []

    console.log("\n📋 Configuration Check:")
    console.log(`   API Token: ${apiToken ? "✅ Set" : "❌ Missing"}`)
    console.log(`   Actor IDs: ${actorIds.length > 0 ? `✅ ${actorIds.length} actor(s) configured` : "ℹ️  Not set (will check all actors)"}`)
    if (actorIds.length > 0) {
        actorIds.forEach((id, index) => {
            console.log(`      ${index + 1}. ${id}`)
        })
    }

    if (!apiToken) {
        console.error("\n❌ Error: APIFY_API_TOKEN is not set in environment variables")
        console.log("   Please add it to your .env or .env.local file")
        console.log("   Get your token from: https://console.apify.com/account/integrations")
        await prisma.$disconnect()
        process.exit(1)
    }

    try {
        // Test 1: List Actors
        console.log("\n🔍 Test 1: Listing Apify Actors...")
        let actors = []
        if (actorIds.length > 0) {
            console.log(`   Fetching details for ${actorIds.length} configured actor(s)...`)
            actors = await Promise.all(actorIds.map(id => getActor(id)))
        } else {
            console.log("   Fetching all actors...")
            actors = await listActors()
        }
        
        console.log(`   ✅ Found ${actors.length} actor(s)`)
        actors.forEach((actor, index) => {
            console.log(`\n   ${index + 1}. ${actor.name}`)
            console.log(`      ID: ${actor.id}`)
            console.log(`      Username: ${actor.username}`)
        })

        if (actors.length === 0) {
            console.log("\n⚠️  No actors found. Create actors in Apify console first.")
            await prisma.$disconnect()
            return
        }

        // Test 2: Check Actor Runs
        console.log("\n🔍 Test 2: Checking Actor Runs...")
        for (const actor of actors) {
            try {
                const runs = await listActorRuns(actor.id, 5)
                console.log(`\n   ${actor.name}:`)
                console.log(`      Total runs found: ${runs.length}`)
                
                if (runs.length > 0) {
                    const successfulRuns = runs.filter(r => r.status === "SUCCEEDED")
                    console.log(`      Successful runs: ${successfulRuns.length}`)
                    
                    if (successfulRuns.length > 0) {
                        const latest = successfulRuns[0]
                        console.log(`      Latest successful run: ${latest.id}`)
                        console.log(`      Finished: ${latest.finishedAt || "N/A"}`)
                        if (latest.defaultDatasetId) {
                            console.log(`      Dataset ID: ${latest.defaultDatasetId}`)
                        }
                        if (latest.defaultKeyValueStoreId) {
                            console.log(`      Key-Value Store ID: ${latest.defaultKeyValueStoreId}`)
                        }
                    }
                } else {
                    console.log(`      ⚠️  No runs found for this actor`)
                }
            } catch (error) {
                console.error(`      ❌ Error checking runs: ${error instanceof Error ? error.message : String(error)}`)
            }
        }

        // Test 3: Fetch Jobs from Actors
        console.log("\n🔍 Test 3: Fetching Jobs from Apify Actors...")
        const actorIdsToCheck = actorIds.length > 0 ? actorIds : undefined
        
        // Also check what's in the key-value store directly
        if (actors.length > 0) {
            const latestRun = await getLatestSuccessfulRun(actors[0].id)
            if (latestRun?.defaultKeyValueStoreId) {
                console.log(`\n   🔍 Inspecting key-value store records...`)
                const { listKeyValueStoreRecords } = await import("../lib/apifyActors")
                const records = await listKeyValueStoreRecords(latestRun.defaultKeyValueStoreId)
                
                console.log(`   Found ${Object.keys(records).length} record(s):`)
                for (const [key, value] of Object.entries(records)) {
                    console.log(`\n   Key: ${key}`)
                    if (Array.isArray(value)) {
                        console.log(`   Type: Array with ${value.length} items`)
                        if (value.length > 0) {
                            console.log(`   First item: ${JSON.stringify(value[0], null, 2).substring(0, 200)}...`)
                        }
                    } else if (value && typeof value === "object") {
                        console.log(`   Type: Object`)
                        console.log(`   Keys: ${Object.keys(value).join(", ")}`)
                        console.log(`   Sample: ${JSON.stringify(value, null, 2).substring(0, 300)}...`)
                    } else {
                        console.log(`   Type: ${typeof value}`)
                        console.log(`   Value: ${String(value).substring(0, 200)}...`)
                    }
                }
            }
        }
        
        const rawJobs = await fetchJobsFromApifyActors(actorIdsToCheck)
        
        console.log(`\n   ✅ Found ${rawJobs.length} raw job item(s) from Apify`)

        // Test 4: Normalize Jobs
        console.log("\n🔍 Test 4: Normalizing Jobs...")
        const normalizedJobs = rawJobs
            .map(job => normalizeApifyJob(job))
            .filter(job => job !== null)

        console.log(`   ✅ Normalized ${normalizedJobs.length} job(s)`)
        
        if (normalizedJobs.length > 0) {
            console.log("\n   📋 Sample Normalized Jobs:")
            normalizedJobs.slice(0, 5).forEach((job, index) => {
                console.log(`\n   ${index + 1}. ${job!.title}`)
                console.log(`      Company: ${job!.company}`)
                console.log(`      Location: ${job!.location}`)
                console.log(`      Type: ${job!.jobType}`)
                console.log(`      URL: ${job!.sourceUrl}`)
            })
        }

        // Test 5: Sync Jobs to Database
        if (normalizedJobs.length > 0) {
            console.log("\n🔍 Test 5: Syncing Jobs to Database...")
            try {
                const beforeCount = await prisma.job.count()
                console.log(`   Jobs in database before sync: ${beforeCount}`)

                // Create a temporary sync function that uses Apify jobs
                let created = 0
                let updated = 0
                const errors: string[] = []

                for (const job of normalizedJobs) {
                    if (!job) continue
                    
                    try {
                        const existingJob = await prisma.job.findFirst({
                            where: {
                                OR: [
                                    { sourceUrl: job.sourceUrl },
                                    ...(job.sourceUrl === "#" || !job.sourceUrl ? [{
                                        title: job.title,
                                        company: job.company,
                                        location: job.location,
                                    }] : [])
                                ]
                            }
                        })

                        if (existingJob) {
                            await prisma.job.update({
                                where: { id: existingJob.id },
                                data: {
                                    title: job.title,
                                    company: job.company,
                                    location: job.location,
                                    jobType: job.jobType,
                                    shortDescription: job.shortDescription,
                                    fullDescription: job.fullDescription,
                                    sourceUrl: job.sourceUrl || existingJob.sourceUrl,
                                    updatedAt: new Date(),
                                }
                            })
                            updated++
                        } else {
                            await prisma.job.create({
                                data: {
                                    title: job.title,
                                    company: job.company,
                                    location: job.location,
                                    jobType: job.jobType,
                                    shortDescription: job.shortDescription,
                                    fullDescription: job.fullDescription,
                                    sourceUrl: job.sourceUrl || null,
                                    postedAt: new Date(),
                                }
                            })
                            created++
                        }
                    } catch (error: any) {
                        errors.push(`Error syncing job "${job.title}": ${error.message}`)
                    }
                }

                const afterCount = await prisma.job.count()
                console.log(`   ✅ Sync completed:`)
                console.log(`      - Created: ${created}`)
                console.log(`      - Updated: ${updated}`)
                console.log(`      - Total processed: ${normalizedJobs.length}`)
                if (errors.length > 0) {
                    console.log(`      - Errors: ${errors.length}`)
                }
                console.log(`   Jobs in database after sync: ${afterCount}`)
                console.log(`   Net change: +${afterCount - beforeCount}`)
            } catch (error) {
                console.error(`   ❌ Sync failed: ${error instanceof Error ? error.message : String(error)}`)
            }
        } else {
            console.log("\n   ⚠️  No jobs to sync (no normalized jobs found)")
        }

        console.log("\n" + "=".repeat(60))
        console.log("✅ Apify Actors integration test completed!")
        console.log("=".repeat(60))
        console.log("\n💡 Next Steps:")
        console.log("   1. Configure APIFY_ACTOR_IDS in .env to specify which actors to check")
        console.log("   2. Ensure your actors are storing jobs in datasets or key-value stores")
        console.log("   3. Run this script regularly or set up automated syncing")

    } catch (error: any) {
        console.error("\n" + "=".repeat(60))
        console.error("❌ Test failed:", error.message)
        console.error("=".repeat(60))
        
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
            console.error("\n💡 Tip: Check that your APIFY_API_TOKEN is correct")
            console.error("   Get your token from: https://console.apify.com/account/integrations")
        } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
            console.error("\n💡 Tip: Your API token may not have access to these actors")
        } else if (error.message.includes("404") || error.message.includes("not found")) {
            console.error("\n💡 Tip: Check that your actor IDs are correct")
        }
        
        await prisma.$disconnect()
        process.exit(1)
    }

    await prisma.$disconnect()
}

testApifyActors().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
})

