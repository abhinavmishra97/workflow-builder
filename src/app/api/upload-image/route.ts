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
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only jpg, jpeg, png, webp, gif are allowed." },
        { status: 400 }
      );
    }

    // Create Transloadit assembly params
    const params = TRANSLOADIT_TEMPLATE_ID
      ? { template_id: TRANSLOADIT_TEMPLATE_ID }
      : {
          steps: {
            imported: {
              robot: "/image/resize",
              width: 1920,
              height: 1920,
              resize_strategy: "fit",
              format: "png",
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
    let imageUrl: string | null = null;

    if (transloaditResult.results?.imported?.[0]?.ssl_url) {
      imageUrl = transloaditResult.results.imported[0].ssl_url;
    } else if (transloaditResult.results?.[":original"]?.[0]?.ssl_url) {
      imageUrl = transloaditResult.results[":original"][0].ssl_url;
    } else if (transloaditResult.results) {
      // Fallback: get first result URL
      const results = transloaditResult.results;
      const firstKey = Object.keys(results)[0];
      if (firstKey && Array.isArray(results[firstKey]) && results[firstKey][0]?.ssl_url) {
        imageUrl = results[firstKey][0].ssl_url;
      }
    }

    if (!imageUrl) {
      console.error("No URL found in Transloadit response:", JSON.stringify(transloaditResult, null, 2));
      return NextResponse.json(
        { error: "Failed to get uploaded image URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
