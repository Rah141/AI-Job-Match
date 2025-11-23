# Deployment Guide - Vercel Free Tier

This guide will help you deploy your AI Job Match application to Vercel with a free PostgreSQL database.

## Prerequisites

- GitHub account (for Vercel integration)
- Free PostgreSQL database account (Supabase, Neon, or Railway recommended)

## Step 1: Set Up Free PostgreSQL Database

### Option A: Supabase (Recommended - Easiest)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Wait for the database to be provisioned (takes 1-2 minutes)
4. Go to **Settings** → **Database** → **Connection string** → **URI**
5. Copy the connection string (format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`)
6. Replace `[PASSWORD]` with your database password (shown when you create the project)

### Option B: Neon (Serverless PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string from the dashboard
4. Format: `postgresql://user:password@host/database?sslmode=require`

### Option C: Railway (PostgreSQL)

1. Go to [railway.app](https://railway.app) and sign up
2. Create new project → Click **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Click on the PostgreSQL service → **"Variables"** tab
4. Copy the `DATABASE_URL` value

## Step 2: Prepare Your Code

The following changes have already been made to your codebase:

- ✅ Prisma schema updated to use PostgreSQL
- ✅ Build script updated to include Prisma generate
- ✅ File upload limit adjusted to 4.5MB (Vercel limit)
- ✅ `.env.example` file created
- ✅ `vercel.json` configuration file created

## Step 3: Push Code to GitHub

1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Prepare for Vercel deployment"
   ```

2. Create a new repository on GitHub:
   - Go to [github.com](https://github.com) and create a new repository
   - **Do not** initialize with README, .gitignore, or license

3. Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

## Step 4: Deploy to Vercel

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up or login with your GitHub account

2. **Import Project**
   - Click **"Add New Project"**
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   
   In the **"Environment Variables"** section, add the following:

   **Required Variables:**
   - `DATABASE_URL` - Your PostgreSQL connection string from Step 1
   - `OPENAI_API_KEY` - Your OpenAI API key (starts with `sk-`)
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32` (or use an online generator)
   - `NEXTAUTH_URL` - Will be set automatically, but you can override: `https://your-app.vercel.app`
   - `OPENAI_MODEL` - `gpt-4o` (or your preferred model)

   **Optional Variables:**
   - `BROWSEAI_API_KEY` - If using Browse AI for job scraping
   - `BROWSEAI_ROBOT_IDS` - Comma-separated robot IDs
   - `APIFY_API_TOKEN` - If using Apify
   - `APIFY_KV_STORE_ID` - Apify key-value store ID
   - `UPSTASH_REDIS_REST_URL` - For Redis rate limiting
   - `UPSTASH_REDIS_REST_TOKEN` - Redis token
   - `ALLOWED_ORIGINS` - Comma-separated list for CORS

4. **Deploy**
   - Click **"Deploy"**
   - Vercel will build and deploy your application
   - The first deployment will take 2-5 minutes

## Step 5: Run Database Migrations

After the first deployment, you need to run Prisma migrations to create the database tables.

### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Link your project:
   ```bash
   vercel link
   ```

4. Pull environment variables:
   ```bash
   vercel env pull .env.local
   ```

5. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Option B: Using Vercel Build Command

The `postbuild` script in `package.json` will automatically run migrations after each build. However, for the first deployment, you may need to run migrations manually using Option A.

## Step 6: Verify Deployment

1. **Check Deployment Status**
   - Go to your Vercel dashboard
   - Check that the deployment succeeded (green checkmark)

2. **Test Your Application**
   - Visit your deployment URL (e.g., `https://your-app.vercel.app`)
   - Test the following:
     - [ ] Homepage loads
     - [ ] Sign up / Login works
     - [ ] Database connection works (try creating a resume)
     - [ ] File uploads work (resume parsing)
     - [ ] OpenAI API calls work (job matching)
     - [ ] Rate limiting is functioning

3. **Check Logs**
   - In Vercel dashboard, go to **"Deployments"** → Click on your deployment → **"Functions"** tab
   - Check for any errors in the logs

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct in Vercel environment variables
- Ensure PostgreSQL database allows connections from Vercel's IPs
- Check if your database requires SSL (add `?sslmode=require` to connection string)

### Build Failures

- Check Vercel build logs for specific errors
- Ensure all environment variables are set
- Verify `package.json` scripts are correct

### Migration Issues

- Run migrations manually using Vercel CLI
- Check that `DATABASE_URL` is accessible from your local machine
- Verify Prisma schema is correct

### File Upload Issues

- Remember: Vercel has a 4.5MB limit for serverless functions
- Large files may need to be handled differently (consider Vercel Blob Storage)

## Free Tier Limits

### Vercel
- 100GB bandwidth/month
- Unlimited requests
- Serverless function execution time: 10 seconds (Hobby plan)

### Supabase
- 500MB database storage
- 2GB bandwidth/month
- 2 million monthly requests

### Neon
- 0.5GB storage
- Shared CPU
- Auto-suspend after 5 minutes of inactivity

## Next Steps

1. **Custom Domain** (Optional)
   - Add your custom domain in Vercel dashboard
   - Update `NEXTAUTH_URL` environment variable

2. **Monitoring**
   - Set up Vercel Analytics (available in dashboard)
   - Consider adding error tracking (Sentry, LogRocket)

3. **Performance**
   - Enable Vercel Edge Functions for faster responses
   - Consider adding caching layer (Redis)

4. **Security**
   - Rotate API keys regularly
   - Enable 2FA on all accounts
   - Review and update dependencies regularly

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review environment variables
3. Test database connection locally
4. Check Prisma migration status

For more help:
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

