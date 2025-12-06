<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/Three.js-0.181-blue?style=for-the-badge&logo=three.js" />
  <img src="https://img.shields.io/badge/MediaPipe-AI-green?style=for-the-badge&logo=google" />
  <img src="https://img.shields.io/badge/Claude_Sonnet_4-Analysis-purple?style=for-the-badge&logo=anthropic" />
</p>

# 🏃 MotionLab

**AI-Powered Running Form Analysis & Biomechanics Platform**

MotionLab is an intelligent web application that analyzes running form through video uploads, providing real-time biomechanical insights, 3D pose visualization, and personalized coaching recommendations powered by advanced AI pose detection.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Aims & Objectives](#-aims--objectives)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [How It Works](#-how-it-works)
- [Limitations](#-limitations)
- [Future Roadmap](#-future-roadmap)
- [Getting Started](#-getting-started)

---

## 🎯 Overview

MotionLab transforms any running video into actionable biomechanical insights. By leveraging **MediaPipe** for AI-powered pose detection and **Three.js** for 3D visualization, the platform helps runners, coaches, and physiotherapists identify form issues that could lead to injury or inefficiency.

The analysis engine, developed with assistance from **Claude Sonnet 4**, computes comprehensive metrics including:

- **Posture & Alignment** — Forward lean angle, hip drop asymmetry, spine alignment
- **Gait Kinematics** — Detailed stance and swing phase analysis with hip/knee/ankle angles
- **Symmetry Analysis** — Left-right balance across the entire kinetic chain
- **Injury Risk Prediction** — AI-powered risk assessment with specific area identification

---

## 🔴 Problem Statement

Running injuries affect **50-70% of recreational runners annually**, with many stemming from correctable biomechanical issues. Traditional gait analysis requires:

- Expensive laboratory equipment ($10,000+)
- Trained biomechanics specialists
- In-person appointments at specialized clinics
- Long wait times and limited accessibility

**The Gap:** Everyday runners lack access to professional-grade form analysis, leading to:

1. Undetected biomechanical inefficiencies
2. Preventable overuse injuries (IT band syndrome, runner's knee, shin splints)
3. Suboptimal performance despite consistent training
4. Trial-and-error approach to form correction

**MotionLab's Solution:** Democratize biomechanical analysis by bringing laboratory-grade insights to any smartphone or computer through AI-powered video analysis.

---

## 🎯 Aims & Objectives

### Primary Aim
To provide accessible, accurate, and actionable running form analysis using AI and computer vision technology.

### Objectives

| # | Objective | Status |
|---|-----------|--------|
| 1 | Develop real-time pose detection using MediaPipe | ✅ Complete |
| 2 | Create 3D skeleton visualization with Three.js | ✅ Complete |
| 3 | Implement comprehensive gait kinematics analysis | ✅ Complete |
| 4 | Build AI-powered injury risk prediction | ✅ Complete |
| 5 | Design intuitive body diagram for issue visualization | ✅ Complete |
| 6 | Generate personalized coaching recommendations | ✅ Complete |
| 7 | Support both video and image sequence inputs | ✅ Complete |

---

## ✨ Features

### 🦴 3D Pose Visualization
- Real-time skeleton rendering with joint confidence indicators
- Interactive camera controls (rotate, zoom, pan)
- Frame-by-frame playback with timeline scrubbing
- Multiple view modes (Skeleton, Human mesh, Combined)

### 📊 Comprehensive Metrics Dashboard
- **Posture Score** — Forward lean angle with optimal range highlighting
- **Cadence Analysis** — Steps per minute calculation
- **Hip Stability** — Asymmetry detection and quantification
- **Symmetry Score** — Overall left-right balance percentage

### ⚙️ Gait Kinematics Analysis
Detailed breakdown of the complete gait cycle:

**Stance Phase (~60% of cycle)**
- Initial Contact / Heel Strike
- Foot Flat
- Mid-Stance
- Heel Off
- Toe Off

**Swing Phase (~40% of cycle)**
- Acceleration
- Mid-Swing
- Deceleration

### 🤖 AI Biometric Predictions
- Estimated demographics (age, gender)
- Estimated physical attributes (height, weight)
- Injury risk score with specific risk areas
- Running experience level assessment

### 🎯 Interactive Body Diagram
- Visual mapping of detected issues to body regions
- Severity-coded highlighting (low/medium/high)
- Click-to-expand issue details

### ⚠️ Form Issue Detection
Automatic identification of common problems:
- Excessive forward lean / upright posture
- Hip drop asymmetry
- Arm crossover issues
- Cadence optimization opportunities

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16, React 19 | App framework & UI |
| **Styling** | Tailwind CSS 4 | Responsive design |
| **3D Engine** | Three.js 0.181 | Skeleton & mesh visualization |
| **AI/ML** | MediaPipe Tasks Vision | Real-time pose detection |
| **Analysis** | Claude Sonnet 4 | Biomechanics algorithms & logic |
| **Language** | TypeScript 5 | Type-safe development |

### Key Dependencies
```json
{
  "@mediapipe/tasks-vision": "^0.10.22",
  "three": "^0.181.2",
  "next": "16.0.7",
  "react": "19.2.0"
}
```

---

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MotionLab Analysis Flow                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌──────────────┐     ┌─────────────────┐
    │  INPUT   │────▶│  PROCESSING  │────▶│     OUTPUT      │
    └──────────┘     └──────────────┘     └─────────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
    ┌─────────┐      ┌────────────┐       ┌─────────────┐
    │ Video   │      │ MediaPipe  │       │ 3D Skeleton │
    │  OR     │      │ Pose       │       │ Viewer      │
    │ Images  │      │ Detection  │       └─────────────┘
    └─────────┘      └────────────┘              │
                           │               ┌─────────────┐
                           ▼               │ Metrics     │
                    ┌────────────┐         │ Dashboard   │
                    │ Frame-by-  │         └─────────────┘
                    │ Frame      │               │
                    │ Keypoint   │         ┌─────────────┐
                    │ Extraction │         │ Body        │
                    └────────────┘         │ Diagram     │
                           │               └─────────────┘
                           ▼                     │
                    ┌────────────┐         ┌─────────────┐
                    │ Biomech    │         │ Form Issues │
                    │ Analysis   │         │ & Coaching  │
                    │ Engine     │         └─────────────┘
                    └────────────┘               │
                           │               ┌─────────────┐
                           ▼               │ Injury Risk │
                    ┌────────────┐         │ Prediction  │
                    │ Gait       │         └─────────────┘
                    │ Kinematics │
                    │ Calc       │
                    └────────────┘
```

### Step-by-Step Process

1. **Upload** — User uploads a running video (up to 150MB) or 6-16 image sequence
2. **Preprocessing** — Video is downscaled to 720px width, limited to first 20 seconds
3. **Frame Sampling** — 50 frames extracted at regular intervals
4. **Pose Detection** — MediaPipe BlazePose identifies 17+ keypoints per frame
5. **Keypoint Mapping** — Normalized coordinates (0-1) stored with confidence scores
6. **Angle Calculation** — Joint angles computed using vector mathematics
7. **Metrics Generation** — Statistical analysis (mean, min, max) across all frames
8. **Issue Detection** — Rule-based classification of form problems
9. **Risk Assessment** — AI prediction of injury likelihood
10. **Visualization** — Results rendered in 3D viewer and dashboard

---

## ⚠️ Limitations

### Current Technical Limitations

| Limitation | Impact | Potential Solution |
|------------|--------|-------------------|
| **2D Pose Only** | Depth estimation is approximated | Integrate stereo camera or depth sensor support |
| **Single Person** | Multi-runner scenarios not supported | Implement person tracking/segmentation |
| **Side View Optimal** | Frontal/rear views have reduced accuracy | Multi-angle fusion algorithm |
| **Lighting Sensitivity** | Poor lighting affects detection | Image preprocessing & enhancement |
| **Static Camera** | Moving camera introduces artifacts | Camera motion compensation |
| **20s Analysis Limit** | Long runs truncated | Streaming/chunked analysis |

### Detection Accuracy Factors
- **Clothing** — Loose/baggy clothes may obscure joint positions
- **Occlusion** — Arms crossing body reduce keypoint confidence
- **Speed** — Very fast running may cause motion blur
- **Background** — Cluttered backgrounds can confuse detection

### Browser Compatibility
- Requires WebGL support for 3D visualization
- MediaPipe WASM backend needs modern browser
- Large videos may cause memory pressure on low-RAM devices

---

## 🚀 Future Roadmap

### Phase 1: Enhanced Visualization
- [ ] **Realistic 3D Human Model** — Skinned mesh that deforms with pose
- [ ] **GLTF Model Loading** — Support for custom avatars (Mixamo, ReadyPlayerMe)
- [ ] **Pose Comparison** — Overlay ideal form against detected pose
- [ ] **Slow-Motion Playback** — Frame interpolation for smoother review

### Phase 2: Extended Motion Analysis
- [ ] **Walking Gait Analysis** — Adapt algorithms for walking biomechanics
- [ ] **Cycling Posture** — Bike fit and pedaling efficiency
- [ ] **Swimming Stroke** — Freestyle, backstroke analysis
- [ ] **Golf Swing** — Club path and body rotation
- [ ] **Tennis Serve** — Kinetic chain efficiency

### Phase 3: Advanced AI Features
- [ ] **Video Generation** — AI-generated "corrected form" preview
- [ ] **Real-time Webcam** — Live analysis without upload
- [ ] **Progress Tracking** — Historical comparison across sessions
- [ ] **Coach Chat** — LLM-powered Q&A about results

### Phase 4: Platform Expansion
- [ ] **Mobile App** — Native iOS/Android with on-device ML
- [ ] **Wearable Integration** — Sync with Garmin, Apple Watch, etc.
- [ ] **Coach Dashboard** — Multi-athlete management portal
- [ ] **API Access** — Developer endpoints for third-party apps

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/motionlab.git
cd motionlab

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage Tips

1. **Video Recording**
   - Use a side view for best results
   - Ensure full body is visible in frame
   - Good lighting improves detection accuracy
   - 5-20 seconds of footage is optimal

2. **Image Sequences**
   - Upload 6-16 sequential frames
   - Maintain consistent framing across images
   - Sorted automatically by filename

---

## 📄 License

This project is ​Cursor x Anthropic Hackathon MY 2025

---

## 🙏 Acknowledgments

- **MediaPipe Team** — For the exceptional pose detection models
- **Three.js Community** — For the powerful 3D rendering library
- **Anthropic** — Claude Sonnet 4 assisted in developing the biomechanics analysis algorithms
- **Running Biomechanics Research** — Informed by peer-reviewed gait analysis studies

---

<p align="center">
  <strong>Built with ❤️ for runners everywhere</strong>
</p>
