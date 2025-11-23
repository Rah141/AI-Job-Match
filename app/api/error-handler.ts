import { NextResponse } from "next/server"
import { sanitizeError } from "@/lib/utils"

/**
 * Wraps an API route handler to ensure all errors return JSON
 */
export function withErrorHandler(handler: (req: Request) => Promise<NextResponse>) {
    return async (req: Request): Promise<NextResponse> => {
        const headers = { "Content-Type": "application/json" }
        
        try {
            return await handler(req)
        } catch (error: any) {
            // Always return JSON, never HTML
            try {
                return NextResponse.json(
                    {
                        message: "Internal server error",
                        error: sanitizeError(error),
                        ...(process.env.NODE_ENV === "development" && { stack: error?.stack }),
                    },
                    { status: 500, headers }
                )
            } catch (jsonError) {
                // Fallback if JSON creation fails
                return new NextResponse(
                    JSON.stringify({ message: "Internal server error", error: "Failed to serialize error" }),
                    { status: 500, headers }
                )
            }
        }
    }
}

