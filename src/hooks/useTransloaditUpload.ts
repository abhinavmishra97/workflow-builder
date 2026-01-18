import { useState, useCallback } from "react";
import Uppy, { UppyFile } from "@uppy/core";
import Transloadit from "@uppy/transloadit";

interface UploadOptions {
    onSuccess?: (url: string) => void;
    onError?: (error: string) => void;
    onProgress?: (progress: number) => void;
    templateId?: string;
    allowedFileTypes?: string[];
}

export function useTransloaditUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const upload = useCallback(
        async (file: File, options: UploadOptions = {}) => {
            const {
                onSuccess,
                onError,
                onProgress,
                templateId,
                allowedFileTypes,
            } = options;

            setIsUploading(true);
            setProgress(0);
            setError(null);

            const transloaditKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY;

            if (!transloaditKey) {
                const msg = "Transloadit key not configured";
                setError(msg);
                onError?.(msg);
                setIsUploading(false);
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const uppy = new Uppy<any, any>({
                autoProceed: false,
                restrictions: {
                    maxFileSize: 500 * 1024 * 1024, // 500MB
                    allowedFileTypes: allowedFileTypes,
                },
            });

            try {
                // Build assembly params
                const assemblyParams: any = {
                    auth: { key: transloaditKey },
                };

                // If template is provided, use it; otherwise define basic upload steps
                if (templateId) {
                    assemblyParams.template_id = templateId;
                } else {
                    // Default: just store the uploaded file
                    assemblyParams.steps = {
                        ":original": {
                            robot: "/upload/handle",
                        },
                    };
                }

                uppy.use(Transloadit, {
                    assemblyOptions: {
                        params: assemblyParams,
                    },
                    waitForEncoding: false, // Don't wait for full encoding, just upload
                    waitForMetadata: false,
                });

                uppy.on(
                    "upload-progress",
                    (_file: UppyFile<any, any> | undefined, uploadProgress) => {
                        if (!uploadProgress || !uploadProgress.bytesTotal) return;

                        const percentage = Math.round(
                            (uploadProgress.bytesUploaded /
                                uploadProgress.bytesTotal) *
                            100
                        );

                        setProgress(percentage);
                        onProgress?.(percentage);
                    }
                );

                uppy.on("complete", (result) => {
                    try {
                        console.log("Transloadit complete result:", result);

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const assembly = (result as any).transloadit?.[0];
                        console.log("Assembly:", assembly);

                        let url: string | undefined;

                        // Try to get URL from assembly results
                        if (assembly?.results) {
                            console.log("Assembly results:", assembly.results);

                            // First try :original step
                            if (assembly.results[":original"]?.[0]) {
                                const original = assembly.results[":original"][0];
                                url = original.ssl_url || original.url;
                                console.log("URL from :original:", url);
                            }

                            // If not found, try first available result
                            if (!url) {
                                const resultKeys = Object.keys(assembly.results);
                                console.log("Available result keys:", resultKeys);

                                for (const key of resultKeys) {
                                    const resultArray = assembly.results[key];
                                    if (Array.isArray(resultArray) && resultArray[0]) {
                                        url = resultArray[0].ssl_url || resultArray[0].url;
                                        if (url) {
                                            console.log(`URL from ${key}:`, url);
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        // Fallback: try to get from uploaded files
                        if (!url && assembly?.uploads) {
                            console.log("Assembly uploads:", assembly.uploads);
                            const uploadKeys = Object.keys(assembly.uploads);
                            if (uploadKeys.length > 0) {
                                const firstUpload = assembly.uploads[uploadKeys[0]];
                                url = firstUpload?.ssl_url || firstUpload?.url;
                                console.log("URL from uploads:", url);
                            }
                        }

                        if (!url) {
                            console.error("No URL found. Full assembly:", JSON.stringify(assembly, null, 2));
                            throw new Error("No URL returned from Transloadit");
                        }

                        console.log("Final URL:", url);
                        onSuccess?.(url);
                    } catch (err) {
                        const msg =
                            err instanceof Error ? err.message : "Upload failed";
                        setError(msg);
                        onError?.(msg);
                    } finally {
                        setIsUploading(false);
                        uppy.destroy();
                    }
                });

                uppy.on("error", (err) => {
                    const msg = err instanceof Error ? err.message : "Upload failed";
                    setError(msg);
                    onError?.(msg);
                    setIsUploading(false);
                    uppy.destroy();
                });

                uppy.addFile({
                    name: file.name,
                    type: file.type,
                    data: file,
                });

                await uppy.upload();
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Upload failed";
                setError(msg);
                onError?.(msg);
                setIsUploading(false);
                uppy.destroy();
            }
        },
        []
    );

    return {
        upload,
        isUploading,
        progress,
        error,
    };
}
