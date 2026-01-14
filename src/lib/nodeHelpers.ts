import type { Node } from "reactflow";
import type { TextNodeData } from "@/components/nodes/TextNode";
import type { UploadImageNodeData } from "@/components/nodes/UploadImageNode";

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
