"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Globe } from "lucide-react"

interface JobActionsGuestProps {
    jobSourceUrl: string
}

export function JobActionsGuest({ jobSourceUrl }: JobActionsGuestProps) {
    const router = useRouter()

    const handleSignIn = () => {
        router.push("/auth/login")
    }

    const handleViewJobWebsite = () => {
        window.open(jobSourceUrl, "_blank")
    }

    return (
        <div className="space-y-3">
            <Button className="w-full" onClick={handleSignIn}>
                Sign In to Access Actions
            </Button>
            <Button variant="outline" className="w-full" onClick={handleViewJobWebsite}>
                <Globe className="w-4 h-4 mr-2" />
                View Job Website
            </Button>
        </div>
    )
}

