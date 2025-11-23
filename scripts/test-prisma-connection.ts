#!/usr/bin/env tsx
import "dotenv/config"
import { prisma } from "../lib/prisma"

async function test() {
  try {
    console.log("Testing Prisma connection...")
    await prisma.$connect()
    console.log("✅ Prisma connected successfully")
    
    // Try a simple query
    const userCount = await prisma.user.count()
    console.log(`✅ Database query successful. User count: ${userCount}`)
    
    await prisma.$disconnect()
  } catch (error: any) {
    console.error("❌ Prisma connection failed:")
    console.error(error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

test()

