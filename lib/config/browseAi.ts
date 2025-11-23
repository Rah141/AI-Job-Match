/**
 * Get robot IDs from environment variable
 * Supports comma-separated list or single robot ID
 * This function reads from process.env directly to ensure latest values
 */
export function getRobotIds(): string[] {
    const robotIds = process.env.BROWSEAI_ROBOT_IDS || process.env.BROWSEAI_ROBOT_ID
    if (!robotIds) {
        return []
    }
    // Split by comma and trim whitespace
    return robotIds.split(",").map(id => id.trim()).filter(Boolean)
}

export const BROWSEAI_CONFIG = {
    apiKey: process.env.BROWSEAI_API_KEY,
    baseUrl: "https://api.browse.ai/v2",
    defaultRobotId: process.env.BROWSEAI_ROBOT_ID || "default-robot-id", // For backward compatibility
    get robotIds() {
        // Use getter to always read fresh from process.env
        return getRobotIds()
    },
}

if (!process.env.BROWSEAI_API_KEY && process.env.NODE_ENV === "development") {
    console.warn("Missing BROWSEAI_API_KEY environment variable. Browse AI features will fail.")
}
