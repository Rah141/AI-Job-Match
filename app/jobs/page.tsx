import { getJobsFromDatabase } from "@/lib/jobSync"
import { Card } from "@/components/ui/Card"
import { Building2, MapPin, Clock, ExternalLink } from "lucide-react"
import Link from "next/link"

export default async function JobsPage() {
    const jobs = await getJobsFromDatabase({ limit: 100, orderBy: "postedAt", order: "desc" })

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
                    <div className="text-sm text-gray-400">
                        {jobs.length} job{jobs.length !== 1 ? "s" : ""} found
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {jobs.length === 0 ? (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">No Jobs Found</h2>
                        <p className="text-gray-400 mb-6">
                            The database is empty. Sync jobs from Browser AI first.
                        </p>
                        <Link
                            href="/api/jobs/sync"
                            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            Sync Jobs from Browser AI
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex items-center justify-between">
                            <h1 className="text-3xl font-bold">All Jobs</h1>
                            <Link
                                href="/api/jobs/sync"
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                Sync New Jobs
                            </Link>
                        </div>

                        <div className="grid gap-4">
                            {jobs.map((job) => (
                                <Card key={job.id} className="p-6 hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-white mb-2">
                                                {job.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="w-4 h-4" /> {job.company}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" /> {job.location}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" /> {job.jobType || "Full-time"}
                                                </span>
                                            </div>
                                            {job.shortDescription && (
                                                <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                                                    {job.shortDescription}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                                        <div className="text-xs text-gray-500">
                                            <div>ID: {job.id}</div>
                                            <div>Posted: {new Date(job.postedAt).toLocaleDateString()}</div>
                                            <div>Created: {new Date(job.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Link href={`/job/${job.id}`}>
                                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors">
                                                    View Details
                                                </button>
                                            </Link>
                                            {job.sourceUrl && job.sourceUrl !== "#" && (
                                                <a
                                                    href={job.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 border border-gray-600 hover:border-gray-500 rounded-lg text-sm transition-colors flex items-center gap-2"
                                                >
                                                    Source <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}

