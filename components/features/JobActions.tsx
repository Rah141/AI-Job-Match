"use client"

import { Button } from "@/components/ui/Button"
import { Globe } from "lucide-react"

interface JobActionsProps {
    jobId: string
    jobDescription: string
    jobSourceUrl: string
    resumeId?: string
}

export function JobActions({ jobId, jobDescription, jobSourceUrl, resumeId }: JobActionsProps) {
    const handleViewJobWebsite = () => {
        window.open(jobSourceUrl, "_blank")
    }

    return (
        <div className="space-y-3">
            <Button 
                variant="outline" 
                className="w-full"
                onClick={handleViewJobWebsite}
            >
                <Globe className="w-4 h-4 mr-2" />
                View Job Website
            </Button>
        </div>
    )
}

