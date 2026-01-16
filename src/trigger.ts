// Trigger.dev v3 auto-discovers tasks from the directories specified in trigger.config.ts
// No need for a TriggerClient instance or manual task registration

// Tasks are automatically discovered from:
// - src/trigger/

// To trigger tasks programmatically, import them directly:
// import { executeLLMTask } from "./trigger/llmTask";
// await executeLLMTask.trigger({ ... });