import { task } from "@trigger.dev/sdk/v3";

/**
 * Types
 */
export type LLMTaskInput = {
  systemPrompt?: string;
  userMessage: string;
  imageUrls?: string[];
  model?: string;
};

export type LLMTaskOutput = {
  success: boolean;
  output: string;
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

      /**
       * Lock allowed models to prevent runtime 404s
       */
      const ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;
      const model = ALLOWED_MODELS.includes(payload.model as any)
        ? payload.model
        : "gemini-2.5-flash";

      /**
       * IMPORTANT:
       * Gemini 1.5 models ONLY work on v1 (NOT v1beta)
       */
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

      /**
       * Build prompt text
       * Gemini does not support a separate system role, so we merge them
       */
      let promptText = payload.userMessage?.trim();
      if (!promptText) {
        throw new Error("userMessage is required");
      }

      if (payload.systemPrompt?.trim()) {
        promptText = `${payload.systemPrompt.trim()}\n\n${promptText}`;
      }

      /**
       * Build content parts
       */
      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [{ text: promptText }];

      /**
       * Attach images (if any)
       */
      if (payload.imageUrls && payload.imageUrls.length > 0) {
        const imageParts = await Promise.all(
          payload.imageUrls.map(async (url) => {
            try {
              const response = await fetch(url);
              if (!response.ok) return null;

              const buffer = Buffer.from(await response.arrayBuffer());
              const base64 = buffer.toString("base64");

              let mimeType = response.headers.get("content-type") || "image/jpeg";
              if (!mimeType.startsWith("image/")) {
                mimeType = "image/jpeg";
              }

              return {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              };
            } catch {
              return null;
            }
          })
        );

        imageParts
          .filter(
            (p): p is { inlineData: { mimeType: string; data: string } } =>
              p !== null
          )
          .forEach((p) => parts.push(p));
      }

      /**
       * Call Gemini API
       */
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${errText}`);
      }

      const result = await response.json();
      const output =
        result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      if (!output) {
        throw new Error("No text response returned from Gemini");
      }

      return {
        success: true,
        output,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[LLM Task Error]", message);

      return {
        success: false,
        output: "",
        error: message,
      };
    }
  },
});
