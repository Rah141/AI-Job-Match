interface MatchScoreDisplayProps {
    score: number | null | undefined
    isLoading?: boolean
    showLabel?: boolean
    size?: "sm" | "md" | "lg"
}

export function MatchScoreDisplay({ 
    score, 
    isLoading = false,
    showLabel = true,
    size = "md"
}: MatchScoreDisplayProps) {
    if (isLoading) {
        return (
            <div>
                {showLabel && <div className="text-sm text-gray-400 mb-1">Match Score</div>}
                <div className="text-gray-500 text-sm">Calculating...</div>
            </div>
        )
    }

    if (score === null || score === undefined) {
        return (
            <div>
                {showLabel && <div className="text-sm text-gray-400 mb-1">Match Score</div>}
                <div className="text-gray-500 text-sm">Sign in to see match score</div>
            </div>
        )
    }

    // Determine color based on score
    const scoreColor =
        score >= 80 ? "text-green-400" :
        score >= 50 ? "text-yellow-400" :
        "text-red-400"

    // Size classes
    const sizeClasses = {
        sm: "text-xl",
        md: "text-3xl",
        lg: "text-4xl"
    }

    return (
        <div>
            {showLabel && <div className="text-sm text-gray-400 mb-1">Match Score</div>}
            <div className={`font-bold ${scoreColor} ${sizeClasses[size]}`}>
                {score}%
            </div>
        </div>
    )
}

