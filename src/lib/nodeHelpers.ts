import type { Node } from "reactflow";
import type { TextNodeData } from "@/components/nodes/TextNode";
import type { UploadImageNodeData } from "@/components/nodes/UploadImageNode";
import type { UploadVideoNodeData } from "@/components/nodes/UploadVideoNode";
import type { LLMNodeData } from "@/components/nodes/LLMNode";
import type { CropImageNodeData } from "@/components/nodes/CropImageNode";
import type { ExtractFrameNodeData } from "@/components/nodes/ExtractFrameNode";

export function createTextNode(
  id: string,
  position: { x: number; y: number },
  data?: Partial<TextNodeData>
): Node<TextNodeData> {
  return {
    id,
    type: "text",
    position,
    data: {
      value: "",
      label: "Text",
      ...data,
    },
  };
}

export function createUploadImageNode(
  id: string,
  position: { x: number; y: number },
  data?: Partial<UploadImageNodeData>
): Node<UploadImageNodeData> {
  return {
    id,
    type: "uploadImage",
    position,
    data: {
      imageUrl: null,
      label: "Upload Image",
      isUploading: false,
      ...data,
    },
  };
}

export function createUploadVideoNode(
  id: string,
  position: { x: number; y: number },
  data?: Partial<UploadVideoNodeData>
): Node<UploadVideoNodeData> {
  return {
    id,
    type: "uploadVideo",
    position,
    data: {
      videoUrl: null,
      label: "Upload Video",
      isUploading: false,
      ...data,
    },
  };
}

export function createLLMNode(
  id: string,
  position: { x: number; y: number },
  data?: Partial<LLMNodeData>
): Node<LLMNodeData> {
  return {
    id,
    type: "llm",
    position,
    data: {
      model: "gemini-1.5-pro",
      systemPrompt: "",
      userMessage: "",
      label: "LLM",
      ...data,
    },
  };
}

export function createCropImageNode(
  id: string,
  position: { x: number; y: number },
  data?: Partial<CropImageNodeData>
): Node<CropImageNodeData> {
  return {
    id,
    type: "cropImage",
    position,
    data: {
      imageUrl: null,
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
      label: "Crop Image",
      ...data,
    },
  };
}

export function createExtractFrameNode(
  id: string,
  position: { x: number; y: number },
  data?: Partial<ExtractFrameNodeData>
): Node<ExtractFrameNodeData> {
  return {
    id,
    type: "extractFrame",
    position,
    data: {
      videoUrl: null,
      timestamp: "0",
      label: "Extract Frame",
      ...data,
    },
  };
}
