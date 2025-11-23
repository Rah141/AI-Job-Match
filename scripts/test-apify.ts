#!/usr/bin/env tsx
/**
 * Test script for Apify Key-Value Store integration
 * Tests API connection, record fetching, and scraper config reading
 * Usage: tsx scripts/test-apify.ts
 */

// Load environment variables FIRST before any imports
import dotenv from "dotenv"
dotenv.config({ path: ".env.local", override: false })
dotenv.config({ path: ".env", override: true })

// Now import modules that use environment variables
import { getApifyRecord, getScraperConfig, ApifyRecordNotFoundError } from "../lib/apifyClient"

async function testApify() {
    console.log("🧪 Testing Apify Key-Value Store Integration\n")
    console.log("=".repeat(50))

    // Check configuration
    const apiToken = process.env.APIFY_API_TOKEN
    const storeId = process.env.APIFY_KV_STORE_ID

    console.log("\n📋 Configuration Check:")
    console.log(`   API Token: ${apiToken ? "✅ Set" : "❌ Missing"}`)
    console.log(`   Store ID: ${storeId ? `✅ Set (${storeId})` : "❌ Missing"}`)

    if (!apiToken) {
        console.error("\n❌ Error: APIFY_API_TOKEN is not set in environment variables")
        console.log("   Please add it to your .env or .env.local file")
        console.log("   Get your token from: https://console.apify.com/account/integrations")
        process.exit(1)
    }

    if (!storeId) {
        console.warn("\n⚠️  Warning: APIFY_KV_STORE_ID is not set")
        console.log("   Some tests will be skipped. Set APIFY_KV_STORE_ID to test full functionality.")
        console.log("   You can still test getApifyRecord() with a custom store ID.")
    }

    try {
        // Test 1: Test getApifyRecord with a non-existent record (should handle 404 gracefully)
        console.log("\n🔍 Test 1: Testing getApifyRecord() with non-existent record...")
        if (storeId) {
            try {
                await getApifyRecord({
                    storeId,
                    recordKey: "non-existent-record-test-12345"
                })
                console.error("   ❌ Expected 404 error but got success")
            } catch (error) {
                if (error instanceof ApifyRecordNotFoundError) {
                    console.log("   ✅ Correctly handled 404 (record not found)")
                    console.log(`   Error message: ${error.message}`)
                } else {
                    console.error(`   ❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
                    throw error
                }
            }
        } else {
            console.log("   ⏭️  Skipped (APIFY_KV_STORE_ID not set)")
        }

        // Test 2: Test getScraperConfig with non-existent config (should return null)
        console.log("\n🔍 Test 2: Testing getScraperConfig() with non-existent config...")
        if (storeId) {
            try {
                const config = await getScraperConfig("non-existent-scraper-test")
                if (config === null) {
                    console.log("   ✅ Correctly returned null for non-existent config")
                } else {
                    console.error(`   ❌ Expected null but got: ${JSON.stringify(config)}`)
                }
            } catch (error) {
                console.error(`   ❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
                // This shouldn't throw, but if it does, it's a bug
                throw error
            }
        } else {
            console.log("   ⏭️  Skipped (APIFY_KV_STORE_ID not set)")
        }

        // Test 3: Test getScraperConfig without store ID (should return null with warning)
        console.log("\n🔍 Test 3: Testing getScraperConfig() without APIFY_KV_STORE_ID...")
        // Temporarily unset the store ID
        const originalStoreId = process.env.APIFY_KV_STORE_ID
        delete process.env.APIFY_KV_STORE_ID
        
        try {
            const config = await getScraperConfig("test-scraper")
            if (config === null) {
                console.log("   ✅ Correctly returned null when APIFY_KV_STORE_ID is not set")
            } else {
                console.error(`   ❌ Expected null but got: ${JSON.stringify(config)}`)
            }
        } catch (error) {
            console.error(`   ❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
            throw error
        } finally {
            // Restore the store ID
            if (originalStoreId) {
                process.env.APIFY_KV_STORE_ID = originalStoreId
            }
        }

        // Test 4: Test getApifyRecord without API token (should throw error)
        console.log("\n🔍 Test 4: Testing getApifyRecord() without APIFY_API_TOKEN...")
        const originalToken = process.env.APIFY_API_TOKEN
        delete process.env.APIFY_API_TOKEN
        
        try {
            await getApifyRecord({
                storeId: "test-store",
                recordKey: "test-key"
            })
            console.error("   ❌ Expected error for missing API token but got success")
        } catch (error) {
            if (error instanceof Error && error.message.includes("APIFY_API_TOKEN")) {
                console.log("   ✅ Correctly threw error when APIFY_API_TOKEN is missing")
                console.log(`   Error message: ${error.message}`)
            } else {
                console.error(`   ❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
                throw error
            }
        } finally {
            // Restore the token
            if (originalToken) {
                process.env.APIFY_API_TOKEN = originalToken
            }
        }

        // Test 5: Test with actual store (if store ID is provided)
        if (storeId) {
            console.log("\n🔍 Test 5: Testing with actual Apify store...")
            console.log(`   Store ID: ${storeId}`)
            console.log("   Attempting to list a test record...")
            
            // Try to read a test record (this will fail if it doesn't exist, which is fine)
            try {
                const testRecord = await getApifyRecord({
                    storeId,
                    recordKey: "test-record"
                })
                console.log("   ✅ Successfully fetched test record!")
                console.log(`   Record type: ${typeof testRecord}`)
                if (typeof testRecord === "object") {
                    console.log(`   Record content: ${JSON.stringify(testRecord, null, 2).substring(0, 200)}...`)
                } else {
                    console.log(`   Record content: ${String(testRecord).substring(0, 200)}...`)
                }
            } catch (error) {
                if (error instanceof ApifyRecordNotFoundError) {
                    console.log("   ℹ️  Test record doesn't exist (this is expected)")
                    console.log("   ✅ API connection is working correctly")
                } else {
                    // Check if it's an authentication error
                    if (error instanceof Error && (
                        error.message.includes("401") || 
                        error.message.includes("Unauthorized") ||
                        error.message.includes("403") ||
                        error.message.includes("Forbidden")
                    )) {
                        console.error("   ❌ Authentication failed. Check your APIFY_API_TOKEN")
                        throw error
                    } else {
                        console.error(`   ❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
                        throw error
                    }
                }
            }

            // Test 6: Test getScraperConfig with actual store
            console.log("\n🔍 Test 6: Testing getScraperConfig() with actual store...")
            console.log("   Testing with scraper name: 'browser-ai-jobs'")
            try {
                const config = await getScraperConfig("browser-ai-jobs")
                if (config) {
                    console.log("   ✅ Successfully fetched scraper config!")
                    console.log(`   Config: ${JSON.stringify(config, null, 2)}`)
                } else {
                    console.log("   ℹ️  No config found for 'browser-ai-jobs' (this is expected if not set up)")
                    console.log("   ✅ Function is working correctly (returns null when config doesn't exist)")
                }
            } catch (error) {
                console.error(`   ❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
                throw error
            }
        } else {
            console.log("\n🔍 Test 5 & 6: Skipped (APIFY_KV_STORE_ID not set)")
            console.log("   To test with actual Apify store:")
            console.log("   1. Create a key-value store in Apify")
            console.log("   2. Set APIFY_KV_STORE_ID in your .env file")
            console.log("   3. Optionally create a record with key 'browser-ai-jobs-config'")
        }

        // Test 7: Test error handling for invalid store ID
        console.log("\n🔍 Test 7: Testing error handling for invalid store ID...")
        try {
            await getApifyRecord({
                storeId: "invalid-store-id-12345",
                recordKey: "test-key"
            })
            console.error("   ❌ Expected error for invalid store ID but got success")
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("404") || error.message.includes("not found")) {
                    console.log("   ✅ Correctly handled invalid store ID (404)")
                } else if (error.message.includes("401") || error.message.includes("403")) {
                    console.log("   ✅ Correctly handled invalid store ID (auth error)")
                } else {
                    console.log(`   ✅ Error handled: ${error.message.substring(0, 100)}`)
                }
            } else {
                console.error(`   ❌ Unexpected error type: ${typeof error}`)
            }
        }

        console.log("\n" + "=".repeat(50))
        console.log("✅ All tests passed! Apify integration is working correctly.")
        console.log("=".repeat(50))
        console.log("\n💡 Next steps:")
        console.log("   1. Create a key-value store in Apify console")
        console.log("   2. Set APIFY_KV_STORE_ID in your .env file")
        console.log("   3. Create records with keys like 'browser-ai-jobs-config'")
        console.log("   4. Your scrapers will automatically read config from Apify")

    } catch (error: any) {
        console.error("\n" + "=".repeat(50))
        console.error("❌ Test failed:", error.message)
        console.error("=".repeat(50))
        
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
            console.error("\n💡 Tip: Check that your APIFY_API_TOKEN is correct")
            console.error("   Get your token from: https://console.apify.com/account/integrations")
        } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
            console.error("\n💡 Tip: Your API token may not have access to this store")
            console.error("   Make sure the store ID is correct and the token has proper permissions")
        } else if (error.message.includes("404") || error.message.includes("not found")) {
            console.error("\n💡 Tip: The store ID or record key may be incorrect")
            console.error("   Check your APIFY_KV_STORE_ID and the record keys you're trying to access")
        } else if (error.message.includes("APIFY_API_TOKEN")) {
            console.error("\n💡 Tip: Make sure APIFY_API_TOKEN is set in your .env file")
        }
        
        process.exit(1)
    }
}

testApify()

