import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { syncJobsToDatabase } from "@/lib/jobSync"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { sanitizeError } from "@/lib/utils"

/**
 * POST /api/jobs/sync
 * Syncs jobs from Browser AI to the database
 * Requires authentication (optional - can be made public if needed)
 */
export async function POST(req: NextRequest) {
    return withRateLimit(req, async (req) => {
    try {
        // Optional: Require authentication for syncing
        // Uncomment if you want to restrict syncing to authenticated users
        /*
        const session = await getServerSession(authOptions)
        const userId = (session?.user as any)?.id
        
        if (!userId) {
            return NextResponse.json(
                { message: "Unauthorized. Please sign in." },
                { status: 401, headers: { "Content-Type": "application/json" } }
            )
        }
        */

        const result = await syncJobsToDatabase()

        return NextResponse.json({
            success: true,
            message: `Job sync completed: ${result.created} created, ${result.updated} updated, ${result.total} total`,
            ...result
        }, { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        })
    } catch (error: any) {
        return NextResponse.json(
            { 
                success: false,
                message: "Failed to sync jobs", 
                error: sanitizeError(error)
            },
            { 
                status: 500, 
                headers: { "Content-Type": "application/json" } 
            }
        )
    }
    }, rateLimiters.api)
}

/**
 * GET /api/jobs/sync
 * Returns sync status or triggers sync (for convenience)
 */
export async function GET(req: NextRequest) {
    return withRateLimit(req, async (req) => {
    try {
        const result = await syncJobsToDatabase()

        return NextResponse.json({
            success: true,
            message: `Job sync completed: ${result.created} created, ${result.updated} updated, ${result.total} total`,
            ...result
        }, { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        })
    } catch (error: any) {
        return NextResponse.json(
            { 
                success: false,
                message: "Failed to sync jobs", 
                error: sanitizeError(error)
            },
            { 
                status: 500, 
                headers: { "Content-Type": "application/json" } 
            }
        )
    }
    }, rateLimiters.api)
}

