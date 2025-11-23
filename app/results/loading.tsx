import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Scraping Job Boards...</h2>
            <p className="text-gray-400 animate-pulse">Our AI agents are gathering the latest opportunities for you.</p>
        </div>
    )
}
