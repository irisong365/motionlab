"use client";

import React, { useEffect, useRef, useState } from "react";
import { buildRunningFormAnalysis } from "../lib/analysis/metrics";
import type { PoseFrame, RunningFormAnalysis } from "../lib/analysis/types";
import { estimatePoseOnCanvas } from "../lib/pose/estimator";
import { SkeletonViewer } from "./components/SkeletonViewer";
import { BodyDiagram } from "./components/BodyDiagram";

type AnalysisPhase = "idle" | "preparing" | "analyzing" | "done" | "error";
type InputMode = "none" | "video" | "images";

const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // ~150 MB upload limit
const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // ~25 MB per image
const MAX_IMAGE_COUNT = 16;
const MAX_ANALYSIS_DURATION_SEC = 20; // analyze at most first 20 seconds
const MAX_ANALYSIS_WIDTH = 720; // downscale frames for pose model

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<
    { url: string; name: string }[]
  >([]);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RunningFormAnalysis | null>(null);
  const [poseFrames, setPoseFrames] = useState<PoseFrame[] | null>(null);
  const [progress, setProgress] = useState<string>("");

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      imageFiles.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [videoUrl, imageFiles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_BYTES) {
      setError("Video is too large. Please upload a clip under ~150 MB.");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file (mp4, mov, webm, etc.)");
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setFileName(file.name);
    setImageFiles([]);
    setInputMode("video");
    setAnalysis(null);
    setPoseFrames(null);
    setError(null);
    setPhase("idle");
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (files.length > MAX_IMAGE_COUNT) {
      setError(
        `Please select up to ${MAX_IMAGE_COUNT} images for a sequence analysis.`
      );
      return;
    }

    const images: { url: string; name: string }[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed in this section.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(
          "One of the images is too large. Please keep each image under ~25 MB."
        );
        return;
      }
      const url = URL.createObjectURL(file);
      images.push({ url, name: file.name });
    }

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    setVideoUrl(null);
    setFileName(
      images.length === 1
        ? images[0].name
        : `${images.length} images selected`
    );
    setImageFiles(images);
    setInputMode("images");
    setAnalysis(null);
    setPoseFrames(null);
    setError(null);
    setPhase("idle");
  };

  const extractFrames = async (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): Promise<PoseFrame[]> => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    return new Promise<PoseFrame[]>((resolve) => {
      const frames: PoseFrame[] = [];

      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        resolve([]);
        return;
      }

      const usedDuration = Math.min(duration, MAX_ANALYSIS_DURATION_SEC);
      const sampleCount = 50;
      const dt = usedDuration / sampleCount;

      const handleSeeked = async () => {
        const t = video.currentTime;

        const targetWidth = Math.min(video.videoWidth, MAX_ANALYSIS_WIDTH);
        const aspect =
          video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 9 / 16;
        canvas.width = targetWidth;
        canvas.height = targetWidth * aspect;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const keypoints = await estimatePoseOnCanvas(canvas);
          frames.push({ time: t, keypoints });
          
          // Update progress
          const progressPercent = Math.round((frames.length / sampleCount) * 100);
          setProgress(`Analyzing pose: ${progressPercent}% (frame ${frames.length}/${sampleCount})`);
          console.log(`Processed frame ${frames.length}/${sampleCount}`);

          if (t + dt <= usedDuration) {
            video.currentTime = t + dt;
          } else {
            video.removeEventListener("seeked", handleSeeked);
            resolve(frames);
          }
        } catch (err) {
          console.error("Error processing frame:", err);
          // Continue with next frame even if one fails
          if (t + dt <= usedDuration) {
            video.currentTime = t + dt;
          } else {
            video.removeEventListener("seeked", handleSeeked);
            resolve(frames);
          }
        }
      };

      video.addEventListener("seeked", handleSeeked);
      video.currentTime = 0;
    });
  };

  const extractImageFrames = async (
    images: { url: string; name: string }[],
    canvas: HTMLCanvasElement
  ): Promise<PoseFrame[]> => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const frames: PoseFrame[] = [];

    for (let i = 0; i < images.length; i++) {
      const { url } = images[i];
      const img = new Image();
      img.src = url;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      canvas.width = img.width || 640;
      canvas.height = img.height || 360;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        const keypoints = await estimatePoseOnCanvas(canvas);
        frames.push({
          time: i * (1 / 30),
          keypoints,
        });
        
        // Update progress
        const progressPercent = Math.round(((i + 1) / images.length) * 100);
        setProgress(`Analyzing image ${i + 1}/${images.length} (${progressPercent}%)`);
        console.log(`Processed image ${i + 1}/${images.length}`);
      } catch (err) {
        console.error(`Error processing image ${i + 1}:`, err);
        // Continue with next image even if one fails
      }
    }

    return frames;
  };

  const handleAnalyze = async () => {
    if (!canvasRef.current) return;
    if (inputMode === "video" && !videoRef.current) return;
    if (inputMode === "none") {
      setError("Upload a video or a set of images first.");
      return;
    }

    setPhase("preparing");
    setError(null);
    setProgress("Loading MediaPipe AI model (first time may take 10-30 seconds)...");

    try {
      // Pre-load MediaPipe model
      console.log("Pre-loading MediaPipe pose detection model...");
      const dummyCanvas = document.createElement("canvas");
      dummyCanvas.width = 640;
      dummyCanvas.height = 480;
      const ctx = dummyCanvas.getContext("2d");
      if (ctx) {
        // Draw a simple gradient so the canvas isn't blank
        const gradient = ctx.createLinearGradient(0, 0, 640, 480);
        gradient.addColorStop(0, "#000000");
        gradient.addColorStop(1, "#333333");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 640, 480);
      }
      
      try {
        await estimatePoseOnCanvas(dummyCanvas);
        console.log("✅ MediaPipe model loaded and ready!");
      } catch (e) {
        console.log("Model pre-load completed with info:", e);
      }
      
      setPhase("analyzing");
      setProgress("Analyzing your video with AI pose detection...");
      console.log("Starting frame extraction...");

      let frames: PoseFrame[] = [];

      if (inputMode === "video" && videoRef.current && videoUrl) {
        const video = videoRef.current;

        if (video.readyState < 2) {
          console.log("Waiting for video metadata...");
          setProgress("Loading video...");
          await new Promise<void>((resolve, reject) => {
            const onLoaded = () => {
              video.removeEventListener("loadedmetadata", onLoaded);
              video.removeEventListener("error", onError);
              resolve();
            };
            const onError = () => {
              video.removeEventListener("loadedmetadata", onLoaded);
              video.removeEventListener("error", onError);
              reject(new Error("Failed to load video metadata"));
            };
            video.addEventListener("loadedmetadata", onLoaded);
            video.addEventListener("error", onError);
          });
        }

        console.log(`Video ready: ${video.duration}s, ${video.videoWidth}x${video.videoHeight}`);
        setProgress("Analyzing pose in each frame (this may take a minute)...");
        frames = await extractFrames(video, canvasRef.current);
        console.log(`Extracted ${frames.length} frames`);
      } else if (inputMode === "images" && imageFiles.length > 0) {
        console.log(`Processing ${imageFiles.length} images...`);
        setProgress(`Analyzing ${imageFiles.length} images...`);
        frames = await extractImageFrames(imageFiles, canvasRef.current);
        console.log(`Extracted ${frames.length} frames from images`);
      }

      if (!frames.length) {
        throw new Error(
          "No frames could be sampled from the video. Try a different clip."
        );
      }

      console.log("Building analysis from frames...");
      setProgress("Computing biomechanical metrics...");
      const analysisResult = buildRunningFormAnalysis(frames);
      console.log("Analysis complete:", analysisResult);
      
      setAnalysis(analysisResult);
      setPoseFrames(frames);
      setPhase("done");
      setProgress("");
    } catch (err) {
      console.error("Analysis error:", err);
      const message =
        err instanceof Error ? err.message : "Unknown error during analysis.";
      setError(message);
      setPhase("error");
      setProgress("");
    }
  };

  const disabled =
    (inputMode === "video" && !videoUrl) ||
    (inputMode === "images" && imageFiles.length === 0) ||
    phase === "preparing" ||
    phase === "analyzing";

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 text-zinc-50">
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                MotionLab
              </span>
            </h1>
            <div className="flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></div>
              <p className="text-xs font-medium uppercase tracking-wide text-sky-400">
                AI-Powered Analysis
              </p>
            </div>
          </div>

        {/* Getting Started Callout */}
        {!analysis && (
          <div className="mb-4 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-900/30 via-zinc-900/40 to-emerald-900/30 p-4 shadow-lg shadow-sky-500/5">
            <div className="flex gap-3">
              <div className="text-3xl">✨</div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-100">Run your first analysis</p>
                <div className="grid gap-2 text-xs text-zinc-200 sm:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <span className="text-sky-300 font-semibold">1</span>
                    <p>Pick <span className="font-semibold text-sky-100">Video</span> for a 5-20s side-view clip or <span className="font-semibold text-emerald-100">Images</span> for 6-16 sequential frames.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sky-300 font-semibold">2</span>
                    <p>Upload the file(s) below so we can extract key poses for your runner.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sky-300 font-semibold">3</span>
                    <p>Hit <span className="font-semibold text-sky-100">Analyze Running Form</span> to generate the 3D skeleton, metrics, and coaching notes.</p>
                  </div>
                </div>
                <p className="text-[11px] text-sky-200/80">
                  Tips: keep the full body in frame, stable camera, and clear lighting for best results.
                </p>
              </div>
            </div>
          </div>
        )}

          {/* Reasonable Upload Section */}
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="video-upload"
                className={`cursor-pointer rounded-lg border-2 ${
                  inputMode === "video" ? "border-sky-500 bg-sky-500/10" : "border-zinc-700 bg-zinc-800/50"
                } px-4 py-3 hover:bg-zinc-800 transition-all flex items-center gap-3`}
              >
                <span className="text-2xl">🎥</span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Video</p>
                  {inputMode === "video" && fileName && (
                    <p className="text-xs text-sky-400">{fileName}</p>
                  )}
                </div>
              </label>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <label
                htmlFor="image-upload"
                className={`cursor-pointer rounded-lg border-2 ${
                  inputMode === "images" ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-700 bg-zinc-800/50"
                } px-4 py-3 hover:bg-zinc-800 transition-all flex items-center gap-3`}
              >
                <span className="text-2xl">📸</span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Images</p>
                  {inputMode === "images" && fileName && (
                    <p className="text-xs text-emerald-400">{fileName}</p>
                  )}
                </div>
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={disabled}
                className={`ml-auto rounded-lg px-6 py-3 text-sm font-bold transition-all ${
                  disabled
                    ? "cursor-not-allowed bg-zinc-800 text-zinc-500"
                    : "bg-gradient-to-r from-sky-500 to-emerald-500 text-white hover:from-sky-400 hover:to-emerald-400 shadow-lg hover:shadow-xl"
                }`}
              >
                {phase === "analyzing" ? "⏳ Analyzing..." : phase === "preparing" ? "⚡ Preparing..." : "✨ Analyze Running Form"}
              </button>
            </div>

            {/* Progress/Error */}
            {progress && (
              <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-900/20 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
                  <p className="text-sm text-sky-300">{progress}</p>
                </div>
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-900/20 p-3">
                <p className="text-sm text-red-300">⚠️ {error}</p>
              </div>
            )}
          </div>
        </header>

        {/* Hidden video/canvas for analysis */}
        {videoUrl && (
          <video 
            ref={videoRef} 
            src={videoUrl}
            muted
            playsInline
            preload="metadata"
            className="hidden"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Preview (if uploaded) */}
        {videoUrl && (
          <div className="mb-4 rounded-xl border border-zinc-800/50 bg-zinc-900/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-b border-zinc-800/50">
              <p className="text-xs font-semibold text-zinc-300">Uploaded Video</p>
              <button
                onClick={() => {
                  setVideoUrl(null);
                  setFileName(null);
                  setInputMode("none");
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
            <video
              src={videoUrl}
              controls
              muted
              playsInline
              preload="metadata"
              className="w-full max-h-48 bg-black"
            />
          </div>
        )}

        {/* Images Preview (if uploaded) */}
        {imageFiles.length > 0 && (
          <div className="mb-4 rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-zinc-300">Uploaded Images ({imageFiles.length})</p>
              <button
                onClick={() => {
                  setImageFiles([]);
                  setFileName(null);
                  setInputMode("none");
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {imageFiles.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={`Frame ${i + 1}`}
                  className="h-24 rounded border border-zinc-700"
                />
              ))}
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        <section className="space-y-4">
          {/* Metrics Row - Full Width */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn">
            <CircularMetric
              title="Posture"
              value={
                analysis?.metrics.forwardLeanDeg
                  ? analysis.metrics.forwardLeanDeg.mean.toFixed(1)
                  : "..."
              }
              unit="°"
              score={
                analysis?.metrics.forwardLeanDeg
                  ? (() => {
                      const lean = analysis.metrics.forwardLeanDeg.mean;
                      if (lean >= 5 && lean <= 10) return 1.0;
                      if (lean >= 3 && lean <= 12) return 0.8;
                      if (lean >= 1 && lean <= 15) return 0.5;
                      return 0.3;
                    })()
                  : undefined
              }
              isPending={!analysis}
            />
            <CircularMetric
              title="Cadence"
              value={
                analysis?.metrics.cadenceSpm
                  ? analysis.metrics.cadenceSpm.toFixed(0)
                  : "..."
              }
              unit="spm"
              score={
                analysis?.metrics.cadenceSpm
                  ? (() => {
                      const cadence = analysis.metrics.cadenceSpm;
                      if (cadence >= 165 && cadence <= 185) return 1.0;
                      if (cadence >= 155 && cadence <= 195) return 0.7;
                      if (cadence >= 145 && cadence <= 205) return 0.5;
                      return 0.3;
                    })()
                  : undefined
              }
              isPending={!analysis}
            />
            <CircularMetric
              title="Hip Stability"
              value={
                analysis?.metrics.hipDropDeg
                  ? analysis.metrics.hipDropDeg.asymmetry.toFixed(1)
                  : "..."
              }
              unit="° drop"
              score={
                analysis?.metrics.hipDropDeg
                  ? (() => {
                      const asymmetry = analysis.metrics.hipDropDeg.asymmetry;
                      if (asymmetry < 2) return 1.0;
                      if (asymmetry < 3) return 0.8;
                      if (asymmetry < 5) return 0.5;
                      return 0.3;
                    })()
                  : undefined
              }
              isPending={!analysis}
            />
            <CircularMetric
              title="Symmetry"
              value={
                analysis?.metrics.overallSymmetryScore
                  ? Math.round(analysis.metrics.overallSymmetryScore * 100).toString()
                  : "..."
              }
              unit="/100"
              score={analysis?.metrics.overallSymmetryScore ?? undefined}
              isPending={!analysis}
            />
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid gap-4 lg:grid-cols-12">
            
            {/* 3D Skeleton Viewer */}
            <div className="lg:col-span-6 animate-fadeInUp">
              <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm shadow-lg overflow-hidden h-full transition-all duration-300 hover:shadow-2xl hover:border-purple-500/30">
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 py-2 border-b border-zinc-800/50">
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <span>🎯</span>
                    3D Pose Visualization
                  </h3>
                </div>
                <div className="p-3">
                  {poseFrames && poseFrames.length > 0 ? (
                    <div className="h-[400px]"><SkeletonViewer frames={poseFrames} /></div>
                  ) : (
                    <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed border-zinc-700/50 bg-gradient-to-br from-zinc-950/40 to-zinc-900/40">
                      <div className="text-center space-y-2 px-4">
                        <div className="text-4xl opacity-30">🏃‍♂️</div>
                        <p className="text-sm font-semibold text-zinc-200">No run loaded yet</p>
                        <p className="text-xs text-zinc-400">
                          Upload a running video or 6-16 image sequence above, then hit "Analyze" to preview the 3D skeleton.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Panel - Body Diagram */}
            <div className="lg:col-span-3 animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
              {analysis ? (
                <BodyDiagram issues={analysis.issues} />
              ) : (
                <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm p-4 h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-4xl opacity-20 animate-pulse">🎯</div>
                    <p className="text-xs text-zinc-400">Awaiting analysis</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - AI Biometric + Key Metrics + Form Issues */}
            <div className="lg:col-span-3 space-y-3 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              {analysis ? (
                <>
                  <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-purple-950/20 backdrop-blur-sm p-3 shadow-lg shadow-purple-500/10">
                    <h4 className="text-xs font-bold text-purple-300 mb-3 flex items-center gap-1.5">
                      <span>🤖</span>
                      AI Biometric Analysis
                    </h4>
                    <div className="space-y-2">
                      {/* Demographics Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-black/30 border border-purple-500/20 p-2">
                          <p className="text-[9px] text-purple-400 mb-1">EST. AGE</p>
                          <p className="text-sm font-bold text-purple-200">
                            {analysis.predictions.estimatedAge ? `~${analysis.predictions.estimatedAge}y` : "N/A"}
                          </p>
                        </div>
                        
                        <div className="rounded-lg bg-black/30 border border-purple-500/20 p-2">
                          <p className="text-[9px] text-purple-400 mb-1">GENDER</p>
                          <p className="text-sm font-bold text-purple-200 capitalize">
                            {analysis.predictions.estimatedGender || "N/A"}
                          </p>
                        </div>
                        
                        <div className="rounded-lg bg-black/30 border border-cyan-500/20 p-2">
                          <p className="text-[9px] text-cyan-400 mb-1">HEIGHT</p>
                          <p className="text-sm font-bold text-cyan-200">
                            {analysis.predictions.estimatedHeightCm ? `${analysis.predictions.estimatedHeightCm}cm` : "N/A"}
                          </p>
                        </div>
                        
                        <div className="rounded-lg bg-black/30 border border-cyan-500/20 p-2">
                          <p className="text-[9px] text-cyan-400 mb-1">WEIGHT</p>
                          <p className="text-sm font-bold text-cyan-200">
                            {analysis.predictions.estimatedWeightKg ? `${analysis.predictions.estimatedWeightKg}kg` : "N/A"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Injury Risk */}
                      <div className="rounded-lg bg-black/30 border border-red-500/30 p-2">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[9px] text-red-400 font-bold">INJURY RISK</p>
                          <p className="text-xs font-bold text-red-300">
                            {Math.round(analysis.predictions.injuryRiskScore * 100)}%
                          </p>
                        </div>
                        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              analysis.predictions.injuryRiskScore > 0.6 
                                ? 'bg-gradient-to-r from-red-600 to-red-400' 
                                : analysis.predictions.injuryRiskScore > 0.3
                                ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                                : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                            }`}
                            style={{ width: `${analysis.predictions.injuryRiskScore * 100}%` }}
                          />
                        </div>
                        {analysis.predictions.injuryRiskAreas.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {analysis.predictions.injuryRiskAreas.slice(0, 2).map((area, i) => (
                              <p key={i} className="text-[9px] text-red-300">⚠️ {area}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Experience Level */}
                      {analysis.predictions.runningExperienceLevel && (
                        <div className="rounded-lg bg-black/30 border border-emerald-500/20 p-2">
                          <p className="text-[9px] text-emerald-400 mb-1">EXPERIENCE</p>
                          <p className="text-sm font-bold text-emerald-200 capitalize">
                            {analysis.predictions.runningExperienceLevel}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm p-3">
                    <h4 className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                      <span>📊</span>
                      Key Metrics
                    </h4>
                    <div className="space-y-2">
                      {analysis.metrics.forwardLeanDeg && (
                        <div>
                          <div className="flex justify-between text-[9px] mb-1">
                            <span className="text-zinc-400">Forward Lean</span>
                            <span className="text-sky-400">{analysis.metrics.forwardLeanDeg.mean.toFixed(1)}°</span>
                          </div>
                          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min(100, (analysis.metrics.forwardLeanDeg.mean / 15) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {analysis.metrics.hipDropDeg && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded bg-zinc-800/50 p-1.5">
                            <p className="text-[8px] text-zinc-500 mb-0.5">L Hip</p>
                            <p className="text-[10px] font-bold text-cyan-400">{analysis.metrics.hipDropDeg.left.toFixed(1)}°</p>
                          </div>
                          <div className="rounded bg-zinc-800/50 p-1.5">
                            <p className="text-[8px] text-zinc-500 mb-0.5">R Hip</p>
                            <p className="text-[10px] font-bold text-purple-400">{analysis.metrics.hipDropDeg.right.toFixed(1)}°</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Issues */}
                  <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/30 to-amber-950/20 backdrop-blur-sm shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 py-2 border-b border-amber-500/30">
                      <h3 className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                        <span>⚠️</span>
                        Form Issues
                        {analysis.issues.length > 0 && (
                          <span className="ml-auto text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full">
                            {analysis.issues.length}
                          </span>
                        )}
                      </h3>
                    </div>

                    <div className="p-3 space-y-2 max-h-[250px] overflow-y-auto">
                      {analysis.issues.length === 0 ? (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/20 p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✓</span>
                            <p className="text-[10px] text-emerald-300">No issues detected</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {analysis.issues.map((issue) => (
                            <div
                              key={issue.id}
                              className={`rounded-lg border p-2 ${
                                issue.severity === "high"
                                  ? "border-red-500/30 bg-red-900/20"
                                  : issue.severity === "medium"
                                  ? "border-amber-500/30 bg-amber-900/20"
                                  : "border-emerald-500/30 bg-emerald-900/20"
                              }`}
                            >
                              <p className="text-[10px] font-bold text-zinc-100 flex items-center gap-1">
                                <span className="text-xs">{issue.severity === "high" ? "🔴" : issue.severity === "medium" ? "🟡" : "🟢"}</span>
                                {issue.label}
                              </p>
                              <p className="text-[9px] text-zinc-400 mt-0.5">{issue.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm p-4 h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-4xl opacity-20 animate-pulse">🤖</div>
                    <p className="text-xs text-zinc-400">AI analysis<br/>pending</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gait Kinematics Analysis - Full Width */}
          {analysis?.metrics.gaitKinematics && (
            <GaitKinematicsPanel gaitKinematics={analysis.metrics.gaitKinematics} />
          )}
        </section>
      </main>
    </div>
  );
}

interface CircularMetricProps {
  title: string;
  value: string;
  unit?: string;
  score?: number;
  isPending?: boolean;
}

function CircularMetric({ title, value, unit, score, isPending }: CircularMetricProps) {
  const colors = getScoreColor(score);
  const percentage = score ? score * 100 : 0;
  const circumference = 2 * Math.PI * 36; // radius = 36
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative overflow-hidden rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-sm p-3 shadow-lg ${colors.glow} transition-all duration-300 hover:scale-[1.02]`}>
      {isPending ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="relative h-20 w-20">
            <svg className="transform -rotate-90" width="80" height="80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="rgba(63, 63, 70, 0.3)"
                strokeWidth="6"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-2xl text-zinc-600">--</p>
            </div>
          </div>
          <p className="text-xs font-medium text-zinc-400 text-center uppercase tracking-wide">{title}</p>
          <p className="text-[10px] text-zinc-600">Awaiting data</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {/* Circular Progress */}
          <div className="relative h-20 w-20">
            <svg className="transform -rotate-90" width="80" height="80">
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="rgba(63, 63, 70, 0.3)"
                strokeWidth="6"
              />
              {/* Progress circle */}
              {score !== undefined && (
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className={colors.text}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                    transition: 'stroke-dashoffset 1s ease-out'
                  }}
                />
              )}
            </svg>
            {/* Center value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className={`text-lg font-bold ${colors.text}`}>{value}</p>
              {unit && <p className="text-[10px] text-zinc-500">{unit}</p>}
            </div>
          </div>
          
          {/* Title */}
          <p className="text-xs font-medium text-zinc-300 text-center uppercase tracking-wide">{title}</p>
          
          {/* Score indicator */}
          {score !== undefined && (
            <div className="flex items-center gap-1">
              <div className={`h-1.5 w-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`}></div>
              <span className="text-[10px] text-zinc-500">{Math.round(score * 100)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  detail: string;
  score?: number; // 0-1 scale for color coding
  unit?: string;
  isPending?: boolean;
}

function getScoreColor(score?: number): { bg: string; border: string; text: string; glow: string } {
  if (score === undefined) {
    return {
      bg: "bg-zinc-900/60",
      border: "border-zinc-800",
      text: "text-zinc-50",
      glow: ""
    };
  }
  
  if (score >= 0.8) {
    // Good - Green
    return {
      bg: "bg-gradient-to-br from-emerald-900/40 to-emerald-950/20",
      border: "border-emerald-500/30",
      text: "text-emerald-300",
      glow: "shadow-emerald-500/20"
    };
  } else if (score >= 0.5) {
    // Moderate - Yellow/Orange
    return {
      bg: "bg-gradient-to-br from-amber-900/40 to-orange-950/20",
      border: "border-amber-500/30",
      text: "text-amber-300",
      glow: "shadow-amber-500/20"
    };
  } else {
    // Poor - Red
    return {
      bg: "bg-gradient-to-br from-red-900/40 to-red-950/20",
      border: "border-red-500/30",
      text: "text-red-300",
      glow: "shadow-red-500/20"
    };
  }
}

function MetricCard({ title, value, detail, score, unit, isPending }: MetricCardProps) {
  const colors = getScoreColor(score);
  
  return (
    <div className={`group relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} backdrop-blur-sm p-4 shadow-lg ${colors.glow} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isPending ? 'animate-pulse' : ''}`}>
      {/* Animated background gradient */}
      {!isPending && score !== undefined && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      )}
      
      <div className="relative">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{title}</p>
        
        {isPending ? (
          <div className="mt-2 space-y-2">
            <div className="h-8 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
            <div className="h-3 w-full bg-zinc-800/30 rounded animate-pulse"></div>
          </div>
        ) : (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${colors.text} transition-all duration-500`}>
                {value}
              </p>
              {unit && <span className="text-sm text-zinc-500">{unit}</span>}
            </div>
            
            {/* Progress bar for score */}
            {score !== undefined && (
              <div className="mt-3 h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${colors.text.replace('text-', 'bg-')} transition-all duration-1000 ease-out rounded-full`}
                  style={{ width: `${score * 100}%` }}
                ></div>
              </div>
            )}
            
            <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">{detail}</p>
          </>
        )}
      </div>
    </div>
  );
}

function GaitKinematicsPanel({ gaitKinematics }: { gaitKinematics: import("../lib/analysis/types").GaitKinematics }) {
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-blue-950/20 backdrop-blur-sm p-5 shadow-xl animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
          <span className="text-2xl">⚙️</span>
        </div>
        <div>
          <h3 className="text-base font-bold text-cyan-300">Gait Kinematics Analysis</h3>
          <p className="text-[10px] text-cyan-400/60">Detailed biomechanical analysis across gait cycle</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Stance Phase */}
        <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse"></div>
              <h4 className="text-sm font-bold text-cyan-300">Stance Phase</h4>
            </div>
            <span className="text-xs font-bold text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded-full">
              {gaitKinematics.stancePhase.duration.toFixed(0)}% of cycle
            </span>
          </div>

          <div className="space-y-3">
            {/* Initial Contact / Heel Strike */}
            <PhaseCard
              title="Initial Contact / Heel Strike"
              icon="👟"
              color="cyan"
              data={gaitKinematics.stancePhase.initialContact}
            />

            {/* Foot Flat */}
            <PhaseCard
              title="Foot Flat"
              icon="🦶"
              color="blue"
              data={gaitKinematics.stancePhase.footFlat}
            />

            {/* Mid-Stance */}
            <PhaseCard
              title="Mid-Stance"
              icon="⚖️"
              color="teal"
              data={gaitKinematics.stancePhase.midStance}
            />

            {/* Heel Off */}
            <PhaseCard
              title="Heel Off"
              icon="📐"
              color="sky"
              data={gaitKinematics.stancePhase.heelOff}
            />

            {/* Toe Off */}
            <PhaseCard
              title="Toe Off"
              icon="🚀"
              color="indigo"
              data={gaitKinematics.stancePhase.toeOff}
            />
          </div>
        </div>

        {/* Swing Phase */}
        <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-400 animate-pulse"></div>
              <h4 className="text-sm font-bold text-purple-300">Swing Phase</h4>
            </div>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
              {gaitKinematics.swingPhase.duration.toFixed(0)}% of cycle
            </span>
          </div>

          <div className="space-y-3">
            {/* Acceleration */}
            <PhaseCard
              title="Acceleration"
              icon="💨"
              color="purple"
              data={gaitKinematics.swingPhase.acceleration}
            />

            {/* Mid-Swing */}
            <PhaseCard
              title="Mid-Swing"
              icon="🌟"
              color="violet"
              data={gaitKinematics.swingPhase.midSwing}
            />

            {/* Deceleration */}
            <PhaseCard
              title="Deceleration"
              icon="🎯"
              color="fuchsia"
              data={gaitKinematics.swingPhase.deceleration}
            />

            {/* Arm Swing */}
            {gaitKinematics.armSwingAmplitude && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 mt-4">
                <p className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-2">
                  <span>💪</span>
                  Arm Swing Dynamics
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded bg-black/30 p-2">
                    <p className="text-[9px] text-zinc-400 mb-1">Left</p>
                    <p className="text-sm font-bold text-emerald-300">{gaitKinematics.armSwingAmplitude.left.toFixed(1)}°</p>
                  </div>
                  <div className="rounded bg-black/30 p-2">
                    <p className="text-[9px] text-zinc-400 mb-1">Right</p>
                    <p className="text-sm font-bold text-emerald-300">{gaitKinematics.armSwingAmplitude.right.toFixed(1)}°</p>
                  </div>
                </div>
                {gaitKinematics.armSwingAmplitude.asymmetry > 5 && (
                  <p className="mt-2 text-[9px] text-amber-400">⚠️ Asymmetric ({gaitKinematics.armSwingAmplitude.asymmetry.toFixed(1)}° diff)</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PhaseCardProps {
  title: string;
  icon: string;
  color: string;
  data: {
    hipAngle: number | null;
    kneeAngle: number | null;
    ankleAngle: number | null;
  };
}

function PhaseCard({ title, icon, color, data }: PhaseCardProps) {
  const hasData = data.hipAngle !== null || data.kneeAngle !== null || data.ankleAngle !== null;
  
  return (
    <div className={`rounded-lg bg-black/30 border border-${color}-500/20 p-2.5`}>
      <p className={`text-[10px] font-bold text-${color}-300 mb-2 flex items-center gap-1.5`}>
        <span>{icon}</span>
        {title}
      </p>
      {hasData ? (
        <div className="grid grid-cols-3 gap-1.5">
          {data.hipAngle !== null && (
            <div className="rounded bg-zinc-900/50 p-1.5">
              <p className="text-[8px] text-zinc-500 mb-0.5">Hip</p>
              <p className={`text-[11px] font-bold text-${color}-300`}>{data.hipAngle.toFixed(1)}°</p>
            </div>
          )}
          {data.kneeAngle !== null && (
            <div className="rounded bg-zinc-900/50 p-1.5">
              <p className="text-[8px] text-zinc-500 mb-0.5">Knee</p>
              <p className={`text-[11px] font-bold text-${color}-300`}>{data.kneeAngle.toFixed(1)}°</p>
            </div>
          )}
          {data.ankleAngle !== null && (
            <div className="rounded bg-zinc-900/50 p-1.5">
              <p className="text-[8px] text-zinc-500 mb-0.5">Ankle</p>
              <p className={`text-[11px] font-bold text-${color}-300`}>{data.ankleAngle.toFixed(1)}°</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[9px] text-zinc-600 italic">Insufficient data</p>
      )}
    </div>
  );
}

