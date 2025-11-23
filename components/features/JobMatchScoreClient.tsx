"use client"

import { useState, useEffect } from "react"
import { MatchScoreDisplay } from "./MatchScoreDisplay"

interface JobMatchScoreClientProps {
    jobId: string
    resumeId?: string
    serverScore: number | null
    serverReason?: string | null
}

// Cache expiration time: 24 hours in milliseconds (same as ResultsClient)
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000

interface CachedJobMatches {
    jobs: Array<{
        id: string
        matchScore?: number
        matchReason?: string
    }>
    timestamp: number
    resumeId: string
}

function getCacheKey(resumeId: string): string {
    return `jobMatches_${resumeId}`
}

function getCachedJobScore(resumeId: string, jobId: string): { score: number; reason?: string } | null {
    if (typeof window === "undefined") return null
    
    try {
        const cacheKey = getCacheKey(resumeId)
        const cached = localStorage.getItem(cacheKey)
        
        if (!cached) return null
        
        const data: CachedJobMatches = JSON.parse(cached)
        
        // Check if cache is for the correct resume
        if (data.resumeId !== resumeId) {
            return null
        }
        
        // Check if cache is expired
        const now = Date.now()
        if (now - data.timestamp > CACHE_EXPIRATION_MS) {
            return null
        }
        
        // Find the job in cached data
        const job = data.jobs.find(j => j.id === jobId)
        if (job && job.matchScore !== undefined) {
            return {
                score: job.matchScore,
                reason: job.matchReason
            }
        }
        
        return null
    } catch (error) {
        console.error("Error reading cache:", error)
        return null
    }
}

export function JobMatchScoreClient({ 
    jobId, 
    resumeId, 
    serverScore, 
    serverReason 
}: JobMatchScoreClientProps) {
    const [score, setScore] = useState<number | null>(serverScore)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // If we have a resumeId, check cache first
        if (resumeId) {
            const cached = getCachedJobScore(resumeId, jobId)
            if (cached) {
                console.log(`✅ Job ${jobId}: Using cached score: ${cached.score}%`)
                setScore(cached.score)
                return
            }
        }
        
        // Fall back to server score if no cache
        if (serverScore !== null && serverScore !== undefined) {
            setScore(serverScore)
        }
    }, [jobId, resumeId, serverScore])

    return (
        <MatchScoreDisplay 
            score={score} 
            isLoading={isLoading}
            showLabel={true}
            size="md"
        />
    )
}

