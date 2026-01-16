import { task } from "@trigger.dev/sdk/v3";

export type LLMTaskInput = {
  systemPrompt?: string;
  userMessage: string;
  imageUrls?: string[];
  model: string;
};

export type LLMTaskOutput = {
  output: string;
  success: boolean;
  error?: string;
};

export const executeLLMTask = task({
  id: "execute-llm",
  run: async (payload: LLMTaskInput): Promise<LLMTaskOutput> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

      // Use Gemini REST API directly since we might not have the SDK installed
      const model = payload.model || "gemini-1.5-pro";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // Build content parts for Gemini
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      // Build the prompt text (Gemini doesn't have separate system prompt, so we combine them)
      let promptText = payload.userMessage;
      if (payload.systemPrompt) {
        // Format: system instruction followed by user message
        promptText = `${payload.systemPrompt}\n\n${payload.userMessage}`;
      }

      // Add text content as first part
      if (promptText.trim()) {
        parts.push({ text: promptText });
      }

      // Handle images if provided
      if (payload.imageUrls && payload.imageUrls.length > 0) {
        // Fetch images and convert to base64
        const imagePromises = payload.imageUrls.map(async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${url}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");

            // Detect mime type from URL or response headers
            let mimeType = "image/jpeg";
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.startsWith("image/")) {
              mimeType = contentType;
            } else {
              // Fallback to URL extension
              if (url.includes(".png")) mimeType = "image/png";
              else if (url.includes(".webp")) mimeType = "image/webp";
              else if (url.includes(".gif")) mimeType = "image/gif";
            }

            return {
              inlineData: {
                mimeType,
                data: base64,
              },
            };
          } catch (error) {
            console.error(`Error processing image ${url}:`, error);
            return null;
          }
        });

        const imageParts = await Promise.all(imagePromises);
        // Filter out null values and add to parts
        imageParts.filter((part): part is { inlineData: { mimeType: string; data: string } } => part !== null).forEach((part) => {
          parts.push(part);
        });
      }

      // Call Gemini API
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Extract text from Gemini response
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!text) {
        throw new Error("No text response from Gemini API");
      }

      return {
        output: text,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("LLM task error:", errorMessage);

      return {
        output: "",
        success: false,
        error: errorMessage,
      };
    }
  },
});
