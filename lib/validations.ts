import { z } from "zod"
import { NextResponse } from "next/server"

/**
 * Input validation schemas for API routes
 */

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must be less than 100 characters"),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const resumeGenerateSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(200, "Full name must be less than 200 characters"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required").max(100, "Role must be less than 100 characters"),
  skills: z.union([
    z.array(z.string()),
    z.string().transform((val) => val.split(",").map(s => s.trim()).filter(Boolean)),
  ]).optional(),
  experience: z.string().optional(),
})

export const resumeSaveSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  content: z.union([
    z.string().min(1, "Content is required"),
    z.object({}).passthrough(), // Allow JSON objects
  ]),
  rawText: z.string().optional(),
  type: z.enum(["UPLOADED", "GENERATED"]),
})

export const resumeParseSchema = z.object({
  resumeId: z.string().min(1, "Resume ID is required"),
})

export const jobMatchSchema = z.object({
  resumeId: z.string().min(1, "Resume ID is required"),
})

export const coverLetterSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  resumeId: z.string().min(1, "Resume ID is required").optional(),
})

export const resumeTailorSchema = z.object({
  jobId: z.string().min(1, "Job ID is required").optional(),
  jobDescription: z.string().min(1, "Job description is required").optional(),
  resumeId: z.string().min(1, "Resume ID is required").optional(),
}).refine(
  (data) => data.jobId || data.jobDescription,
  {
    message: "Either jobId or jobDescription is required",
    path: ["jobId"],
  }
)

/**
 * Helper function to validate request body
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            message: "Validation error",
            errors: error.errors.map(e => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      }
    }
    return {
      success: false,
      error: NextResponse.json(
        { message: "Invalid request body. Expected JSON." },
        { status: 400 }
      ),
    }
  }
}

