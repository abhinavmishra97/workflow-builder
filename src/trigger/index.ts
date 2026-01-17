/**
 * Trigger.dev tasks index
 * 
 * This file imports all tasks to ensure they are registered with Trigger.dev
 */

// Import all tasks
import "./cropImage";
import "./llmTask";
import "./example";
// import "../lib/workflowOrchestrator";

// Export for convenience
export { cropImage } from "./cropImage";
export { executeLLMTask } from "./llmTask";
export { exampleTask } from "./example";
// export { executeWorkflow } from "../lib/workflowOrchestrator";
