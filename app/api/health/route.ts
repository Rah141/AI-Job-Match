import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers
 * Returns 200 if the service is healthy, 503 if unhealthy
 */
export async function GET() {
    const headers = { "Content-Type": "application/json" }
    
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`
        
        // Check environment variables
        const requiredEnvVars = [
            "DATABASE_URL",
            "OPENAI_API_KEY",
            "NEXTAUTH_SECRET",
        ]
        
        const missingEnvVars = requiredEnvVars.filter(
            (varName) => !process.env[varName]
        )
        
        if (missingEnvVars.length > 0) {
            return NextResponse.json(
                {
                    status: "unhealthy",
                    message: "Missing required environment variables",
                    missing: missingEnvVars,
                },
                { status: 503, headers }
            )
        }
        
        return NextResponse.json(
            {
                status: "healthy",
                timestamp: new Date().toISOString(),
                service: "AI-Job",
                checks: {
                    database: "ok",
                    environment: "ok",
                },
            },
            { status: 200, headers }
        )
    } catch (error: any) {
        return NextResponse.json(
            {
                status: "unhealthy",
                message: "Health check failed",
                error: error?.message || "Unknown error",
                timestamp: new Date().toISOString(),
            },
            { status: 503, headers }
        )
    }
}

