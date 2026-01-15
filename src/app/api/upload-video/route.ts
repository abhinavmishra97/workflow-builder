import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createHmac } from "crypto";

// Transloadit configuration
const TRANSLOADIT_KEY = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY;
const TRANSLOADIT_SECRET = process.env.TRANSLOADIT_SECRET;
const TRANSLOADIT_TEMPLATE_ID = process.env.TRANSLOADIT_TEMPLATE_ID;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Transloadit is configured
    if (!TRANSLOADIT_KEY || !TRANSLOADIT_SECRET) {
      return NextResponse.json(
        { error: "Transloadit not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only mp4, mov, webm, m4v are allowed." },
        { status: 400 }
      );
    }

    // Create Transloadit assembly params
    // For now, we'll just upload the original video
    // You can add encoding/transcoding later if needed
    const params = TRANSLOADIT_TEMPLATE_ID
      ? { template_id: TRANSLOADIT_TEMPLATE_ID }
      : {
          steps: {
            ":original": {
              robot: "/upload/handle",
            },
          },
        };

    const paramsString = JSON.stringify(params);
    const signature = createHmac("sha1", TRANSLOADIT_SECRET)
      .update(Buffer.from(paramsString, "utf-8"))
      .digest("hex");

    // Create form data for Transloadit
    const transloaditFormData = new FormData();
    transloaditFormData.append("params", paramsString);
    transloaditFormData.append("signature", signature);
    transloaditFormData.append("file", file);

    // Upload to Transloadit
    const transloaditResponse = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: transloaditFormData,
    });

    if (!transloaditResponse.ok) {
      const errorText = await transloaditResponse.text();
      console.error("Transloadit error:", errorText);
      return NextResponse.json(
        { error: "Upload to Transloadit failed" },
        { status: 500 }
      );
    }

    const transloaditResult = await transloaditResponse.json();

    // Check for errors in Transloadit response
    if (transloaditResult.error) {
      console.error("Transloadit error:", transloaditResult.error);
      return NextResponse.json(
        { error: transloaditResult.error || "Transloadit upload failed" },
        { status: 500 }
      );
    }

    // Get the uploaded file URL
    // The structure depends on your Transloadit template/instructions
    let videoUrl: string | null = null;

    if (transloaditResult.results?.[":original"]?.[0]?.ssl_url) {
      videoUrl = transloaditResult.results[":original"][0].ssl_url;
    } else if (transloaditResult.results?.imported?.[0]?.ssl_url) {
      videoUrl = transloaditResult.results.imported[0].ssl_url;
    } else if (transloaditResult.results) {
      // Fallback: get first result URL
      const results = transloaditResult.results;
      const firstKey = Object.keys(results)[0];
      if (firstKey && Array.isArray(results[firstKey]) && results[firstKey][0]?.ssl_url) {
        videoUrl = results[firstKey][0].ssl_url;
      }
    }

    if (!videoUrl) {
      console.error("No URL found in Transloadit response:", JSON.stringify(transloaditResult, null, 2));
      return NextResponse.json(
        { error: "Failed to get uploaded video URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: videoUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
