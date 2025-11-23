# Job Sync Setup Guide

This guide explains how to ensure scraped jobs are properly saved to the database.

## Current Flow

The system is already set up with the following flow:

1. **Scraping** → `fetchLatestJobs()` in `lib/browserAIJobs.ts`
   - Fetches jobs from Browser AI robots
   - Optionally reads configuration from Apify key-value store
   - Returns array of scraped jobs

2. **Syncing** → `syncJobsToDatabase()` in `lib/jobSync.ts`
   - Takes scraped jobs and saves them to the database
   - Handles deduplication (by sourceUrl or title+company+location)
   - Creates new jobs or updates existing ones
   - Optionally uses Apify config for batch size settings

3. **Storage** → SQLite database via Prisma
   - Jobs are stored in the `Job` table
   - All fields are properly indexed for performance

## Quick Start

### 1. Verify Environment Variables

Make sure your `.env` file has all required variables:

```bash
# Required
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."
NEXTAUTH_SECRET="your-secret-at-least-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# Optional (for scraping)
BROWSEAI_API_KEY="your-browseai-key"
BROWSEAI_ROBOT_IDS="robot-id-1,robot-id-2"

# Optional (for Apify config)
APIFY_API_TOKEN="your-apify-token"
APIFY_KV_STORE_ID="your-store-id"
```

### 2. Verify Database Connection

```bash
npm run verify:job-sync
```

This comprehensive script will:
- ✅ Test database connection
- ✅ Check Apify configuration (optional)
- ✅ Fetch jobs from scraper
- ✅ Sync jobs to database
- ✅ Verify jobs are stored correctly
- ✅ Test deduplication logic

### 3. Manual Sync

You can trigger a sync manually via:

**API Endpoint:**
```bash
# POST request
curl -X POST http://localhost:3000/api/jobs/sync

# Or GET request
curl http://localhost:3000/api/jobs/sync
```

**Or use the test script:**
```bash
npm run test:job-sync
```

## Automated Syncing

### Option 1: Cron Job / Scheduled Task

Set up a cron job or scheduled task to call the sync endpoint periodically:

```bash
# Example: Run every 6 hours
0 */6 * * * curl -X POST http://localhost:3000/api/jobs/sync
```

### Option 2: Next.js API Route with Webhook

Create a webhook endpoint that Browser AI can call after scraping:

```typescript
// app/api/jobs/webhook/route.ts
export async function POST(req: Request) {
  const result = await syncJobsToDatabase()
  return NextResponse.json(result)
}
```

### Option 3: Apify Actor Integration

If you're using Apify actors, you can configure them to:
1. Store scraped jobs in Apify key-value store
2. Trigger your sync endpoint after scraping completes

## Using Apify for Configuration

You can store sync configuration in Apify to control sync behavior:

1. **Create a record** in your Apify key-value store with key `job-sync-config`
2. **Store JSON configuration:**
   ```json
   {
     "batchSize": 20,
     "syncInterval": 3600000,
     "enabled": true
   }
   ```
3. The sync function will automatically read and use this config

## Verification Checklist

- [ ] Database is accessible (`npm run verify:job-sync`)
- [ ] Scraper is fetching jobs (check Browser AI credentials)
- [ ] Sync endpoint is working (`/api/jobs/sync`)
- [ ] Jobs appear in database (check via Prisma Studio or API)
- [ ] Deduplication is working (no duplicate jobs)
- [ ] Jobs have all required fields (title, company, location, description)

## Troubleshooting

### No jobs in database after sync

1. **Check if scraping is working:**
   ```bash
   npm run test:browseai
   ```

2. **Check sync results:**
   ```bash
   npm run test:job-sync
   ```

3. **Verify database:**
   ```bash
   npm run verify:job-sync
   ```

### Jobs not being created

- Check for errors in the sync response (`errors` array)
- Verify database permissions
- Check if jobs already exist (they'll be updated, not created)

### Duplicate jobs

- The system deduplicates by `sourceUrl` first
- Falls back to `title + company + location` if no URL
- Check if `sourceUrl` is being set correctly by the scraper

## Database Schema

The `Job` model includes:

```prisma
model Job {
  id              String   @id @default(cuid())
  title           String
  company         String
  location        String
  jobType         String?
  shortDescription String?
  fullDescription String
  sourceUrl       String?
  postedAt        DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  applications    Application[]
}
```

## Next Steps

1. ✅ Run `npm run verify:job-sync` to verify everything works
2. ✅ Set up automated syncing (cron job, webhook, or scheduled task)
3. ✅ Monitor sync results regularly
4. ✅ Optionally configure Apify for dynamic sync settings

## Related Files

- `lib/jobSync.ts` - Main sync logic
- `lib/browserAIJobs.ts` - Scraper integration
- `app/api/jobs/sync/route.ts` - Sync API endpoint
- `scripts/verify-job-sync-flow.ts` - Comprehensive verification script
- `prisma/schema.prisma` - Database schema

