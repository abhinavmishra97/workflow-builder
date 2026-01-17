import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { imageUrl, xPercent, yPercent, widthPercent, heightPercent } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
        }

        // Validate percentages
        const x = Math.max(0, Math.min(100, xPercent || 0));
        const y = Math.max(0, Math.min(100, yPercent || 0));
        const width = Math.max(0, Math.min(100, widthPercent || 100));
        const height = Math.max(0, Math.min(100, heightPercent || 100));

        console.log("[Crop Image] Processing crop with params:", { x, y, width, height });

        // For now, return a data structure that the client can use to crop
        // In a production environment, you would:
        // 1. Download the image
        // 2. Crop it server-side (using canvas or sharp)
        // 3. Upload to Transloadit
        // 4. Return the new URL

        // Temporary: Return the original URL with crop metadata
        // The actual cropping will happen client-side in the node
        return NextResponse.json({
            success: true,
            url: imageUrl, // For now, return original URL
            cropData: {
                xPercent: x,
                yPercent: y,
                widthPercent: width,
                heightPercent: height,
            },
            message: "Crop parameters saved. Client-side cropping will be implemented.",
        });
    } catch (error) {
        console.error("[Crop Image] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Crop failed" },
            { status: 500 }
        );
    }
}
