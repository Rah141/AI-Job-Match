#!/usr/bin/env tsx
/**
 * Generate a secure NEXTAUTH_SECRET for your .env file
 * Usage: tsx scripts/generate-nextauth-secret.ts
 */

import crypto from "crypto"

function generateSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString("base64")
}

console.log("🔐 Generating NEXTAUTH_SECRET\n")
console.log("=".repeat(60))

const secret = generateSecret(32)
console.log("\n✅ Generated NEXTAUTH_SECRET (32+ characters):")
console.log("\n" + secret)
console.log("\n" + "=".repeat(60))
console.log("\n💡 Add this to your .env file:")
console.log(`\nNEXTAUTH_SECRET="${secret}"`)
console.log("\n⚠️  Keep this secret secure and never commit it to version control!")
console.log("")

