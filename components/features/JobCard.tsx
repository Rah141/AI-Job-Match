import Link from "next/link"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { MapPin, Building2, Clock, ArrowRight } from "lucide-react"

interface JobCardProps {
    job: {
        id: string
        title: string
        company: string
        location: string
        jobType: string
        shortDescription: string
        matchScore?: number
    }
}

export function JobCard({ job }: JobCardProps) {
    const scoreColor =
        (job.matchScore || 0) >= 80 ? "bg-green-500/20 text-green-400 border-green-500/30" :
            (job.matchScore || 0) >= 50 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                "bg-red-500/20 text-red-400 border-red-500/30"

    return (
        <Card className="p-6 hover:border-blue-500/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                        {job.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" /> {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" /> {job.location}
                        </span>
                    </div>
                </div>
                {job.matchScore !== undefined && (
                    <div className={`px-3 py-1 rounded-full border text-sm font-bold ${scoreColor}`}>
                        {job.matchScore}% Match
                    </div>
                )}
            </div>

            <p className="text-gray-400 mb-6 line-clamp-2 text-sm leading-relaxed">
                {job.shortDescription}
            </p>

            <div className="flex items-center justify-between relative z-10">
                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
                    <Clock className="w-3 h-3" /> {job.jobType}
                </span>
                <Link href={
                    job.matchScore !== undefined 
                        ? `/job/${job.id}?score=${job.matchScore}`
                        : `/job/${job.id}`
                }>
                    <Button variant="outline" size="sm" className="group-hover:border-blue-500 group-hover:text-blue-400">
                        View Details <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Link>
            </div>
        </Card>
    )
}
