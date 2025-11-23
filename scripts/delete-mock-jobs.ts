#!/usr/bin/env tsx
import "dotenv/config"
import { prisma } from "../lib/prisma"

async function deleteMockJobs() {
    try {
        console.log("🔍 Searching for mock jobs in database...")
        await prisma.$connect()
        
        // Find all mock jobs - those with "(Mock)" in title or "example.com" in sourceUrl
        const mockJobs = await prisma.job.findMany({
            where: {
                OR: [
                    { title: { contains: "(Mock)" } },
                    { sourceUrl: { contains: "example.com" } }
                ]
            },
            include: {
                applications: {
                    select: { id: true }
                }
            }
        })

        if (mockJobs.length === 0) {
            console.log("✅ No mock jobs found in database")
            await prisma.$disconnect()
            return
        }

        console.log(`\n📋 Found ${mockJobs.length} mock job(s):`)
        mockJobs.forEach((job, index) => {
            console.log(`\n${index + 1}. ${job.title}`)
            console.log(`   Company: ${job.company}`)
            console.log(`   Location: ${job.location}`)
            console.log(`   Source URL: ${job.sourceUrl || "N/A"}`)
            console.log(`   Applications: ${job.applications.length}`)
        })

        // Check if any have applications
        const jobsWithApplications = mockJobs.filter(job => job.applications.length > 0)
        if (jobsWithApplications.length > 0) {
            console.log(`\n⚠️  Warning: ${jobsWithApplications.length} mock job(s) have associated applications.`)
            console.log("   These applications will also be deleted.")
        }

        // Delete all mock jobs (applications will be deleted due to foreign key constraints)
        const jobIds = mockJobs.map(job => job.id)
        
        // First delete applications associated with these jobs
        const deletedApplications = await prisma.application.deleteMany({
            where: {
                jobId: { in: jobIds }
            }
        })

        // Then delete the jobs
        const deletedJobs = await prisma.job.deleteMany({
            where: {
                id: { in: jobIds }
            }
        })

        console.log(`\n✅ Successfully deleted:`)
        console.log(`   - ${deletedJobs.count} mock job(s)`)
        console.log(`   - ${deletedApplications.count} application(s)`)

        await prisma.$disconnect()
    } catch (error: any) {
        console.error("❌ Error deleting mock jobs:")
        console.error(error.message)
        console.error(error.stack)
        await prisma.$disconnect()
        process.exit(1)
    }
}

deleteMockJobs()

