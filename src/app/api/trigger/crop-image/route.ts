export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs/promises";
import crypto from "crypto";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const execFileAsync = promisify(execFile);

export async function POST(req: Request) {
    let inputPath: string | undefined;
    let outputPath: string | undefined;

    try {
        const { imageUrl, xPercent, yPercent, widthPercent, heightPercent } =
            await req.json();

        if (!imageUrl) {
            return NextResponse.json(
                { success: false, error: "imageUrl is required" },
                { status: 400 }
            );
        }

        if (!ffmpegPath || !ffprobeStatic.path) {
            throw new Error("FFmpeg or FFprobe binary not found");
        }

        const tempDir = os.tmpdir();
        inputPath = path.join(tempDir, `input-${crypto.randomUUID()}.jpg`);
        outputPath = path.join(tempDir, `output-${crypto.randomUUID()}.jpg`);

        /* ---------- DOWNLOAD IMAGE ---------- */
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error("Failed to download image");

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        await fs.writeFile(inputPath, buffer);

        /* ---------- GET DIMENSIONS ---------- */
        const { stdout } = await execFileAsync(ffprobeStatic.path, [
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=s=x:p=0",
            inputPath,
        ]);

        const [width, height] = stdout.trim().split("x").map(Number);

        if (!width || !height) {
            throw new Error("Could not read image dimensions");
        }

        const cropX = Math.round((xPercent / 100) * width);
        const cropY = Math.round((yPercent / 100) * height);
        const cropW = Math.round((widthPercent / 100) * width);
        const cropH = Math.round((heightPercent / 100) * height);

        /* ---------- CROP IMAGE ---------- */
        await execFileAsync(ffmpegPath, [
            "-i", inputPath,
            "-vf", `crop=${cropW}:${cropH}:${cropX}:${cropY}`,
            "-y",
            outputPath,
        ]);

        /* ---------- UPLOAD TO TRANSLOADIT ---------- */
        const formData = new FormData();
        formData.append(
            "params",
            JSON.stringify({
                auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY },
                steps: { ":original": { robot: "/upload/handle" } },
            })
        );

        const cropped = await fs.readFile(outputPath);
        formData.append("file", new Blob([cropped]), "cropped.jpg");

        const uploadRes = await fetch(
            "https://api2.transloadit.com/assemblies",
            { method: "POST", body: formData }
        );

        const uploadJson = await uploadRes.json();
        const fileUrl =
            uploadJson?.uploads?.[0]?.ssl_url ||
            uploadJson?.uploads?.[0]?.url;

        if (!fileUrl) {
            throw new Error("Upload succeeded but no URL returned");
        }

        return NextResponse.json({
            success: true,
            croppedImageUrl: fileUrl,
        });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    } finally {
        if (inputPath) await fs.unlink(inputPath).catch(() => { });
        if (outputPath) await fs.unlink(outputPath).catch(() => { });
    }
}
