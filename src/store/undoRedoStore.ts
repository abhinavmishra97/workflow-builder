import { create } from "zustand";
import type { Node, Edge } from "reactflow";

type HistoryState = {
    nodes: Node[];
    edges: Edge[];
};

type UndoRedoStore = {
    past: HistoryState[];
    present: HistoryState;
    future: HistoryState[];

    // Actions
    set: (nodes: Node[], edges: Edge[]) => void;
    undo: () => HistoryState | null;
    redo: () => HistoryState | null;
    clear: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
};

const HISTORY_LIMIT = 50;

export const useUndoRedoStore = create<UndoRedoStore>((set, get) => ({
    past: [],
    present: { nodes: [], edges: [] },
    future: [],

    set: (nodes, edges) => {
        const { present, past } = get();

        // Don't add to history if nothing changed
        if (
            JSON.stringify(present.nodes) === JSON.stringify(nodes) &&
            JSON.stringify(present.edges) === JSON.stringify(edges)
        ) {
            return;
        }

        set({
            past: [...past, present].slice(-HISTORY_LIMIT),
            present: { nodes, edges },
            future: [], // Clear future on new action
        });
    },

    undo: () => {
        const { past, present, future } = get();

        if (past.length === 0) return null;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        set({
            past: newPast,
            present: previous,
            future: [present, ...future].slice(0, HISTORY_LIMIT),
        });

        return previous;
    },

    redo: () => {
        const { past, present, future } = get();

        if (future.length === 0) return null;

        const next = future[0];
        const newFuture = future.slice(1);

        set({
            past: [...past, present].slice(-HISTORY_LIMIT),
            present: next,
            future: newFuture,
        });

        return next;
    },

    clear: () => {
        set({
            past: [],
            present: { nodes: [], edges: [] },
            future: [],
        });
    },

    canUndo: () => {
        return get().past.length > 0;
    },

    canRedo: () => {
        return get().future.length > 0;
    },
}));
