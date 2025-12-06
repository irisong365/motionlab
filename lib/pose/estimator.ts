"use client";

import type { PoseKeypoint, JointName } from "../analysis/types";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

let poseLandmarkerPromise: Promise<PoseLandmarker> | null = null;

async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = (async () => {
      console.log("Initializing MediaPipe Pose Landmarker...");
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3
      });
      
      console.log("MediaPipe Pose Landmarker initialized successfully");
      return poseLandmarker;
    })();
  }
  
  return poseLandmarkerPromise;
}

// MediaPipe Pose Landmarker has 33 landmarks
// Map them to our JointName types
const landmarkToJointName: Record<number, JointName> = {
  0: "nose",
  2: "leftEye",
  5: "rightEye",
  7: "leftEar",
  8: "rightEar",
  11: "leftShoulder",
  12: "rightShoulder",
  13: "leftElbow",
  14: "rightElbow",
  15: "leftWrist",
  16: "rightWrist",
  23: "leftHip",
  24: "rightHip",
  25: "leftKnee",
  26: "rightKnee",
  27: "leftAnkle",
  28: "rightAnkle",
  29: "leftHeel",
  30: "rightHeel",
  31: "leftFootIndex",
  32: "rightFootIndex",
};

export async function estimatePoseOnCanvas(
  canvas: HTMLCanvasElement
): Promise<PoseKeypoint[]> {
  try {
    const poseLandmarker = await getPoseLandmarker();
    const width = canvas.width || 1;
    const height = canvas.height || 1;

    console.log(`Estimating pose with MediaPipe on canvas: ${width}x${height}`);

    // Detect pose from canvas
    const result = poseLandmarker.detect(canvas);

    console.log("MediaPipe detection result:", result);

    if (!result.landmarks || result.landmarks.length === 0) {
      console.warn("No poses detected in frame");
      return [];
    }

    const keypoints: PoseKeypoint[] = [];
    const landmarks = result.landmarks[0]; // Get first pose

    // Convert MediaPipe landmarks to our keypoint format
    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      const jointName = landmarkToJointName[i];
      
      if (!jointName) {
        // Skip landmarks we don't use
        continue;
      }

      // MediaPipe provides x, y in normalized coordinates [0, 1]
      // and visibility score (similar to confidence)
      const visibility = landmark.visibility ?? 1;

      // Only include keypoints with reasonable visibility
      if (visibility < 0.3) {
        console.log(`Skipping ${jointName} - low visibility: ${visibility.toFixed(2)}`);
        continue;
      }

      keypoints.push({
        name: jointName,
        x: landmark.x,
        y: landmark.y,
        score: visibility,
      });

      console.log(`${jointName}: visibility=${visibility.toFixed(2)}, pos=(${landmark.x.toFixed(2)}, ${landmark.y.toFixed(2)})`);
    }

    console.log(`✅ Detected ${keypoints.length} keypoints with MediaPipe (visibility > 0.3)`);
    
    return keypoints;
  } catch (error) {
    console.error("Error in MediaPipe pose estimation:", error);
    throw error;
  }
}


