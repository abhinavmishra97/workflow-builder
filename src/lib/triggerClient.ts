import { tasks } from "@trigger.dev/sdk/v3";

/**
 * Trigger.dev client wrapper for workflow execution
 * 
 * IMPORTANT: This file only calls trigger(), never triggerAndWait()
 * triggerAndWait() can ONLY be called from inside task.run()
 */

export interface TriggerTaskPayload {
    taskId: string;
    payload: any;
}

export interface TriggerTaskResult {
    runId: string;
    taskId: string;
}

/**
 * Triggers a Trigger.dev task (fire-and-forget)
 * Returns immediately with a run ID
 */
export async function triggerTask(
    taskId: string,
    payload: any
): Promise<TriggerTaskResult> {
    try {
        const handle = await tasks.trigger(taskId, payload);

        return {
            runId: handle.id,
            taskId,
        };
    } catch (error) {
        console.error(`[Trigger Client] Error triggering task ${taskId}:`, error);
        throw error;
    }
}
