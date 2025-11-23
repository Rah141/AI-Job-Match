import { syncJobsToDatabase, getJobsFromDatabase } from "@/lib/jobSync"

async function testJobSync() {
    console.log("🧪 Testing Job Sync\n")
    
    try {
        // Step 1: Sync jobs
        console.log("Step 1: Syncing jobs from Browser AI...")
        const syncResult = await syncJobsToDatabase()
        console.log(`✅ Sync completed:`)
        console.log(`   - Created: ${syncResult.created}`)
        console.log(`   - Updated: ${syncResult.updated}`)
        console.log(`   - Total: ${syncResult.total}`)
        if (syncResult.errors.length > 0) {
            console.log(`   - Errors: ${syncResult.errors.length}`)
            syncResult.errors.forEach(err => console.log(`     - ${err}`))
        }

        // Step 2: Verify jobs in database
        console.log("\nStep 2: Verifying jobs in database...")
        const jobs = await getJobsFromDatabase({ limit: 10 })
        console.log(`✅ Found ${jobs.length} jobs in database`)

        if (jobs.length > 0) {
            console.log("\n📋 Sample Jobs:")
            jobs.slice(0, 3).forEach((job, index) => {
                console.log(`\n${index + 1}. ${job.title}`)
                console.log(`   Company: ${job.company}`)
                console.log(`   Location: ${job.location}`)
                console.log(`   ID: ${job.id}`)
                console.log(`   Posted: ${job.postedAt}`)
            })
        }

        console.log("\n✅ Job sync test completed successfully!")
    } catch (error: any) {
        console.error("❌ Test failed:", error.message)
        process.exit(1)
    }
}

testJobSync()

