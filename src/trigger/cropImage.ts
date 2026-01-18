import { task } from "@trigger.dev/sdk/v3";
import { randomUUID } from "crypto";
import path from "path";
import { writeFile, unlink, readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/* =======================
   TYPES
======================= */

export type CropImageInput = {
    imageUrl: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
};

export type CropImageOutput = {
    success: boolean;
    output?: string;
    error?: string;
};

/* =======================
   TASK
======================= */

export const cropImage = task({
    id: "crop-image",

    async run(payload: CropImageInput): Promise<CropImageOutput> {
        const { imageUrl, xPercent, yPercent, widthPercent, heightPercent } = payload;

        const tempDir = "/tmp";
        const inputFile = `input-${randomUUID()}.jpg`;
        const outputFile = `output-${randomUUID()}.jpg`;

        const inputPath = path.join(tempDir, inputFile);
        const outputPath = path.join(tempDir, outputFile);

        try {
            console.log("[Crop Image] Payload:", payload);

            /* =======================
               DOWNLOAD IMAGE
            ======================= */
            const res = await fetch(imageUrl);
            if (!res.ok) {
                throw new Error(`Failed to download image (${res.status})`);
            }

            const buffer = Buffer.from(await res.arrayBuffer());
            await writeFile(inputPath, buffer);

            /* =======================
               READ DIMENSIONS
            ======================= */
            const { stdout } = await execAsync(
                `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`
            );

            const [widthStr, heightStr] = stdout.trim().split("x");
            const originalWidth = Number(widthStr);
            const originalHeight = Number(heightStr);

            if (!originalWidth || !originalHeight) {
                throw new Error("Could not determine image dimensions");
            }

            /* =======================
               CALCULATE CROP
            ======================= */
            const cropX = Math.round((xPercent / 100) * originalWidth);
            const cropY = Math.round((yPercent / 100) * originalHeight);
            const cropWidth = Math.round((widthPercent / 100) * originalWidth);
            const cropHeight = Math.round((heightPercent / 100) * originalHeight);

            if (cropWidth <= 0 || cropHeight <= 0) {
                throw new Error("Invalid crop dimensions");
            }

            /* =======================
               CROP IMAGE
            ======================= */
            const cropFilter = `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`;
            await execAsync(
                `ffmpeg -i "${inputPath}" -vf "${cropFilter}" -y "${outputPath}"`
            );

            /* =======================
               UPLOAD TO TRANSLOADIT
            ======================= */
            const TRANSLOADIT_KEY = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY;

            if (!TRANSLOADIT_KEY) {
                throw new Error("NEXT_PUBLIC_TRANSLOADIT_KEY not set");
            }

            const croppedBuffer = await readFile(outputPath);
            const blob = new Blob([croppedBuffer], { type: "image/jpeg" });

            const formData = new FormData();
            formData.append(
                "params",
                JSON.stringify({
                    auth: { key: TRANSLOADIT_KEY },
                    steps: {
                        ":original": {
                            robot: "/upload/handle",
                        },
                    },
                })
            );
            formData.append("file", blob, outputFile);

            const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) {
                throw new Error("Transloadit upload failed");
            }

            const uploadJson = await uploadRes.json();

            const uploaded =
                uploadJson?.results?.[":original"]?.[0]?.ssl_url ||
                uploadJson?.results?.[":original"]?.[0]?.url;

            if (!uploaded) {
                throw new Error("No URL returned from Transloadit");
            }

            /* =======================
               CLEANUP
            ======================= */
            await unlink(inputPath).catch(() => { });
            await unlink(outputPath).catch(() => { });

            /* =======================
               ✅ RETURN (IMPORTANT)
            ======================= */
            return {
                success: true,
                output: uploaded, // 🔑 THIS MAKES UI + RESULT BOX WORK
            };
        } catch (err) {
            console.error("[Crop Image] Error:", err);

            await unlink(inputPath).catch(() => { });
            await unlink(outputPath).catch(() => { });

            return {
                success: false,
                error: err instanceof Error ? err.message : "Crop failed",
            };
        }
    },
});
