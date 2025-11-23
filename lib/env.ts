import { z } from "zod"

/**
 * Environment variable validation schema
 * Validates all required environment variables on startup
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // OpenAI
  OPENAI_API_KEY: z.string().startsWith("sk-", "OPENAI_API_KEY must start with 'sk-'"),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").default("http://localhost:3000"),
  
  // Browse AI (optional)
  BROWSEAI_API_KEY: z.string().optional(),
  BROWSEAI_ROBOT_IDS: z.string().optional(),
  BROWSEAI_ROBOT_ID: z.string().optional(),
  
  // Rate limiting (optional - for production with Redis)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Apify (optional - for reading config/state from Apify key-value stores)
  APIFY_API_TOKEN: z.string().optional(),
  APIFY_KV_STORE_ID: z.string().optional(),
})

/**
 * Validated environment variables
 * Throws error on startup if validation fails
 */
export const env = (() => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join("\n")
      throw new Error(
        `❌ Environment variable validation failed:\n${missingVars}\n\n` +
        `Please check your .env file and ensure all required variables are set.`
      )
    }
    throw error
  }
})()

// Export individual variables for convenience
export const {
  NODE_ENV,
  DATABASE_URL,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  NEXTAUTH_SECRET,
  NEXTAUTH_URL,
  BROWSEAI_API_KEY,
  BROWSEAI_ROBOT_IDS,
  BROWSEAI_ROBOT_ID,
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
  APIFY_API_TOKEN,
  APIFY_KV_STORE_ID,
} = env

