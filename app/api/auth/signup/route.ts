import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withRateLimit, rateLimiters } from "@/lib/rate-limit"
import { validateRequestBody } from "@/lib/validations"
import { signupSchema } from "@/lib/validations"
import { sanitizeError } from "@/lib/utils"

export async function POST(req: NextRequest) {
    return withRateLimit(req, async (req) => {
        try {
            const headers = { "Content-Type": "application/json" }
            
            // Validate request body
            const validation = await validateRequestBody(req, signupSchema)
            if (!validation.success) {
                return validation.error
            }

            const { name, email, password } = validation.data

        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { message: "User already exists" },
                { status: 400 }
            )
        }

        const hashedPassword = await hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        })

        return NextResponse.json(
            { message: "User created successfully", user: { id: user.id, email: user.email, name: user.name } },
            { status: 201 }
        )
        } catch (error: any) {
            return NextResponse.json(
                { 
                    message: "Internal server error",
                    error: sanitizeError(error),
                },
                { status: 500, headers: { "Content-Type": "application/json" } }
            )
        }
    }, rateLimiters.auth)
}
