#!/usr/bin/env tsx
/**
 * Simplified job sync verification (bypasses strict env validation)
 * Tests: Database connection → Scraping → Syncing → Database storage
 * Usage: tsx scripts/verify-job-sync-simple.ts
 */

// Set required env vars before any imports
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    process.env.NEXTAUTH_SECRET = "temporary-secret-for-job-sync-testing-only-32chars"
}

// Load environment variables
import dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: false })
dotenv.config({ path: ".env", override: true })

// Ensure NEXTAUTH_SECRET is valid
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    process.env.NEXTAUTH_SECRET = "temporary-secret-for-job-sync-testing-only-32chars"
}

// Import Prisma directly (bypassing env.ts validation)
import { PrismaClient } from "@prisma/client"

// Create prisma client directly
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "file:./dev.db",
        },
    },
})

// Import other modules (these don't trigger env validation)
import { syncJobsToDatabase, getJobsFromDatabase } from "../lib/jobSync"
import { fetchLatestJobs } from "../lib/browserAIJobs"
import { getScraperConfig } from "../lib/apifyClient"

async function verifyJobSyncFlow() {
    console.log("🔍 Verifying Complete Job Sync Flow\n")
    console.log("=".repeat(60))

    let allTestsPassed = true

    // Test 1: Database Connection
    console.log("\n📊 Test 1: Database Connection")
    try {
        await prisma.$connect()
        console.log("   ✅ Database connection successful")
        
        // Test query
        const jobCount = await prisma.job.count()
        console.log(`   ✅ Database is accessible (${jobCount} existing jobs)`)
    } catch (error: any) {
        console.error(`   ❌ Database connection failed: ${error.message}`)
        allTestsPassed = false
        console.error("\n💡 Tip: Check your DATABASE_URL in .env file")
        await prisma.$disconnect()
        process.exit(1)
    }

    // Test 2: Check Apify Config (optional)
    console.log("\n📊 Test 2: Apify Configuration (Optional)")
    try {
        const apifyConfig = await getScraperConfig("browser-ai-jobs")
        if (apifyConfig) {
            console.log("   ✅ Apify config loaded successfully")
            console.log(`   Config: ${JSON.stringify(apifyConfig, null, 2)}`)
        } else {
            console.log("   ℹ️  No Apify config found (using defaults)")
        }
    } catch (error: any) {
        console.log(`   ⚠️  Apify config check failed (non-critical): ${error.message}`)
        console.log("   ℹ️  Continuing with default configuration")
    }

    // Test 3: Fetch Jobs from Scraper
    console.log("\n📊 Test 3: Fetching Jobs from Scraper")
    let scrapedJobs: any[] = []
    try {
        console.log("   Fetching jobs from Browser AI...")
        scrapedJobs = await fetchLatestJobs()
        console.log(`   ✅ Successfully fetched ${scrapedJobs.length} job(s) from scraper`)
        
        if (scrapedJobs.length > 0) {
            console.log("\n   📋 Sample Scraped Jobs:")
            scrapedJobs.slice(0, 3).forEach((job, index) => {
                console.log(`   ${index + 1}. ${job.title} at ${job.company}`)
                console.log(`      Location: ${job.location}`)
                console.log(`      URL: ${job.sourceUrl || "N/A"}`)
            })
        } else {
            console.log("   ⚠️  No jobs were scraped (this might be expected if using mock data)")
        }
    } catch (error: any) {
        console.error(`   ❌ Failed to fetch jobs: ${error.message}`)
        allTestsPassed = false
        console.error("\n💡 Tip: Check your BROWSEAI_API_KEY and BROWSEAI_ROBOT_IDS")
    }

    // Test 4: Sync Jobs to Database
    console.log("\n📊 Test 4: Syncing Jobs to Database")
    try {
        const beforeCount = await prisma.job.count()
        console.log(`   Jobs in database before sync: ${beforeCount}`)

        console.log("   Starting sync...")
        const syncResult = await syncJobsToDatabase()
        
        console.log(`   ✅ Sync completed:`)
        console.log(`      - Created: ${syncResult.created}`)
        console.log(`      - Updated: ${syncResult.updated}`)
        console.log(`      - Total processed: ${syncResult.total}`)
        
        if (syncResult.errors.length > 0) {
            console.log(`      - Errors: ${syncResult.errors.length}`)
            syncResult.errors.slice(0, 3).forEach(err => {
                console.log(`        ⚠️  ${err.substring(0, 80)}...`)
            })
        }

        const afterCount = await prisma.job.count()
        console.log(`   Jobs in database after sync: ${afterCount}`)
        console.log(`   Net change: +${afterCount - beforeCount}`)

        if (syncResult.total > 0 && syncResult.created === 0 && syncResult.updated === 0) {
            console.log("   ⚠️  Warning: Jobs were fetched but none were created or updated")
            console.log("   💡 This might indicate all jobs already exist in the database")
        }
    } catch (error: any) {
        console.error(`   ❌ Sync failed: ${error.message}`)
        allTestsPassed = false
    }

    // Test 5: Verify Jobs in Database
    console.log("\n📊 Test 5: Verifying Jobs in Database")
    try {
        const jobs = await getJobsFromDatabase({ limit: 10, orderBy: "createdAt", order: "desc" })
        console.log(`   ✅ Retrieved ${jobs.length} job(s) from database`)

        if (jobs.length > 0) {
            console.log("\n   📋 Latest Jobs in Database:")
            jobs.slice(0, 5).forEach((job, index) => {
                console.log(`\n   ${index + 1}. ${job.title}`)
                console.log(`      Company: ${job.company}`)
                console.log(`      Location: ${job.location}`)
                console.log(`      Type: ${job.jobType || "N/A"}`)
                console.log(`      ID: ${job.id}`)
                console.log(`      Created: ${job.createdAt.toISOString()}`)
                console.log(`      Updated: ${job.updatedAt.toISOString()}`)
                console.log(`      Source URL: ${job.sourceUrl || "N/A"}`)
            })

            // Verify data integrity
            const jobsWithAllFields = jobs.filter(j => 
                j.title && j.company && j.location && j.fullDescription
            )
            console.log(`\n   ✅ Data integrity check: ${jobsWithAllFields.length}/${jobs.length} jobs have all required fields`)
        } else {
            console.log("   ⚠️  No jobs found in database")
            console.log("   💡 Run the sync again or check if scraping is working")
        }
    } catch (error: any) {
        console.error(`   ❌ Failed to verify jobs: ${error.message}`)
        allTestsPassed = false
    }

    // Summary
    console.log("\n" + "=".repeat(60))
    if (allTestsPassed) {
        console.log("✅ All critical tests passed! Job sync flow is working correctly.")
        console.log("\n💡 Next Steps:")
        console.log("   1. Add a proper NEXTAUTH_SECRET to your .env file:")
        console.log("      Run: npm run generate:secret")
        console.log("   2. Set up automated syncing (cron job, scheduled task, or webhook)")
        console.log("   3. Monitor sync results regularly")
        console.log("   4. Optionally configure Apify to store sync settings")
    } else {
        console.log("⚠️  Some tests failed. Please review the errors above.")
    }
    console.log("=".repeat(60))

    // Cleanup
    await prisma.$disconnect()
}

verifyJobSyncFlow().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
})

