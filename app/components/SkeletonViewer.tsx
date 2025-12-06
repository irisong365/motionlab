"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import type { PoseFrame, JointName } from "../../lib/analysis/types";
import { createHumanBodyMesh, createEcorcheModel, loadGLTFHumanModel } from "../../lib/3d/humanModel";

interface SkeletonViewerProps {
  frames: PoseFrame[] | null;
}

type ViewMode = "skeleton";

// Define skeleton connections for rendering bones
const BONE_CONNECTIONS = [
  // Head
  ["nose", "leftEye"],
  ["nose", "rightEye"],
  ["leftEye", "leftEar"],
  ["rightEye", "rightEar"],
  
  // Torso
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  
  // Left arm
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  
  // Right arm
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  
  // Left leg
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  
  // Right leg
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

// Map joint names to body part indices for posing
const JOINT_TO_BODY_MAP: Record<string, string[]> = {
  nose: ["head"],
  leftShoulder: ["leftDeltoid", "leftTrap"],
  rightShoulder: ["rightDeltoid", "rightTrap"],
  leftElbow: ["leftElbow", "leftBicep", "leftForearm"],
  rightElbow: ["rightElbow", "rightBicep", "rightForearm"],
  leftWrist: ["leftWrist", "leftHand"],
  rightWrist: ["rightWrist", "rightHand"],
  leftHip: ["pelvis", "leftGlute", "leftQuad"],
  rightHip: ["pelvis", "rightGlute", "rightQuad"],
  leftKnee: ["leftKnee", "leftCalf"],
  rightKnee: ["rightKnee", "rightCalf"],
  leftAnkle: ["leftAnkle", "leftFoot"],
  rightAnkle: ["rightAnkle", "rightFoot"],
};

export function SkeletonViewer({ frames }: SkeletonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const skeletonGroupRef = useRef<THREE.Group | null>(null);
  const bodyModelRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [keypointCount, setKeypointCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("combined");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, _setIsLoading] = useState(false);

  // Create skeleton visualization
  const createSkeleton = useCallback((
    frame: PoseFrame, 
    group: THREE.Group, 
    showJoints: boolean = true,
    showBones: boolean = true
  ) => {
    const keypointMap = new Map(
      frame.keypoints.map((kp) => [kp.name, kp])
    );

    const get3DPosition = (name: JointName | string, minConfidence = 0.2): THREE.Vector3 | null => {
      const kp = keypointMap.get(name as JointName);
      if (!kp) return null;
      if (kp.score !== undefined && kp.score < minConfidence) return null;
      return new THREE.Vector3(
        (kp.x - 0.5) * 2,
        -(kp.y - 0.5) * 2,
        0
      );
    };

    let visibleJoints = 0;

    if (showJoints) {
      const jointGeometry = new THREE.SphereGeometry(0.035, 20, 20);
      
      frame.keypoints.forEach((kp) => {
        const confidence = kp.score ?? 0;
        if (confidence < 0.2) return;
        
        const pos = get3DPosition(kp.name);
        if (!pos) return;
        
        let color = 0x00ffaa;
        let emissive = 0x00aa88;
        
        if (confidence < 0.5) {
          color = 0xff8800;
          emissive = 0xaa4400;
        } else if (confidence < 0.7) {
          color = 0xffdd00;
          emissive = 0xaa8800;
        }
        
        const jointMaterial = new THREE.MeshPhongMaterial({ 
          color,
          emissive,
          shininess: 100,
          specular: 0xffffff
        });
        
        const joint = new THREE.Mesh(jointGeometry, jointMaterial);
        joint.position.copy(pos);
        group.add(joint);
        
        // Glow effect
        const glowGeometry = new THREE.SphereGeometry(0.045, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(pos);
        group.add(glow);
        
        visibleJoints++;
      });
    }

    if (showBones) {
      BONE_CONNECTIONS.forEach(([start, end]) => {
        const startPos = get3DPosition(start, 0.2);
        const endPos = get3DPosition(end, 0.2);
        
        if (!startPos || !endPos) return;
        
        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const length = direction.length();
        
        if (length < 0.01) return;
        
        const boneGeometry = new THREE.CylinderGeometry(0.02, 0.02, length, 12);
        const boneMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x5599ff,
          emissive: 0x2255aa,
          shininess: 60,
          specular: 0x88aaff,
          transparent: true,
          opacity: 0.9
        });
        const bone = new THREE.Mesh(boneGeometry, boneMaterial);
        
        bone.position.copy(startPos).add(direction.clone().multiplyScalar(0.5));
        bone.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize()
        );
        
        group.add(bone);
      });
    }

    return visibleJoints;
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !frames || frames.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // Add subtle gradient background
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = 512;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext("2d");
    if (bgCtx) {
      const gradient = bgCtx.createRadialGradient(256, 256, 0, 256, 256, 400);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#0a0a0f");
      bgCtx.fillStyle = gradient;
      bgCtx.fillRect(0, 0, 512, 512);
      const bgTexture = new THREE.CanvasTexture(bgCanvas);
      scene.background = bgTexture;
    }

    // Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Improved lighting for anatomical model
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.4);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);
    
    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0xffaa88, 0.6);
    rimLight.position.set(0, 5, -8);
    scene.add(rimLight);

    // Add a ground plane for better depth perception
    const groundGeometry = new THREE.CircleGeometry(2.5, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e, 
      transparent: true, 
      opacity: 0.5,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add subtle grid
    const gridHelper = new THREE.GridHelper(4, 20, 0x2a2a3e, 0x1a1a2e);
    gridHelper.position.y = -1.04;
    scene.add(gridHelper);

    // Skeleton group
    const skeletonGroup = new THREE.Group();
    scene.add(skeletonGroup);
    skeletonGroupRef.current = skeletonGroup;

    // Body model group (separate from skeleton)
    const bodyModel = new THREE.Group();
    scene.add(bodyModel);
    bodyModelRef.current = bodyModel;

    // Mouse controls for rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotation = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      rotation.y += deltaX * 0.01;
      rotation.x += deltaY * 0.01;
      rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.x));
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.001;
      camera.position.z = Math.max(1.5, Math.min(8, camera.position.z));
    };

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("wheel", onWheel);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Apply rotation to both groups
      if (skeletonGroup) {
        skeletonGroup.rotation.y = rotation.y;
        skeletonGroup.rotation.x = rotation.x;
      }
      if (bodyModel) {
        bodyModel.rotation.y = rotation.y;
        bodyModel.rotation.x = rotation.x;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("wheel", onWheel);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, [frames]);

  // Update body model when view mode changes
  useEffect(() => {
    if (!bodyModelRef.current) return;

    const bodyModel = bodyModelRef.current;
    
    // Clear existing model
    while (bodyModel.children.length > 0) {
      const child = bodyModel.children[0];
      bodyModel.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

  }, [viewMode]);

  // Update skeleton based on current frame
  useEffect(() => {
    if (!frames || frames.length === 0 || !skeletonGroupRef.current) return;

    const frame = frames[currentFrame];
    const skeletonGroup = skeletonGroupRef.current;

    // Clear previous skeleton
    while (skeletonGroup.children.length > 0) {
      const child = skeletonGroup.children[0];
      skeletonGroup.remove(child);
    }

    // Only show skeleton in skeleton or combined mode
    const showSkeleton = viewMode === "skeleton" || viewMode === "combined";
    
    if (showSkeleton) {
      const visibleJoints = createSkeleton(frame, skeletonGroup, true, true);
      setKeypointCount(visibleJoints);
    } else {
      // Still count keypoints even if not showing skeleton
      const visibleJoints = frame.keypoints.filter(kp => (kp.score ?? 0) >= 0.2).length;
      setKeypointCount(visibleJoints);
    }
  }, [frames, currentFrame, viewMode, createSkeleton]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying || !frames || frames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, frames]);

  if (!frames || frames.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 text-xs text-zinc-500">
        Run an analysis to see your 3D pose visualization here.
      </div>
    );
  }

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* View mode selector */}
      <div className="flex gap-1 text-[10px]">
        {(["skeleton"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-2 py-1 rounded capitalize transition-all ${
              viewMode === mode
                ? "bg-sky-500 text-zinc-950 font-semibold"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
          </button>
        ))}
      </div>
      
      <div 
        ref={containerRef} 
        className="flex-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden relative"
        style={{ cursor: "grab", minHeight: "300px" }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10">
            <div className="text-xs text-zinc-400 animate-pulse">Loading model...</div>
          </div>
        )}
      </div>
      
      {keypointCount > 0 && (
        <div className={`text-center py-1 px-2 rounded text-[10px] ${
          keypointCount >= 10 
            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" 
            : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
        }`}>
          {keypointCount >= 10 ? "✓" : "⚠️"} {keypointCount} joints detected • {isPlaying ? "▶ Playing" : "⏸ Paused"} • {viewMode} view
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="rounded px-2 py-1 text-xs font-semibold bg-sky-500 text-zinc-950 hover:bg-sky-400 transition"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        
        <input
          type="range"
          min="0"
          max={frames.length - 1}
          value={currentFrame}
          onChange={(e) => {
            setCurrentFrame(parseInt(e.target.value));
            setIsPlaying(false);
          }}
          className="flex-1 h-1"
        />
        
        <span className="text-[10px] text-zinc-500 whitespace-nowrap">
          {currentFrame + 1}/{frames.length}
        </span>
      </div>
    </div>
  );
}
