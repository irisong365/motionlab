"use client";

import React from "react";
import type { RunningFormIssue } from "../../lib/analysis/types";

interface BodyDiagramProps {
  issues: RunningFormIssue[];
}

export function BodyDiagram({ issues }: BodyDiagramProps) {
  // Map issues to body regions
  const getBodyRegionStatus = () => {
    const regions: Record<string, { severity: string; issues: string[] }> = {
      head: { severity: "none", issues: [] },
      torso: { severity: "none", issues: [] },
      leftArm: { severity: "none", issues: [] },
      rightArm: { severity: "none", issues: [] },
      leftLeg: { severity: "none", issues: [] },
      rightLeg: { severity: "none", issues: [] },
      hips: { severity: "none", issues: [] },
    };

    issues.forEach((issue) => {
      const label = issue.label.toLowerCase();
      
      if (label.includes("posture") || label.includes("lean") || label.includes("spine")) {
        regions.torso.issues.push(issue.label);
        if (issue.severity === "high" || regions.torso.severity !== "high") {
          regions.torso.severity = issue.severity;
        }
      }
      
      if (label.includes("hip") || label.includes("pelvic")) {
        regions.hips.issues.push(issue.label);
        if (issue.severity === "high" || regions.hips.severity !== "high") {
          regions.hips.severity = issue.severity;
        }
      }
      
      if (label.includes("leg") || label.includes("knee") || label.includes("ankle")) {
        regions.leftLeg.issues.push(issue.label);
        regions.rightLeg.issues.push(issue.label);
        regions.leftLeg.severity = issue.severity;
        regions.rightLeg.severity = issue.severity;
      }
      
      if (label.includes("cadence") || label.includes("stride")) {
        regions.leftLeg.issues.push(issue.label);
        regions.rightLeg.issues.push(issue.label);
        if (issue.severity === "high" || regions.leftLeg.severity !== "high") {
          regions.leftLeg.severity = issue.severity;
          regions.rightLeg.severity = issue.severity;
        }
      }
      
      if (label.includes("arm")) {
        regions.leftArm.issues.push(issue.label);
        regions.rightArm.issues.push(issue.label);
        regions.leftArm.severity = issue.severity;
        regions.rightArm.severity = issue.severity;
      }
    });

    return regions;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "#ef4444"; // red
      case "medium":
        return "#f59e0b"; // amber
      case "low":
        return "#10b981"; // emerald
      default:
        return "#3f3f46"; // zinc-700
    }
  };

  const regions = getBodyRegionStatus();

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm p-4">
      <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
        <span>🎯</span>
        Body Analysis Map
      </h3>
      
      <div className="flex justify-center">
        <svg viewBox="0 0 200 480" className="w-full max-w-[220px]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Define gradients for each severity */}
            <linearGradient id="headGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getSeverityColor(regions.head.severity)} stopOpacity="0.85"/>
              <stop offset="100%" stopColor={getSeverityColor(regions.head.severity)} stopOpacity="0.65"/>
            </linearGradient>
            <linearGradient id="torsoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getSeverityColor(regions.torso.severity)} stopOpacity="0.85"/>
              <stop offset="100%" stopColor={getSeverityColor(regions.torso.severity)} stopOpacity="0.65"/>
            </linearGradient>
            <linearGradient id="hipsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getSeverityColor(regions.hips.severity)} stopOpacity="0.85"/>
              <stop offset="100%" stopColor={getSeverityColor(regions.hips.severity)} stopOpacity="0.65"/>
            </linearGradient>
            <linearGradient id="leftArmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getSeverityColor(regions.leftArm.severity)} stopOpacity="0.8"/>
              <stop offset="100%" stopColor={getSeverityColor(regions.leftArm.severity)} stopOpacity="0.6"/>
            </linearGradient>
            <linearGradient id="rightArmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getSeverityColor(regions.rightArm.severity)} stopOpacity="0.8"/>
              <stop offset="100%" stopColor={getSeverityColor(regions.rightArm.severity)} stopOpacity="0.6"/>
            </linearGradient>
            <linearGradient id="leftLegGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getSeverityColor(regions.leftLeg.severity)} stopOpacity="0.85"/>
              <stop offset="100%" stopColor={getSeverityColor(regions.leftLeg.severity)} stopOpacity="0.65"/>
            </linearGradient>
            <linearGradient id="rightLegGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getSeverityColor(regions.rightLeg.severity)} stopOpacity="0.85"/>
              <stop offset="100%" stopColor={getSeverityColor(regions.rightLeg.severity)} stopOpacity="0.65"/>
            </linearGradient>
          </defs>
          
          {/* Ground shadow */}
          <ellipse cx="100" cy="470" rx="35" ry="6" fill="#000" opacity="0.15"/>
          
          {/* HEAD - Athletic, not round */}
          <path
            d="M 100 20 Q 115 22 115 35 Q 115 48 100 50 Q 85 48 85 35 Q 85 22 100 20 Z"
            fill="url(#headGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* NECK - Defined */}
          <path
            d="M 95 50 L 92 65 L 108 65 L 105 50 Z"
            fill="url(#torsoGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          
          {/* SHOULDERS - Broad and angular */}
          <path
            d="M 60 70 Q 58 75 60 80 L 65 85 L 75 85 L 92 75 L 92 65 L 75 68 Z"
            fill="url(#leftArmGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          <path
            d="M 140 70 Q 142 75 140 80 L 135 85 L 125 85 L 108 75 L 108 65 L 125 68 Z"
            fill="url(#rightArmGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* CHEST - Defined pecs */}
          <path
            d="M 92 75 L 85 90 L 88 110 L 100 115 L 100 75 Z"
            fill="url(#torsoGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          <path
            d="M 108 75 L 115 90 L 112 110 L 100 115 L 100 75 Z"
            fill="url(#torsoGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* ABS - Six-pack definition */}
          <path
            d="M 88 115 L 85 130 L 88 150 L 100 155 L 100 115 Z"
            fill="url(#torsoGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          <path
            d="M 112 115 L 115 130 L 112 150 L 100 155 L 100 115 Z"
            fill="url(#torsoGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* CORE/WAIST */}
          <path
            d="M 88 155 L 85 165 L 87 175 L 100 178 L 100 155 Z"
            fill="url(#torsoGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          <path
            d="M 112 155 L 115 165 L 113 175 L 100 178 L 100 155 Z"
            fill="url(#torsoGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          
          {/* HIPS - Athletic V-taper */}
          <path
            d="M 87 178 L 82 195 L 80 210 L 85 215 L 95 215 L 100 210 L 100 178 Z"
            fill="url(#hipsGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          <path
            d="M 113 178 L 118 195 L 120 210 L 115 215 L 105 215 L 100 210 L 100 178 Z"
            fill="url(#hipsGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* LEFT ARM - Defined biceps/triceps */}
          <path
            d="M 65 85 Q 55 95 52 110 Q 50 125 52 140 L 58 140 Q 60 125 62 110 Q 65 95 68 88 Z"
            fill="url(#leftArmGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* LEFT FOREARM - Tapered */}
          <path
            d="M 52 142 L 48 160 L 45 180 L 47 185 L 52 182 L 55 165 L 57 145 Z"
            fill="url(#leftArmGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          
          {/* RIGHT ARM */}
          <path
            d="M 135 85 Q 145 95 148 110 Q 150 125 148 140 L 142 140 Q 140 125 138 110 Q 135 95 132 88 Z"
            fill="url(#rightArmGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* RIGHT FOREARM */}
          <path
            d="M 148 142 L 152 160 L 155 180 L 153 185 L 148 182 L 145 165 L 143 145 Z"
            fill="url(#rightArmGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          
          {/* LEFT LEG - QUADRICEPS (defined) */}
          <path
            d="M 85 220 L 78 245 L 75 275 L 76 295 L 80 296 L 84 280 L 88 250 L 90 225 Z"
            fill="url(#leftLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* LEFT HAMSTRING */}
          <path
            d="M 90 225 L 92 250 L 93 280 L 92 296 L 88 296 L 88 280 L 90 250 Z"
            fill="url(#leftLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
            opacity="0.8"
          />
          
          {/* LEFT KNEE */}
          <circle
            cx="82"
            cy="300"
            r="8"
            fill="url(#leftLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          
          {/* LEFT CALF - Diamond shape */}
          <path
            d="M 79 308 L 74 330 L 72 360 L 74 380 L 78 378 L 80 355 L 82 330 L 83 310 Z"
            fill="url(#leftLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* LEFT SHIN */}
          <path
            d="M 83 310 L 85 335 L 86 365 L 85 380 L 82 380 L 82 360 Z"
            fill="url(#leftLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
            opacity="0.7"
          />
          
          {/* LEFT ANKLE */}
          <ellipse
            cx="80"
            cy="385"
            rx="6"
            ry="5"
            fill="url(#leftLegGradient)"
            stroke="#9ca3af"
            strokeWidth="0.8"
          />
          
          {/* LEFT FOOT */}
          <path
            d="M 76 388 L 72 395 L 70 400 L 75 402 L 85 400 L 87 395 L 84 390 Z"
            fill="url(#leftLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          
          {/* RIGHT LEG - QUADRICEPS */}
          <path
            d="M 115 220 L 122 245 L 125 275 L 124 295 L 120 296 L 116 280 L 112 250 L 110 225 Z"
            fill="url(#rightLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* RIGHT HAMSTRING */}
          <path
            d="M 110 225 L 108 250 L 107 280 L 108 296 L 112 296 L 112 280 L 110 250 Z"
            fill="url(#rightLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
            opacity="0.8"
          />
          
          {/* RIGHT KNEE */}
          <circle
            cx="118"
            cy="300"
            r="8"
            fill="url(#rightLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          
          {/* RIGHT CALF */}
          <path
            d="M 121 308 L 126 330 L 128 360 L 126 380 L 122 378 L 120 355 L 118 330 L 117 310 Z"
            fill="url(#rightLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          
          {/* RIGHT SHIN */}
          <path
            d="M 117 310 L 115 335 L 114 365 L 115 380 L 118 380 L 118 360 Z"
            fill="url(#rightLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
            opacity="0.7"
          />
          
          {/* RIGHT ANKLE */}
          <ellipse
            cx="120"
            cy="385"
            rx="6"
            ry="5"
            fill="url(#rightLegGradient)"
            stroke="#9ca3af"
            strokeWidth="0.8"
          />
          
          {/* RIGHT FOOT */}
          <path
            d="M 124 388 L 128 395 L 130 400 L 125 402 L 115 400 L 113 395 L 116 390 Z"
            fill="url(#rightLegGradient)"
            stroke="#9ca3af"
            strokeWidth="1"
          />
          
          {/* MUSCLE DEFINITION LINES */}
          {/* Abs lines */}
          <line x1="100" y1="120" x2="100" y2="170" stroke="#6b7280" strokeWidth="0.5" opacity="0.4"/>
          <line x1="88" y1="130" x2="112" y2="130" stroke="#6b7280" strokeWidth="0.5" opacity="0.3"/>
          <line x1="88" y1="145" x2="112" y2="145" stroke="#6b7280" strokeWidth="0.5" opacity="0.3"/>
          
          {/* Chest definition */}
          <path d="M 92 85 Q 100 95 108 85" fill="none" stroke="#6b7280" strokeWidth="0.5" opacity="0.3"/>
          
          {/* Knee caps */}
          <circle cx="82" cy="300" r="4" fill="none" stroke="#6b7280" strokeWidth="0.5" opacity="0.4"/>
          <circle cx="118" cy="300" r="4" fill="none" stroke="#6b7280" strokeWidth="0.5" opacity="0.4"/>
        </svg>
      </div>
      
      {/* Legend */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <span className="text-zinc-400">High Priority</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-3 w-3 rounded-full bg-amber-500"></div>
          <span className="text-zinc-400">Medium Priority</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
          <span className="text-zinc-400">Low Priority</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-3 w-3 rounded-full bg-zinc-700"></div>
          <span className="text-zinc-400">No Issues</span>
        </div>
      </div>
    </div>
  );
}

