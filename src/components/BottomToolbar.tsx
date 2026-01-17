"use client";

import { useState } from "react";
import { MousePointer2, Hand, ZoomIn, ZoomOut, Undo2, Redo2, ChevronDown } from "lucide-react";
import { useReactFlow } from "reactflow";
import { useUndoRedoStore } from "@/store/undoRedoStore";
import { useWorkflowStore } from "@/store/workflowStore";

interface BottomToolbarProps {
  selectionMode: "pointer" | "hand";
  setSelectionMode: (mode: "pointer" | "hand") => void;
}

export default function BottomToolbar({ selectionMode, setSelectionMode }: BottomToolbarProps) {
  const { zoomIn, zoomOut, setViewport, getZoom, fitView } = useReactFlow();
  const undoRedoStore = useUndoRedoStore();
  const { nodes, edges, setNodes, setEdges } = useWorkflowStore();
  const [zoom, setZoom] = useState(100);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  // Update zoom percentage when zoom changes
  const handleZoomChange = () => {
    const currentZoom = getZoom();
    setZoom(Math.round(currentZoom * 100));
  };

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
    setTimeout(handleZoomChange, 250);
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
    setTimeout(handleZoomChange, 250);
  };

  const handleZoomToPercentage = (percentage: number) => {
    const currentZoom = getZoom();
    const newZoom = percentage / 100;
    setViewport({ x: 0, y: 0, zoom: newZoom }, { duration: 200 });
    setTimeout(handleZoomChange, 250);
    setShowZoomMenu(false);
  };

  const handleZoomToFit = () => {
    fitView({ padding: 0.2, duration: 200 });
    setTimeout(handleZoomChange, 250);
    setShowZoomMenu(false);
  };

  const handleUndo = () => {
    const previous = undoRedoStore.undo();
    if (previous) {
      setNodes(previous.nodes);
      setEdges(previous.edges);
    }
  };

  const handleRedo = () => {
    const next = undoRedoStore.redo();
    if (next) {
      setNodes(next.nodes);
      setEdges(next.edges);
    }
  };

  return (
    <div
      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg z-50"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Pointer/Hand Mode Selector */}
      <div
        className="flex items-center rounded-md"
        style={{
          backgroundColor: "var(--bg)",
          border: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => setSelectionMode("pointer")}
          className="p-2 transition-all rounded-l-md"
          style={{
            backgroundColor: selectionMode === "pointer" ? "var(--accent)" : "transparent",
            color: selectionMode === "pointer" ? "#000" : "var(--text-secondary)",
          }}
          title="Pointer (V)"
        >
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSelectionMode("hand")}
          className="p-2 transition-all rounded-r-md"
          style={{
            backgroundColor: selectionMode === "hand" ? "var(--accent)" : "transparent",
            color: selectionMode === "hand" ? "#000" : "var(--text-secondary)",
          }}
          title="Hand (H)"
        >
          <Hand className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div
        className="w-px h-6"
        style={{ backgroundColor: "var(--border)" }}
      />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleUndo}
          disabled={!undoRedoStore.canUndo()}
          className="p-2 rounded-md transition-all"
          style={{
            backgroundColor: "transparent",
            color: undoRedoStore.canUndo() ? "var(--text-secondary)" : "var(--text-muted)",
            cursor: undoRedoStore.canUndo() ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) => {
            if (undoRedoStore.canUndo()) {
              e.currentTarget.style.backgroundColor = "var(--hover)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleRedo}
          disabled={!undoRedoStore.canRedo()}
          className="p-2 rounded-md transition-all"
          style={{
            backgroundColor: "transparent",
            color: undoRedoStore.canRedo() ? "var(--text-secondary)" : "var(--text-muted)",
            cursor: undoRedoStore.canRedo() ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) => {
            if (undoRedoStore.canRedo()) {
              e.currentTarget.style.backgroundColor = "var(--hover)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div
        className="w-px h-6"
        style={{ backgroundColor: "var(--border)" }}
      />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-md transition-all"
          style={{
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Zoom Out (Ctrl+-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom Percentage with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowZoomMenu(!showZoomMenu)}
            className="px-3 py-1.5 rounded-md transition-all flex items-center gap-1 min-w-[70px] justify-center"
            style={{
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <span>{zoom}%</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Zoom Dropdown Menu */}
          {showZoomMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowZoomMenu(false)}
              />
              <div
                className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 rounded-lg shadow-xl py-1 min-w-[160px] z-50"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={handleZoomIn}
                  className="w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span>Zoom In</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Ctrl +</span>
                </button>
                <button
                  onClick={handleZoomOut}
                  className="w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span>Zoom Out</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Ctrl -</span>
                </button>
                <button
                  onClick={() => handleZoomToPercentage(100)}
                  className="w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span>Zoom to 100%</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Ctrl 0</span>
                </button>
                <button
                  onClick={handleZoomToFit}
                  className="w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span>Zoom to Fit</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Ctrl 1</span>
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleZoomIn}
          className="p-2 rounded-md transition-all"
          style={{
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Zoom In (Ctrl++)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
