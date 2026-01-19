"use client";

import { useWorkflowHistoryStore, type WorkflowRun, type NodeExecutionResult } from "@/store/workflowHistoryStore";
import { useWorkflowStore } from "@/store/workflowStore";
import { ChevronDown, ChevronRight, Check, X, Loader2, Clock, ChevronLeft, History, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function WorkflowHistory() {
  const { runs, expandedRunId, isCollapsed, sidebarWidth, toggleExpanded, toggleCollapsed, clearHistory, setSidebarWidth } = useWorkflowHistoryStore();
  const { nodes, setNodes } = useWorkflowStore();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "var(--success)";
      case "failed":
        return "var(--danger)";
      case "running":
        return "var(--warning)";
      case "partial":
        return "var(--warning)";
      default:
        return "var(--text-muted)";
    }
  };

  const getScopeLabel = (scope: string, run: WorkflowRun) => {
    switch (scope) {
      case "full":
        return "Full Workflow";
      case "selected":
        return `Selected Nodes (${run.selectedNodeIds?.length || run.totalNodes})`;
      case "single":
        return "Single Node";
      default:
        return scope;
    }
  };

  const highlightNodeOnCanvas = (nodeId: string) => {
    // Temporarily highlight the node on canvas
    const updatedNodes = nodes.map(node => ({
      ...node,
      selected: node.id === nodeId,
    }));
    setNodes(updatedNodes);
  };

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    // Calculate new width from the right edge
    const newWidth = window.innerWidth - e.clientX;
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add/remove event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const renderNodeResult = (result: NodeExecutionResult, isLast: boolean, runId: string) => {
    const StatusIcon = result.status === "success" ? Check : result.status === "failed" ? X : Loader2;
    const isHovered = hoveredNodeId === `${runId}-${result.nodeId}`;
    
    return (
      <div 
        key={result.nodeId} 
        className="relative"
        onMouseEnter={() => setHoveredNodeId(`${runId}-${result.nodeId}`)}
        onMouseLeave={() => setHoveredNodeId(null)}
      >
        {/* Tree connector line */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-px"
          style={{ 
            backgroundColor: "var(--border)",
            marginLeft: "16px",
          }}
        />
        
        {/* Horizontal connector */}
        <div 
          className="absolute left-0 top-5 w-4 h-px"
          style={{ 
            backgroundColor: "var(--border)",
            marginLeft: "16px",
          }}
        />

        {/* Node content */}
        <div 
          className="ml-8 mb-2 cursor-pointer transition-all"
          onClick={() => highlightNodeOnCanvas(result.nodeId)}
          style={{
            backgroundColor: isHovered ? "var(--hover)" : "transparent",
            borderRadius: "6px",
            padding: "8px",
            marginLeft: "24px",
          }}
        >
          {/* Node header */}
          <div className="flex items-center gap-2 mb-1">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: getStatusColor(result.status) + "20",
                border: `1.5px solid ${getStatusColor(result.status)}`,
              }}
            >
              <StatusIcon
                className="w-2.5 h-2.5"
                style={{ color: getStatusColor(result.status) }}
              />
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              {result.nodeName}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              ({result.nodeId})
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {formatDuration(result.duration)}
              </span>
            </div>
          </div>

          {/* Output or error */}
          {result.error ? (
            <div className="ml-6">
              <div
                className="text-xs px-2 py-1.5 rounded mt-1"
                style={{
                  backgroundColor: "var(--danger)" + "15",
                  color: "var(--danger)",
                  fontFamily: "monospace",
                  border: "1px solid " + "var(--danger)" + "40",
                }}
              >
                <span style={{ opacity: 0.7 }}>Error:</span> {result.error}
              </div>
            </div>
          ) : result.output ? (
            <div className="ml-6">
              <div
                className="text-xs px-2 py-1.5 rounded mt-1"
                style={{
                  backgroundColor: "var(--hover)",
                  color: "var(--text-secondary)",
                  fontFamily: "monospace",
                  border: "1px solid var(--border)",
                }}
              >
                <span style={{ opacity: 0.6, marginRight: "4px" }}>Output:</span>
                <span 
                  className="truncate block"
                  title={typeof result.output === "string" ? result.output : JSON.stringify(result.output)}
                >
                  {typeof result.output === "string"
                    ? result.output.length > 50
                      ? result.output.substring(0, 50) + "..."
                      : result.output
                    : JSON.stringify(result.output).substring(0, 50) + "..."}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderRun = (run: WorkflowRun) => {
    const isExpanded = expandedRunId === run.runId;
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

    return (
      <div
        key={run.runId}
        className="border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Run header */}
        <button
          onClick={() => toggleExpanded(run.runId)}
          className="w-full px-4 py-3 flex items-start gap-3 transition-all"
          style={{
            backgroundColor: isExpanded ? "var(--hover)" : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!isExpanded) {
              e.currentTarget.style.backgroundColor = "var(--hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isExpanded) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <ChevronIcon className="w-4 h-4 mt-0.5 flex-shrink-0 transition-transform" style={{ color: "var(--text-secondary)" }} />
          
          <div className="flex-1 text-left">
            {/* Run ID and timestamp */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {run.runId}
              </span>
            </div>

            <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              {formatTimestamp(run.startedAt)}
            </div>

            {/* Scope badge */}
            <div className="mb-2">
              <span
                className="text-xs px-2 py-1 rounded-md font-medium"
                style={{
                  backgroundColor: run.scope === "full" ? "var(--purple-glow)" + "30" : "var(--hover)",
                  color: run.scope === "full" ? "var(--accent)" : "var(--text-secondary)",
                  border: `1px solid ${run.scope === "full" ? "var(--accent)" + "40" : "var(--border)"}`,
                }}
              >
                {getScopeLabel(run.scope, run)}
              </span>
            </div>

            {/* Status and metrics */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getStatusColor(run.status) }}
                />
                <span 
                  className="font-semibold"
                  style={{ color: getStatusColor(run.status) }}
                >
                  {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                <Clock className="w-3 h-3" />
                <span className="font-medium">{formatDuration(run.duration)}</span>
              </div>
              <span style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "var(--success)", fontWeight: 600 }}>{run.successfulNodes}</span>
                {run.failedNodes > 0 && (
                  <>
                    {" / "}
                    <span style={{ color: "var(--danger)", fontWeight: 600 }}>{run.failedNodes}</span>
                  </>
                )}
                {" / "}{run.totalNodes} nodes
              </span>
            </div>
          </div>
        </button>

        {/* Expanded node results with tree structure */}
        {isExpanded && run.nodeResults.length > 0 && (
          <div 
            className="pb-3 pt-1"
            style={{
              backgroundColor: "var(--bg)",
            }}
          >
            <div className="px-4">
              <div className="text-xs font-semibold mb-2 ml-1" style={{ color: "var(--text-muted)" }}>
                Node Execution Tree:
              </div>
              {run.nodeResults.map((result, index) =>
                renderNodeResult(result, index === run.nodeResults.length - 1, run.runId)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`h-full flex border-l relative ${isResizing ? "" : "transition-all duration-300"}`}
      style={{
        width: isCollapsed ? "48px" : `${sidebarWidth}px`,
        backgroundColor: "var(--bg)",
        borderColor: "var(--border)",
      }}
    >
      {/* Resize handle */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-accent transition-colors z-10"
          style={{
            backgroundColor: isResizing ? "var(--accent)" : "transparent",
          }}
          title="Drag to resize"
        />
      )}
      {/* Collapsed state - just toggle button */}
      {isCollapsed ? (
        <div className="w-full flex flex-col items-center pt-4">
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title="Show Workflow History"
          >
            <History className="w-5 h-5" />
          </button>
          {runs.length > 0 && (
            <div
              className="mt-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                backgroundColor: "var(--purple-glow)",
                color: "var(--text-primary)",
              }}
            >
              {runs.length > 9 ? "9+" : runs.length}
            </div>
          )}
        </div>
      ) : (
        /* Expanded state - full sidebar */
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          {/* Header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between shrink-0"
            style={{
              backgroundColor: "var(--sidebar)",
              borderColor: "var(--border)",
              width: `${sidebarWidth}px`, // Force width to match sidebar to prevent shrinking
              minWidth: "300px" // Ensure it doesn't collapse below min width
            }}
          >
            <div className="shrink-0">
              <h2 className="text-sm font-bold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                Workflow History
              </h2>
              {runs.length > 0 && (
                <p className="text-xs mt-1 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                  {runs.length} run{runs.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {runs.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="p-1.5 rounded transition-colors"
                  style={{
                    color: "var(--text-muted)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover)";
                    e.currentTarget.style.color = "var(--danger)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                  title="Clear History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={toggleCollapsed}
                className="p-1.5 rounded transition-colors"
                style={{
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
                title="Hide History"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Run list */}
          <div className="flex-1 overflow-y-auto">
            {runs.length === 0 ? (
              <div className="flex items-center justify-center h-full px-4 text-center">
                <div>
                  <History className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                  <p className="text-sm mb-1 font-medium" style={{ color: "var(--text-secondary)" }}>
                    No workflow runs yet
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Execute nodes to see history
                  </p>
                </div>
              </div>
            ) : (
              runs.map((run) => renderRun(run))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
