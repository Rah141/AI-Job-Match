import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}
