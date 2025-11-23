import { BROWSEAI_CONFIG } from "@/lib/config/browseAi"

interface BrowseAiError {
    statusCode: number
    message: string
}

interface RobotTask {
    id: string
    status: "successful" | "failed" | "in-progress" | "monitoring"
    capturedLists?: Record<string, any[]>
    capturedTexts?: Record<string, string>
    capturedScreenshots?: Record<string, string>
    inputParameters?: Record<string, any>
    robotId: string
    createdAt: number
    finishedAt?: number
}

class BrowseAiClient {
    private baseUrl: string

    constructor() {
        this.baseUrl = BROWSEAI_CONFIG.baseUrl
    }

    private get apiKey(): string {
        // Read from process.env directly to ensure we get the latest value
        return process.env.BROWSEAI_API_KEY || BROWSEAI_CONFIG.apiKey || ""
    }

    private get headers() {
        return {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
        }
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        if (!this.apiKey) {
            throw new Error("Browse AI API key is missing")
        }

        const url = `${this.baseUrl}${endpoint}`
        const res = await fetch(url, {
            ...options,
            headers: {
                ...this.headers,
                ...options.headers,
            },
        })

        if (!res.ok) {
            let errorMessage = `Browse AI API Error: ${res.status} ${res.statusText}`
            let errorCode = ""
            try {
                const errorBody = await res.json()
                errorCode = errorBody.messageCode || ""
                
                // Provide user-friendly error messages
                if (errorCode === "credits_limit_reached") {
                    errorMessage = "Browse AI credits limit reached. Please add credits to your Browse AI account."
                } else if (errorBody.message) {
                    errorMessage += ` - ${errorBody.message}`
                } else if (errorBody.error) {
                    errorMessage += ` - ${errorBody.error}`
                }
            } catch (e) {
                // If JSON parse fails, try to get text
                const text = await res.text().catch(() => "")
                if (text) {
                    errorMessage += ` - ${text.substring(0, 200)}`
                }
            }
            console.error(errorMessage) // Log safe error
            throw new Error(errorMessage)
        }

        return res.json()
    }

    async getStatus() {
        return this.request<{ message: string }>("/status")
    }

    async getRobots() {
        return this.request<{ robots: { items: { id: string, name: string }[] } }>("/robots")
    }

    async runRobotTask(robotId: string, inputParameters?: Record<string, unknown>): Promise<{ result: RobotTask }> {
        return this.request<{ result: RobotTask }>(`/robots/${robotId}/tasks`, {
            method: "POST",
            body: JSON.stringify({ inputParameters }),
        })
    }

    async getRobotTask(robotId: string, taskId: string): Promise<{ result: RobotTask }> {
        return this.request<{ result: RobotTask }>(`/robots/${robotId}/tasks/${taskId}`)
    }

    async waitForTaskCompletion(robotId: string, taskId: string, timeoutMs = 60000): Promise<RobotTask> {
        const startTime = Date.now()

        while (Date.now() - startTime < timeoutMs) {
            const { result: task } = await this.getRobotTask(robotId, taskId)

            if (task.status === "successful") {
                return task
            }

            if (task.status === "failed") {
                throw new Error("Browse AI task failed")
            }

            // Wait 2 seconds before polling again
            await new Promise(resolve => setTimeout(resolve, 2000))
        }

        throw new Error("Browse AI task timed out")
    }
}

export const browseAiClient = new BrowseAiClient()
