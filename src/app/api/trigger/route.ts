// Trigger.dev v3 doesn't require a route handler in Next.js
// Tasks are auto-discovered from the trigger.config.ts configuration
// This file can be removed or kept as a placeholder

export async function GET() {
    return Response.json({
        message: "Trigger.dev v3 tasks are auto-discovered. Use the Trigger.dev CLI to run tasks."
    });
}
