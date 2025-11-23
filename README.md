This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

This project requires several environment variables. Create a `.env` file in the root directory with the following:

### Required Variables
- `DATABASE_URL` - Database connection string
- `OPENAI_API_KEY` - OpenAI API key (must start with `sk-`)
- `NEXTAUTH_SECRET` - Secret for NextAuth.js (at least 32 characters)
- `NEXTAUTH_URL` - Base URL for the application (default: `http://localhost:3000`)

### Optional Variables
- `BROWSEAI_API_KEY` - Browser AI API key for web scraping
- `BROWSEAI_ROBOT_IDS` - Comma-separated list of Browser AI robot IDs
- `BROWSEAI_ROBOT_ID` - Single Browser AI robot ID (fallback)
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL (for rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST token
- `APIFY_API_TOKEN` - Apify API token for reading from key-value stores
- `APIFY_KV_STORE_ID` - Apify key-value store ID for scraper configuration

## Apify Integration

This project includes integration with Apify key-value stores, allowing scrapers to read configuration and state from Apify before running. This enables dynamic configuration without code changes.

### Setup

1. **Get your Apify API token:**
   - Sign up at [Apify](https://apify.com)
   - Go to Settings → Integrations → API tokens
   - Create a new token and copy it

2. **Create a key-value store:**
   - In your Apify account, create a new key-value store
   - Note the store ID (found in the store URL or settings)

3. **Set environment variables:**
   ```bash
   APIFY_API_TOKEN=your_apify_token_here
   APIFY_KV_STORE_ID=your_store_id_here
   ```

### Usage

#### Reading Scraper Configuration

The `getScraperConfig()` helper function automatically reads configuration from Apify using a naming convention:

```typescript
import { getScraperConfig } from "@/lib/apifyClient"

// This will look for a record named "my-scraper-config" in your Apify store
const config = await getScraperConfig("my-scraper")
if (config) {
  console.log("Using config from Apify:", config)
  // Use config.robotIds, config.batchSize, etc.
}
```

The function returns `null` if:
- `APIFY_KV_STORE_ID` is not set
- The record doesn't exist (404)
- There's a network error (allows scraper to continue with defaults)

#### Reading Custom Records

For more control, use `getApifyRecord()` directly:

```typescript
import { getApifyRecord } from "@/lib/apifyClient"

const record = await getApifyRecord({
  storeId: "abc123",
  recordKey: "my-custom-record"
})
```

**Note:** `getApifyRecord()` will throw an error if `APIFY_API_TOKEN` is missing or if the request fails (except 404, which is handled gracefully by `getScraperConfig()`).

### Example: Storing Configuration in Apify

1. In your Apify key-value store, create a record with key `browser-ai-jobs-config`
2. Store JSON configuration, for example:
   ```json
   {
     "robotIds": ["robot-1", "robot-2"],
     "batchSize": 20,
     "timeout": 60000
   }
   ```
3. The scraper will automatically read this configuration when it runs

### Error Handling

The integration is designed to be non-blocking:
- If Apify is unavailable, scrapers continue with default configuration
- Missing configuration records are logged but don't stop execution
- Only missing `APIFY_API_TOKEN` (when using `getApifyRecord()` directly) will throw an error

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
