import { task } from "@trigger.dev/sdk/v3";

// Example task - you can replace this with your actual workflow tasks
export const exampleTask = task({
    id: "example-task",
    async run(payload: { message: string }) {
        console.log("Example task running with payload:", payload);

        // Your task logic goes here
        return {
            success: true,
            message: `Processed: ${payload.message}`,
        };
    },
});
