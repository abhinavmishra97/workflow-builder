"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  type ReactFlowInstance,
  type FitViewOptions,
  type Connection,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "@/store/workflowStore";
import TextNode from "@/components/nodes/TextNode";
import UploadImageNode from "@/components/nodes/UploadImageNode";
import UploadVideoNode from "@/components/nodes/UploadVideoNode";
import LLMNode from "@/components/nodes/LLMNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";
import NodePalette from "@/components/NodePalette";
import WorkflowHistory from "@/components/WorkflowHistory";
import BottomToolbar from "@/components/BottomToolbar";
import { Play, Download, Upload } from "lucide-react";
import {
  createTextNode,
  createUploadImageNode,
  createUploadVideoNode,
  createLLMNode,
  createCropImageNode,
  createExtractFrameNode,
} from "@/lib/nodeHelpers";
import { useUndoRedoStore } from "@/store/undoRedoStore";
import { runSelectedNodes } from "@/lib/selectiveExecution";

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
  maxZoom: 1.5,
};

const nodeTypes = {
  text: TextNode,
  uploadImage: UploadImageNode,
  uploadVideo: UploadVideoNode,
  llm: LLMNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

interface WorkflowCanvasProps {
  workflowId?: string;
}

export default function WorkflowCanvas({ workflowId }: WorkflowCanvasProps) {
  const { nodes, edges, setNodes, setEdges, connectNodes, executeWorkflow, isExecuting, addNode, setNodeStatus, setNodeResult } =
    useWorkflowStore();
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [isEditingName, setIsEditingName] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const hasFittedRef = useRef(false);


  // Load workflow data
  useEffect(() => {
    if (!workflowId) return;

    // Set workflow ID in store
    useWorkflowStore.getState().setWorkflowId(workflowId);

    const loadWorkflow = async () => {
      try {
        const res = await fetch(`/api/workflows/${workflowId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.name) setWorkflowName(data.name);
          
          if (data.content && typeof data.content === 'object') {
            const content = data.content as { nodes?: any[], edges?: any[] };
            if (Array.isArray(content.nodes)) {
              setNodes(content.nodes);
            }
            if (Array.isArray(content.edges)) {
              setEdges(content.edges);
            }
          }

          // Load history
          if (Array.isArray(data.runs)) {
             const { useWorkflowHistoryStore } = await import("@/store/workflowHistoryStore");
             const historyStore = useWorkflowHistoryStore.getState();
             
             const parsedRuns = data.runs.map((run: any) => ({
                runId: run.id,
                scope: run.triggerType === 'manual_node' ? 'single' : (run.triggerType === 'manual_selected' ? 'selected' : 'full'),
                status: run.status === 'COMPLETED' ? 'success' : (run.status === 'FAILED' ? 'failed' : 'running'),
                startedAt: new Date(run.startedAt).getTime(),
                completedAt: run.completedAt ? new Date(run.completedAt).getTime() : undefined,
                duration: run.duration,
                // Handle different DB formats or missing fields
                nodeResults: Array.isArray(run.nodeResults) ? run.nodeResults : [], 
                totalNodes: 0, // Backend might not store this, calculate or default
                successfulNodes: 0, 
                failedNodes: 0,
             }));
             
             // Recalculate counts if needed from nodeResults
             parsedRuns.forEach((r: any) => {
                 r.totalNodes = r.nodeResults.length;
                 r.successfulNodes = r.nodeResults.filter((n: any) => n.status === 'success').length;
                 r.failedNodes = r.nodeResults.filter((n: any) => n.status === 'failed').length;
                 
                 // Fix status mapping if 'partial' is not in DB but we want it
                 if (r.failedNodes > 0 && r.successfulNodes > 0 && r.status === 'success') {
                     r.status = 'partial';
                 }
             });

             historyStore.setRuns(parsedRuns);
          }
        }
      } catch (error) {
        console.error("Failed to load workflow:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadWorkflow();
  }, [workflowId, setNodes, setEdges]);

  // Center view on initial load
  useEffect(() => {
    if (isLoaded && reactFlowInstance && nodes.length > 0 && !hasFittedRef.current) {
      hasFittedRef.current = true;
      setTimeout(() => {
        reactFlowInstance.fitView({ minZoom: 1, maxZoom: 1, duration: 200 });
      }, 50);
    }
  }, [isLoaded, reactFlowInstance, nodes.length]);

  // Auto-save workflow data
  useEffect(() => {
    if (!workflowId || !isLoaded) return;

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/workflows/${workflowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { nodes, edges }
          })
        });
        console.log("Workflow saved");
      } catch (error) {
        console.error("Failed to save workflow:", error);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [nodes, edges, workflowId, isLoaded]);

  const onInit = useCallback((reactFlowInstance: ReactFlowInstance) => {
    reactFlowInstance.fitView(fitViewOptions);
  }, []);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);
    },
    [nodes, setNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      setEdges(updatedEdges);
    },
    [edges, setEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      connectNodes(connection);
    },
    [connectNodes]
  );

  const handleRunWorkflow = useCallback(async () => {
    try {
      await executeWorkflow();
    } catch (error) {
      console.error("Workflow execution error:", error);
    }
  }, [executeWorkflow]);

  const handleRename = useCallback(async () => {
    setIsEditingName(false);
    if (!workflowId) return;
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workflowName }),
      });
    } catch (error) {
      console.error("Failed to rename workflow:", error);
    }
  }, [workflowId, workflowName]);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const data = {
      name: workflowName,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `${workflowName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'workflow'}.json`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [workflowName, nodes, edges]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const data = JSON.parse(result);

        if (data.nodes && Array.isArray(data.nodes)) {
          setNodes(data.nodes);
        }
        if (data.edges && Array.isArray(data.edges)) {
          setEdges(data.edges);
        }
        if (data.name) {
          setWorkflowName(data.name);
          // Optionally save the new name to backend immediately? 
          // Best to let the user see it first or rely on the rename effect if we had one.
          // But our handleRename is manual. Let's just set state.
        }
        
        // Clear input value so same file can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        
        console.log("Workflow imported successfully");
      } catch (error) {
        console.error("Failed to parse workflow file:", error);
        alert("Invalid workflow file format");
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges]);
  const [selectionMode, setSelectionMode] = useState<"pointer" | "hand">("pointer");

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      
      console.log("Drop event:", { type, hasInstance: !!reactFlowInstance });
      
      if (!type || !reactFlowInstance) {
        console.log("Missing type or instance");
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      console.log("Drop position:", position);

      const id = `${type}-${Date.now()}`;
      let newNode;

      switch (type) {
        case "text":
          newNode = createTextNode(id, position);
          break;
        case "uploadImage":
          newNode = createUploadImageNode(id, position);
          break;
        case "uploadVideo":
          newNode = createUploadVideoNode(id, position);
          break;
        case "cropImage":
          newNode = createCropImageNode(id, position);
          break;
        case "extractFrame":
          newNode = createExtractFrameNode(id, position);
          break;
        case "llm":
          newNode = createLLMNode(id, position);
          break;
        default:
          console.log("Unknown node type:", type);
          return;
      }

      if (newNode) {
        console.log("Adding node:", newNode);
        addNode(newNode);
      }
    },
    [reactFlowInstance, addNode]
  );

  // Undo/Redo functionality
  const undoRedoStore = useUndoRedoStore();

  // Track changes for undo/redo
  useEffect(() => {
    undoRedoStore.set(nodes, edges);
  }, [nodes, edges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete - delete selected nodes (only Delete key, not Backspace)
      if (event.key === "Delete") {
        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length > 0) {
          event.preventDefault();
          // Remove selected nodes and their connected edges
          const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
          const newNodes = nodes.filter((node) => !selectedNodeIds.has(node.id));
          const newEdges = edges.filter(
            (edge) => !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)
          );
          setNodes(newNodes);
          setEdges(newEdges);
        }
      }

      // Undo - Ctrl+Z
      if (event.ctrlKey && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        const previous = undoRedoStore.undo();
        if (previous) {
          setNodes(previous.nodes);
          setEdges(previous.edges);
        }
      }

      // Redo - Ctrl+Shift+Z or Ctrl+Y
      if ((event.ctrlKey && event.shiftKey && event.key === "z") || (event.ctrlKey && event.key === "y")) {
        event.preventDefault();
        const next = undoRedoStore.redo();
        if (next) {
          setNodes(next.nodes);
          setEdges(next.edges);
        }
      }
    };





    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [nodes, edges, setNodes, setEdges, undoRedoStore, selectionMode]);

  // Selective execution
  const handleRunSelected = useCallback(async () => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length === 0) {
      alert("Please select at least one node to run");
      return;
    }

    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    
    // Import history store dynamically
    const { useWorkflowHistoryStore } = await import("@/store/workflowHistoryStore");
    const historyStore = useWorkflowHistoryStore.getState();

    // Determine scope based on number of selected nodes
    const scope = selectedNodes.length === 1 ? "single" : "selected";
    const runId = `Run #${Date.now()}`;
    const startTime = Date.now();
    const nodeExecutionResults: Array<{
      nodeId: string;
      nodeType: string;
      nodeName: string;
      status: "success" | "failed" | "running";
      startedAt: number;
      completedAt?: number;
      duration?: number;
      output?: unknown;
      error?: string;
    }> = [];

    // Add initial run to history
    historyStore.addRun({
      runId,
      scope,
      status: "running",
      startedAt: startTime,
      nodeResults: [],
      totalNodes: selectedNodes.length,
      successfulNodes: 0,
      failedNodes: 0,
      selectedNodeIds: Array.from(selectedNodeIds),
    });

    try {
      await runSelectedNodes(nodes, edges, selectedNodeIds, {
        setNodeStatus: (nodeId, status) => {
          setNodeStatus(nodeId, status);

          // Track node execution
          if (status === "idle") return;

          const node = nodes.find(n => n.id === nodeId);
          if (!node) return;

          const existingResult = nodeExecutionResults.find(r => r.nodeId === nodeId);

          if (status === "running" && !existingResult) {
            nodeExecutionResults.push({
              nodeId,
              nodeType: node.type || "unknown",
              nodeName: (node.data as any)?.label || node.type || "Node",
              status: "running",
              startedAt: Date.now(),
            });
          } else if (existingResult) {
            existingResult.status = status;
            if (status !== "running") {
              existingResult.completedAt = Date.now();
              existingResult.duration = existingResult.completedAt - existingResult.startedAt;
            }
          }
        },
        setNodeResult: (nodeId, result) => {
          setNodeResult(nodeId, result);

          // Update node result in history
          const nodeResult = nodeExecutionResults.find(r => r.nodeId === nodeId);
          if (nodeResult) {
            nodeResult.output = result.output;
          }
        },
        onNodeError: (nodeId, error) => {
          const nodeResult = nodeExecutionResults.find(r => r.nodeId === nodeId);
          if (nodeResult) {
            nodeResult.error = error.message;
            nodeResult.status = "failed";
          }
        },
        onWorkflowComplete: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const successfulNodes = nodeExecutionResults.filter(r => r.status === "success").length;
          const failedNodes = nodeExecutionResults.filter(r => r.status === "failed").length;

          // Update run in history
          historyStore.updateRun(runId, {
            status: failedNodes > 0 ? "partial" : "success",
            completedAt: endTime,
            duration,
            nodeResults: nodeExecutionResults,
            successfulNodes,
            failedNodes,
          });
        },
        onWorkflowError: (error) => {
          console.error("Selected nodes execution error:", error);
          const endTime = Date.now();
          const duration = endTime - startTime;
          const successfulNodes = nodeExecutionResults.filter(r => r.status === "success").length;
          const failedNodes = nodeExecutionResults.filter(r => r.status === "failed").length;

          // Update run in history
          historyStore.updateRun(runId, {
            status: "failed",
            completedAt: endTime,
            duration,
            nodeResults: nodeExecutionResults,
            successfulNodes,
            failedNodes,
          });
        },
      });
    } catch (error) {
      console.error("Selected nodes execution failed:", error);
    }
  }, [nodes, edges, setNodeStatus, setNodeResult]);

  return (
    <div className="h-screen w-full flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      {/* Top Bar */}
      <div
        className="h-14 flex items-center justify-between px-6 border-b"
        style={{
          backgroundColor: "var(--bg)",
          borderColor: "var(--border)",
        }}
      >
        {/* Workflow Name */}
        <div className="flex items-center gap-4">
          {isEditingName ? (
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
              className="px-2 py-1 text-base font-semibold border rounded bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
              autoFocus
            />
          ) : (
            <h1 
              className="text-base font-semibold cursor-pointer px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" 
              onClick={() => setIsEditingName(true)}
              style={{ color: "var(--text-primary)" }}
              title="Click to rename"
            >
              {workflowName}
            </h1>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Import / Export */}
          <button
            onClick={handleImportClick}
            className="px-3 py-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm font-medium"
            title="Import Workflow"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm font-medium"
            title="Export Workflow"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <input
             type="file"
             ref={fileInputRef}
             className="hidden"
             accept=".json"
             onChange={handleFileChange}
          />

          <div className="w-px h-6 mx-1" style={{ backgroundColor: "var(--border)" }} />

          {/* Run Selected Button */}
          <button
            onClick={handleRunSelected}
            disabled={isExecuting || nodes.filter(n => n.selected).length === 0}
            className="px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2 text-sm"
            style={{
              backgroundColor: "transparent",
              color: isExecuting || nodes.filter(n => n.selected).length === 0 ? "var(--text-muted)" : "var(--text-secondary)",
              border: "1px solid var(--border)",
              cursor: isExecuting || nodes.filter(n => n.selected).length === 0 ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isExecuting && nodes.filter(n => n.selected).length > 0) {
                e.currentTarget.style.backgroundColor = "var(--hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = isExecuting || nodes.filter(n => n.selected).length === 0 ? "var(--text-muted)" : "var(--text-secondary)";
            }}
          >
            <Play className="w-4 h-4" />
            Run Selected ({nodes.filter(n => n.selected).length})
          </button>

          {/* Run Workflow Button */}
          <button
            onClick={handleRunWorkflow}
            disabled={isExecuting || nodes.length === 0}
            className="px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2"
            style={{
              backgroundColor: isExecuting || nodes.length === 0 ? "var(--border)" : "var(--accent)",
              color: isExecuting || nodes.length === 0 ? "var(--text-muted)" : "#000000",
              cursor: isExecuting || nodes.length === 0 ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isExecuting && nodes.length > 0) {
                e.currentTarget.style.opacity = "0.9";
              }
            }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <Play className="w-4 h-4" fill="currentColor" />
          {isExecuting ? "Running..." : "Run Workflow"}
        </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <NodePalette />

        {/* Canvas */}
        <div 
          className="flex-1 relative" 
          ref={reactFlowWrapper} 
          onDrop={onDrop} 
          onDragOver={onDragOver}
          style={{
            cursor: selectionMode === "hand" ? "grab" : "default",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            className={selectionMode === "hand" ? "hand-mode" : ""}
            onInit={(instance) => {
              setReactFlowInstance(instance);
              instance.setViewport({ x: 0, y: 0, zoom: 1 });
            }}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            // fitView // Removed to default to 100% zoom
            // fitViewOptions={fitViewOptions}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={selectionMode === "pointer"}
            nodesConnectable={true}
            nodesFocusable={selectionMode === "pointer"}
            edgesFocusable={selectionMode === "pointer"}
            elementsSelectable={selectionMode === "pointer"}
            selectNodesOnDrag={false}
            selectionOnDrag={selectionMode === "pointer"}
            panOnDrag={selectionMode === "hand" ? true : [1, 2]}
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
            multiSelectionKeyCode="Shift"
            deleteKeyCode="Delete"
            selectionKeyCode={null}
          >
            <Background
              gap={24}
              size={1.5}
              color="var(--border)"
            />
            {/* Controls hidden - using custom BottomToolbar instead */}
            <MiniMap
              nodeStrokeWidth={2}
              position="bottom-right"
              pannable
              zoomable
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            />
            {/* Bottom Toolbar */}
            <BottomToolbar 
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
            />
          </ReactFlow>
        </div>

        {/* Right Sidebar - Workflow History */}
        <WorkflowHistory />
      </div>
    </div>
  );
}
