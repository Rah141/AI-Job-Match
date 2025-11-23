#!/usr/bin/env tsx
import "dotenv/config"

const BASE_URL = "http://localhost:3000"

async function test() {
  try {
    console.log("Testing POST /api/auth/signup...")
    const response = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test User",
        email: `test-${Date.now()}@example.com`,
        password: "TestPassword123!",
      }),
    })
    
    const contentType = response.headers.get("content-type")
    let text: string
    let json: any
    
    if (contentType?.includes("application/json")) {
      json = await response.json()
      text = JSON.stringify(json, null, 2)
    } else {
      text = await response.text()
    }
    
    console.log(`Status: ${response.status}`)
    console.log(`Content-Type: ${contentType}`)
    console.log(`Response: ${text.substring(0, 1000)}`)
    
    if (response.status === 201) {
      console.log("✅ Success!")
    } else if (json?.error || json?.message) {
      console.log(`❌ Failed: ${json.error || json.message}`)
      if (json.stack) {
        console.log(`Stack: ${json.stack.substring(0, 500)}`)
      }
    } else {
      console.log("❌ Failed")
    }
  } catch (error: any) {
    console.error("Error:", error.message)
  }
}

test()

