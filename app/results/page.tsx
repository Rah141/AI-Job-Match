import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { JobCard } from "@/components/features/JobCard"
import { Input } from "@/components/ui/Input"
import { Search, Filter, RefreshCw } from "lucide-react"
import { ResultsClient } from "@/components/features/ResultsClient"
import Link from "next/link"

interface ResultsPageProps {
    searchParams: Promise<{ resumeId?: string }>
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
    // Get current user session
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    
    if (!userId) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
                    <p className="text-gray-400 mb-6">You need to be signed in to view job matches.</p>
                    <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
                        Go to Login
                    </Link>
                </div>
            </div>
        )
    }

    // Await searchParams (Next.js 15+)
    const params = await searchParams

    // Get resume ID from query params or fetch latest resume
    let resumeId = params.resumeId
    let resume = null

    if (resumeId) {
        resume = await prisma.resume.findFirst({
            where: {
                id: resumeId,
                userId: userId,
            },
        })
    } else {
        // Get latest resume for user
        resume = await prisma.resume.findFirst({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        })
        if (resume) {
            resumeId = resume.id
        }
    }

    if (!resume) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-white">
                <header className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                AIJobMatch
                            </span>
                        </Link>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-6 py-20">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">No Resume Found</h2>
                        <p className="text-gray-400 mb-6">Please upload or generate a resume to see job matches.</p>
                        <Link href="/" className="text-blue-400 hover:text-blue-300">
                            Go to Home
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

    // Parse resume data
    let resumeData: any = null
    try {
        resumeData = JSON.parse(resume.content)
    } catch (error) {
        console.error("Failed to parse resume content:", error)
    }

    return (
        <ResultsClient 
            resumeId={resumeId || resume.id} 
            resumeTitle={resume.title}
            initialResumeData={resumeData}
        />
    )
}
