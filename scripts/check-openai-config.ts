import dotenv from "dotenv"
import OpenAI from "openai"

// Load environment variables
// dotenv.config() automatically looks for .env in the current working directory
const result = dotenv.config()

if (result.error) {
    // Only warn if it's not a "file not found" error (which is expected if .env doesn't exist)
    const errorCode = (result.error as any).code
    if (errorCode && errorCode !== "ENOENT") {
        console.warn("⚠️  Warning: Could not load .env file:", result.error.message)
    }
}

async function checkConfig() {
    console.log("🔍 Checking OpenAI Configuration...\n")

    // Check for .env files
    const fs = require("fs")
    const envFiles = [".env", ".env.local", ".env.development", ".env.production"]
    
    console.log("📁 Checking for environment files:")
    envFiles.forEach(file => {
        const exists = fs.existsSync(file)
        console.log(`  ${exists ? "✅" : "❌"} ${file}`)
    })

    // Check API key
    console.log("\n🔑 Checking API Key:")
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || apiKey.trim() === "" || apiKey === '""' || apiKey === "''") {
        console.log("  ❌ OPENAI_API_KEY is not set or is empty")
        console.log("\n💡 Solutions:")
        console.log("  1. Open your .env file")
        console.log("  2. Replace the empty value with your actual API key:")
        console.log("     OPENAI_API_KEY=sk-your-actual-key-here")
        console.log("  3. Make sure there are NO quotes around the key value")
        console.log("  4. For Next.js, you may also need .env.local")
        console.log("\n📝 Current .env value:", process.env.OPENAI_API_KEY || "(empty)")
        process.exit(1)
    } else {
        // Mask the API key for security
        const maskedKey = apiKey.substring(0, 7) + "..." + apiKey.substring(apiKey.length - 4)
        console.log(`  ✅ API Key found: ${maskedKey}`)
        console.log(`  📏 Key length: ${apiKey.length} characters`)
        
        // Validate key format
        if (!apiKey.startsWith("sk-")) {
            console.log("  ⚠️  Warning: API key should start with 'sk-'")
        }
    }

    // Check model
    const model = process.env.OPENAI_MODEL || "gpt-4o"
    console.log(`\n🤖 Model: ${model}`)

    // Test OpenAI client initialization
    console.log("\n🧪 Testing OpenAI Client Initialization:")
    try {
        const openai = new OpenAI({
            apiKey: apiKey,
        })

        // Try a simple API call to verify the key works
        console.log("  🔄 Testing API connection...")
        const models = await openai.models.list()
        console.log("  ✅ OpenAI client initialized successfully")
        console.log(`  ✅ API connection successful (found ${models.data.length} models)`)
        
        console.log("\n✨ All checks passed! Your configuration looks good.")
        
    } catch (error: any) {
        console.log("  ❌ OpenAI client initialization failed")
        console.error("\n❌ Error Details:")
        console.error("  Message:", error?.message || "Unknown error")
        console.error("  Status:", error?.status || "N/A")
        console.error("  Code:", error?.code || "N/A")
        console.error("  Type:", error?.type || "N/A")
        
        if (error?.status === 401) {
            console.error("\n💡 This usually means:")
            console.error("  - Your API key is invalid or expired")
            console.error("  - Your API key doesn't have the right permissions")
        } else if (error?.status === 429) {
            console.error("\n💡 This usually means:")
            console.error("  - You've hit your rate limit")
            console.error("  - You need to add credits to your OpenAI account")
        }
        
        process.exit(1)
    }
}

checkConfig()

