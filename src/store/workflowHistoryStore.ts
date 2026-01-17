import { create } from "zustand";
import type { Node, Edge } from "reactflow";

export type NodeExecutionResult = {
    nodeId: string;
    nodeType: string;
    nodeName: string;
    status: "success" | "failed" | "running";
    startedAt: number;
    completedAt?: number;
    duration?: number;
    output?: unknown;
    error?: string;
};

export type WorkflowRun = {
    runId: string;
    scope: "full" | "selected" | "single";
    status: "success" | "failed" | "running" | "partial";
    startedAt: number;
    completedAt?: number;
    duration?: number;
    nodeResults: NodeExecutionResult[];
    totalNodes: number;
    successfulNodes: number;
    failedNodes: number;
    selectedNodeIds?: string[]; // Track which nodes were selected for "selected" scope runs
};

type WorkflowHistoryStore = {
    runs: WorkflowRun[];
    expandedRunId: string | null;
    isCollapsed: boolean;
    sidebarWidth: number;

    // Actions
    addRun: (run: WorkflowRun) => void;
    updateRun: (runId: string, updates: Partial<WorkflowRun>) => void;
    toggleExpanded: (runId: string) => void;
    toggleCollapsed: () => void;
    clearHistory: () => void;
    setSidebarWidth: (width: number) => void;
};

export const useWorkflowHistoryStore = create<WorkflowHistoryStore>((set) => ({
    runs: [],
    expandedRunId: null,
    isCollapsed: false,
    sidebarWidth: 380, // Default width

    addRun: (run) =>
        set((state) => ({
            runs: [run, ...state.runs].slice(0, 50), // Keep last 50 runs
        })),

    updateRun: (runId, updates) =>
        set((state) => ({
            runs: state.runs.map((run) =>
                run.runId === runId ? { ...run, ...updates } : run
            ),
        })),

    toggleExpanded: (runId) =>
        set((state) => ({
            expandedRunId: state.expandedRunId === runId ? null : runId,
        })),

    toggleCollapsed: () =>
        set((state) => ({
            isCollapsed: !state.isCollapsed,
            expandedRunId: null, // Collapse all runs when hiding sidebar
        })),

    clearHistory: () =>
        set({
            runs: [],
            expandedRunId: null,
        }),

    setSidebarWidth: (width) =>
        set({
            sidebarWidth: Math.max(300, Math.min(600, width)), // Constrain between 300px and 600px
        }),
}));
