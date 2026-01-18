import type { Node, Edge } from "reactflow";
import { getExecutionOrder } from "./dag";
import type { NodeExecutionStatus, NodeResult } from "@/types/workflow";
import type { LLMNodeData } from "@/components/nodes/LLMNode";

export type ExecutionCallbacks = {
  setNodeStatus?: (nodeId: string, status: NodeExecutionStatus) => void;
  setNodeResult?: (nodeId: string, result: Omit<NodeResult, "nodeId">) => void;
  onNodeError?: (nodeId: string, error: Error) => void;
  onWorkflowComplete?: () => void;
  onWorkflowError?: (error: Error) => void;
};

/**
 * Executes a workflow from the frontend.
 * This file NEVER imports Trigger.dev SDK directly.
 * It talks ONLY to API routes.
 */
export async function runWorkflow(
  nodes: Node[],
  edges: Edge[],
  callbacks: ExecutionCallbacks = {},
  workflowId?: string
): Promise<void> {
  const { setNodeStatus, setNodeResult, onNodeError, onWorkflowComplete, onWorkflowError } =
    callbacks;

  try {
    // Reset all nodes
    nodes.forEach((n) => setNodeStatus?.(n.id, "idle"));

    // Validate DAG
    const executionOrder = getExecutionOrder(nodes, edges);

    let workflowRunId: string | undefined;

    if (workflowId) {
      const res = await fetch("/api/workflow/create-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, nodes }),
      });

      if (!res.ok) {
        throw new Error("Failed to create workflow run");
      }

      const data = await res.json();
      workflowRunId = data.runId;
    }

    const nodeResults: Record<string, any> = {};

    for (const node of executionOrder) {
      try {
        setNodeStatus?.(node.id, "running");

        const result = await executeNode(node, nodes, edges, nodeResults);

        nodeResults[node.id] = result;

        setNodeStatus?.(node.id, "success");
        setNodeResult?.(node.id, {
          output: result,
          timestamp: Date.now(),
        });

        if (workflowRunId) {
          await fetch("/api/workflow/update-node", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              runId: workflowRunId,
              nodeId: node.id,
              status: "success",
              output: result,
            }),
          });
        }
      } catch (err) {
        const error = err as Error;

        setNodeStatus?.(node.id, "failed");
        onNodeError?.(node.id, error);

        if (workflowRunId) {
          await fetch("/api/workflow/update-node", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              runId: workflowRunId,
              nodeId: node.id,
              status: "failed",
              error: error.message,
            }),
          });
        }

        throw error;
      }
    }

    onWorkflowComplete?.();
  } catch (err) {
    onWorkflowError?.(err as Error);
  }
}

/**
 * Executes a single node.
 */
async function executeNode(
  node: Node,
  allNodes: Node[],
  allEdges: Edge[],
  nodeResults: Record<string, any>
): Promise<any> {
  /* =======================
     LLM NODE (FIXED)
     ======================= */
  if (node.type === "llm") {
    const data = node.data as LLMNodeData;

    // 1️⃣ Collect userMessage from connected Text nodes
    let userMessage = "";

    const incomingEdges = allEdges.filter(
      (e) => e.target === node.id
    );

    for (const edge of incomingEdges) {
      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      // Text → LLM always feeds userMessage
      if (sourceNode.type === "text") {
        const value = (sourceNode.data as any)?.value;
        if (typeof value === "string" && value.trim()) {
          userMessage = value.trim();
          break;
        }
      }
    }

    // 2️⃣ Collect images from connected nodes (UploadImage, CropImage)
    const imageUrls: string[] = [];

    for (const edge of incomingEdges) {
      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      if (sourceNode.type === "uploadImage" || sourceNode.type === "cropImage" || sourceNode.type === "extractFrame") {
        const result = nodeResults[edge.source];
        if (typeof result === "string" && result.startsWith("http")) {
          imageUrls.push(result);
        }
      }
    }

    // 3️⃣ Fallback to LLM node textarea
    if (!userMessage && data.userMessage?.trim()) {
      userMessage = data.userMessage.trim();
    }

    // 4️⃣ HARD VALIDATION
    if (!userMessage) {
      throw new Error(
        "LLM node requires a user message. Connect a Text node or enter text directly."
      );
    }

    const response = await fetch("/api/trigger/execute-llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: data.systemPrompt || undefined,
        userMessage,
        imageUrls,
        model: data.model || "gemini-2.5-flash",
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "LLM execution failed");
    }

    return result.output;
  }


  /* =======================
        CROP IMAGE NODE
    ======================= */

  if (node.type === "cropImage") {
    const data = node.data as {
      imageUrl?: string | null;
      xPercent?: number;
      yPercent?: number;
      widthPercent?: number;
      heightPercent?: number;
    };

    // Resolve imageUrl from connected UploadImage node
    let imageUrl = data.imageUrl;

    const imageEdge = allEdges.find(
      (e) => e.target === node.id && e.targetHandle === "image"
    );

    if (imageEdge) {
      const upstream = nodeResults[imageEdge.source];
      if (typeof upstream === "string") {
        imageUrl = upstream;
      }
    }

    if (!imageUrl) {
      throw new Error("CropImage node requires an image input");
    }

    const res = await fetch("/api/trigger/crop-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        xPercent: data.xPercent ?? 0,
        yPercent: data.yPercent ?? 0,
        widthPercent: data.widthPercent ?? 100,
        heightPercent: data.heightPercent ?? 100,
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.error || "Crop failed");
    }

    // 🔑 RETURN STRING URL — this feeds result box + next nodes
    return result.croppedImageUrl;
  }




  /* =======================
        EXTRACT FRAME NODE
     ======================= */
  if (node.type === "extractFrame") {
    const data = node.data as {
      videoUrl?: string | null;
      timestamp?: string;
    };

    let videoUrl = data.videoUrl;

    // Resolve videoUrl from connected UploadVideo node
    const videoEdge = allEdges.find(
      (e) => e.target === node.id && e.targetHandle === "video_url"
    );

    if (videoEdge) {
      const upstream = nodeResults[videoEdge.source];
      if (typeof upstream === "string") {
        videoUrl = upstream;
      }
    }

    if (!videoUrl) {
      throw new Error("ExtractFrame node requires a video input");
    }

    const res = await fetch("/api/trigger/extract-frame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl,
        timestamp: data.timestamp || "0",
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.error || "Frame extraction failed");
    }

    return result.extractedFrameUrl;
  }

  /* =======================
     SIMPLE / MOCK NODES
     ======================= */
  if (node.type === "text") {
    return (node.data as any)?.value || "";
  }

  if (node.type === "uploadImage") {
    return (node.data as any)?.imageUrl || null;
  }

  if (node.type === "uploadVideo") {
    return (node.data as any)?.videoUrl || null;
  }

  return null;
}
