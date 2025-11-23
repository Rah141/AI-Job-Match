import { NextResponse } from "next/server"
import { sanitizeError } from "@/lib/utils"

/**
 * Wraps API route handlers to ensure all errors return JSON
 * This prevents Next.js from returning HTML error pages
 */
export function jsonRouteHandler(
    handler: (req: Request) => Promise<NextResponse>
) {
    return async (req: Request): Promise<NextResponse> => {
        const headers = { "Content-Type": "application/json" }
        
        try {
            const response = await handler(req)
            // Ensure response has JSON headers
            if (response) {
                const existingHeaders = new Headers(response.headers)
                if (!existingHeaders.has("Content-Type")) {
                    existingHeaders.set("Content-Type", "application/json")
                }
                return new NextResponse(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: existingHeaders,
                })
            }
            return response
        } catch (error: any) {
            // Always return JSON, never HTML
            return NextResponse.json(
                {
                    message: "Internal server error",
                    error: sanitizeError(error),
                    ...(process.env.NODE_ENV === "development" && { 
                        stack: error?.stack,
                        name: error?.name 
                    }),
                },
                { status: 500, headers }
            )
        }
    }
}

