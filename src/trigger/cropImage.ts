import { task } from "@trigger.dev/sdk/v3";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

interface CropImageInput {
    imageUrl: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
}

interface CropImageOutput {
    success: boolean;
    croppedImageUrl?: string;
    error?: string;
}

export const cropImage = task({
    id: "crop-image",
    async run(payload: CropImageInput): Promise<CropImageOutput> {
        const { imageUrl, xPercent, yPercent, widthPercent, heightPercent } = payload;

        const tempDir = "/tmp";
        const inputFileName = `input-${randomUUID()}.jpg`;
        const outputFileName = `output-${randomUUID()}.jpg`;
        const inputPath = path.join(tempDir, inputFileName);
        const outputPath = path.join(tempDir, outputFileName);

        try {
            console.log("[Crop Image] Starting crop operation", {
                imageUrl,
                xPercent,
                yPercent,
                widthPercent,
                heightPercent,
            });

            // Download the image
            console.log("[Crop Image] Downloading image from:", imageUrl);
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to download image: ${imageResponse.statusText}`);
            }

            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            await writeFile(inputPath, imageBuffer);
            console.log("[Crop Image] Image downloaded to:", inputPath);

            // Get image dimensions using ffprobe
            const { stdout: probeOutput } = await execAsync(
                `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`
            );
            const [widthStr, heightStr] = probeOutput.trim().split("x");
            const originalWidth = parseInt(widthStr, 10);
            const originalHeight = parseInt(heightStr, 10);

            console.log("[Crop Image] Original dimensions:", { originalWidth, originalHeight });

            if (!originalWidth || !originalHeight) {
                throw new Error("Could not determine image dimensions");
            }

            // Calculate crop dimensions in pixels
            const cropX = Math.round((xPercent / 100) * originalWidth);
            const cropY = Math.round((yPercent / 100) * originalHeight);
            const cropWidth = Math.round((widthPercent / 100) * originalWidth);
            const cropHeight = Math.round((heightPercent / 100) * originalHeight);

            console.log("[Crop Image] Crop dimensions:", {
                cropX,
                cropY,
                cropWidth,
                cropHeight,
            });

            // Validate crop dimensions
            if (cropWidth <= 0 || cropHeight <= 0) {
                throw new Error("Invalid crop dimensions");
            }

            // Crop using FFmpeg
            const cropFilter = `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`;
            const ffmpegCommand = `ffmpeg -i "${inputPath}" -vf "${cropFilter}" -y "${outputPath}"`;

            console.log("[Crop Image] Running FFmpeg command:", ffmpegCommand);
            await execAsync(ffmpegCommand);
            console.log("[Crop Image] Image cropped successfully");

            // Upload to Transloadit
            const transloaditKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY;
            if (!transloaditKey) {
                throw new Error("Transloadit key not configured");
            }

            console.log("[Crop Image] Uploading to Transloadit");
            const croppedImageBuffer = await require("fs").promises.readFile(outputPath);
            const croppedImageBlob = new Blob([croppedImageBuffer], { type: "image/jpeg" });

            const formData = new FormData();
            formData.append("params", JSON.stringify({
                auth: { key: transloaditKey },
                steps: {
                    ":original": {
                        robot: "/upload/handle",
                    },
                },
            }));
            formData.append("file", croppedImageBlob, outputFileName);

            const transloaditResponse = await fetch("https://api2.transloadit.com/assemblies", {
                method: "POST",
                body: formData,
            });

            if (!transloaditResponse.ok) {
                const errorText = await transloaditResponse.text();
                throw new Error(`Transloadit upload failed: ${errorText}`);
            }

            const transloaditResult = await transloaditResponse.json();
            console.log("[Crop Image] Transloadit result:", transloaditResult);

            // Extract URL from Transloadit response
            let croppedImageUrl: string | undefined;
            if (transloaditResult.results?.[":original"]?.[0]) {
                const original = transloaditResult.results[":original"][0];
                croppedImageUrl = original.ssl_url || original.url;
            }

            if (!croppedImageUrl) {
                throw new Error("No URL returned from Transloadit");
            }

            console.log("[Crop Image] Upload successful, URL:", croppedImageUrl);

            // Cleanup temp files
            await unlink(inputPath).catch(() => { });
            await unlink(outputPath).catch(() => { });

            return {
                success: true,
                croppedImageUrl,
            };
        } catch (error) {
            console.error("[Crop Image] Error:", error);

            // Cleanup temp files on error
            await unlink(inputPath).catch(() => { });
            await unlink(outputPath).catch(() => { });

            return {
                success: false,
                error: error instanceof Error ? error.message : "Crop failed",
            };
        }
    },
});
