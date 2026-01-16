import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { systemPrompt, userMessage, imageUrls, model } = body;

    // Validate required fields
    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    // Get Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);

    // Only gemini-pro (gemini-1.0-pro) is supported in v1beta API
    // Validate and fallback to supported model
    const requestedModel = model || "gemini-pro";
    const supportedModels = ["gemini-pro", "gemini-1.0-pro"];
    const geminiModel = supportedModels.includes(requestedModel) ? requestedModel : "gemini-pro";

    const generativeModel = genAI.getGenerativeModel({ model: geminiModel });

    // Build the prompt
    let promptText = userMessage;
    if (systemPrompt) {
      promptText = `${systemPrompt}\n\n${userMessage}`;
    }

    // Handle images if provided
    let result;
    if (imageUrls && imageUrls.length > 0) {
      // For multimodal (text + images)
      const imageParts = await Promise.all(
        imageUrls.map(async (url: string) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${url}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");

            // Detect mime type
            let mimeType = "image/jpeg";
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.startsWith("image/")) {
              mimeType = contentType;
            } else {
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
        })
      );

      const validImageParts = imageParts.filter((part) => part !== null);

      result = await generativeModel.generateContent([
        promptText,
        ...validImageParts,
      ]);
    } else {
      // Text only
      result = await generativeModel.generateContent(promptText);
    }

    const response = result.response;
    const text = response.text();

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: "No text response from Gemini API",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      output: text,
    });
  } catch (error) {
    console.error("Execute LLM API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
