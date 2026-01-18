
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
        const { videoUrl, timestamp } = await req.json();

        if (!videoUrl) {
            return NextResponse.json(
                { success: false, error: "videoUrl is required" },
                { status: 400 }
            );
        }

        if (!ffmpegPath || !ffprobeStatic.path) {
            throw new Error("FFmpeg or FFprobe binary not found");
        }

        const tempDir = os.tmpdir();
        const uuid = crypto.randomUUID();
        inputPath = path.join(tempDir, `input-${uuid}.mp4`);
        outputPath = path.join(tempDir, `output-${uuid}.jpg`);

        /* ---------- DOWNLOAD VIDEO ---------- */
        const vidRes = await fetch(videoUrl);
        if (!vidRes.ok) throw new Error("Failed to download video");

        const buffer = Buffer.from(await vidRes.arrayBuffer());
        await fs.writeFile(inputPath, buffer);

        /* ---------- RESOLVE TIMESTAMP ---------- */
        let seekTime = "0";

        if (timestamp.toString().includes("%")) {
            // Calculate absolute time from percentage
            const { stdout } = await execFileAsync(ffprobeStatic.path, [
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                inputPath,
            ]);

            const duration = parseFloat(stdout.trim());
            if (isNaN(duration)) throw new Error("Could not determine video duration");

            const percent = parseFloat(timestamp) / 100;
            seekTime = (duration * percent).toFixed(2);
        } else {
            seekTime = timestamp.toString();
        }

        /* ---------- EXTRACT FRAME ---------- */
        // ffmpeg -ss <time> -i <input> -frames:v 1 -q:v 2 <output>
        await execFileAsync(ffmpegPath, [
            "-ss", seekTime,
            "-i", inputPath,
            "-frames:v", "1",
            "-q:v", "2", // High quality JPEG
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

        const frameBuffer = await fs.readFile(outputPath);
        formData.append("file", new Blob([frameBuffer]), "frame.jpg");

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
            extractedFrameUrl: fileUrl,
        });
    } catch (err: any) {
        console.error("Extract frame error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    } finally {
        if (inputPath) await fs.unlink(inputPath).catch(() => { });
        if (outputPath) await fs.unlink(outputPath).catch(() => { });
    }
}
