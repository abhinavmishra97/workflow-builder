import type { Node } from "reactflow";
import type { TextNodeData } from "@/components/nodes/TextNode";

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
