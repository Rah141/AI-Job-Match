# Browse AI Configuration

## Robot IDs

You have 2 robots configured:

1. **PetroJobs Scraping Robot**
   - ID: `019aa57d-00c5-7c1e-9ce0-9cfbd17b0944`
   - Source: PetroJobs website
   - Parameters: `originUrl`, `job_listings_limit`

2. **LinkedIn Job Listings Robot**
   - ID: `019aa542-d3ba-74fd-bbb7-222822845143`
   - Source: LinkedIn
   - Parameters: `job_title`, `job_location`, `jobs_limit`

## Environment Variables

Add the following to your `.env` file:

```env
BROWSEAI_API_KEY=9625cecf-ec1a-4e1e-a9d7-fff8cb15a1bc:4161cf34-3319-4f1a-9fe7-38b6c430ffa5

# Option 1: Use BROWSEAI_ROBOT_IDS (comma-separated) - RECOMMENDED
BROWSEAI_ROBOT_IDS=019aa57d-00c5-7c1e-9ce0-9cfbd17b0944,019aa542-d3ba-74fd-bbb7-222822845143

# Option 2: Use BROWSEAI_ROBOT_ID for single robot (backward compatibility)
# BROWSEAI_ROBOT_ID=019aa57d-00c5-7c1e-9ce0-9cfbd17b0944
```

## How It Works

When `fetchLatestJobs()` is called:
1. It reads all robot IDs from `BROWSEAI_ROBOT_IDS` (or falls back to `BROWSEAI_ROBOT_ID`)
2. Runs all robots in parallel
3. Fetches jobs from each robot
4. Combines and deduplicates results
5. Returns all unique jobs

## Testing

Run the test script to verify both robots are working:

```bash
npm run test:browseai
```

## Notes

- Both robots will run in parallel for faster job fetching
- If one robot fails, the other will still run
- Jobs are automatically deduplicated based on title, company, and location
- The system will use default input parameters for each robot if not specified

