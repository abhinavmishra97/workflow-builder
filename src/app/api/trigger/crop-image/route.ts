import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const {
            imageUrl,
            xPercent = 0,
            yPercent = 0,
            widthPercent = 100,
            heightPercent = 100,
        } = body;

        if (!imageUrl) {
            return NextResponse.json(
                { success: false, error: "imageUrl is required" },
                { status: 400 }
            );
        }

        // Trigger crop-image task and wait for result
        const result = await tasks.triggerAndWait("crop-image", {
            imageUrl,
            xPercent,
            yPercent,
            widthPercent,
            heightPercent,
        });

        if (!result.ok) {
            return NextResponse.json(
                { success: false, error: "Crop task failed" },
                { status: 500 }
            );
        }

        if (!result.output.success) {
            return NextResponse.json(
                { success: false, error: result.output.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            croppedImageUrl: result.output.croppedImageUrl,
        });
    } catch (error) {
        console.error("[Crop API] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}
