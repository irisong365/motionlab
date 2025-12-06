import type {
  PoseFrame,
  RunningFormAnalysis,
  RunningFormMetrics,
  RunningFormIssue,
  AngleMetric,
  SymmetryMetric,
  BiometricPredictions,
  GaitKinematics,
} from "./types";

function angleBetween(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): number {
  // angle at point B (a-b-c), in degrees
  const v1x = ax - bx;
  const v1y = ay - by;
  const v2x = cx - bx;
  const v2y = cy - by;
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function summarize(values: number[]): AngleMetric | null {
  if (!values.length) return null;
  return {
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function summarizeSymmetry(
  leftValues: number[],
  rightValues: number[]
): SymmetryMetric | null {
  if (!leftValues.length || !rightValues.length) return null;
  const left =
    leftValues.reduce((a, b) => a + b, 0) / leftValues.length || 0;
  const right =
    rightValues.reduce((a, b) => a + b, 0) / rightValues.length || 0;
  return {
    left,
    right,
    asymmetry: Math.abs(left - right),
  };
}

export function computeRunningMetrics(frames: PoseFrame[]): RunningFormMetrics {
  const forwardLeanSamples: number[] = [];
  const hipDropLeft: number[] = [];
  const hipDropRight: number[] = [];
  const cadenceSteps: number[] = [];

  // Gait kinematics tracking - detailed phases
  const stanceInitialContact = { hip: [] as number[], knee: [] as number[], ankle: [] as number[] };
  const stanceFootFlat = { hip: [] as number[], knee: [] as number[], ankle: [] as number[] };
  const stanceMidStance = { hip: [] as number[], knee: [] as number[], ankle: [] as number[] };
  const stanceHeelOff = { hip: [] as number[], knee: [] as number[], ankle: [] as number[] };
  const stanceToeOff = { hip: [] as number[], knee: [] as number[], ankle: [] as number[] };
  
  const swingAcceleration = { hip: [] as number[], knee: [] as number[], ankle: [] as number[] };
  const swingMidSwing = { hip: [] as number[], knee: [] as number[], ankle: [] as number[] };
  const swingDeceleration = { hip: [] as number[], knee: [] as number[], ankle: [] as number[] };
  
  const armSwingLeft: number[] = [];
  const armSwingRight: number[] = [];
  const armCrossovers: number[] = [];
  
  let totalStanceFrames = 0;
  let totalSwingFrames = 0;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const kp = Object.fromEntries(
      frame.keypoints.map((k) => [k.name, k] as const)
    );

    const leftShoulder = kp.leftShoulder;
    const rightShoulder = kp.rightShoulder;
    const leftHip = kp.leftHip;
    const rightHip = kp.rightHip;
    const leftKnee = kp.leftKnee;
    const rightKnee = kp.rightKnee;
    const leftAnkle = kp.leftAnkle;
    const rightAnkle = kp.rightAnkle;
    const leftElbow = kp.leftElbow;
    const rightElbow = kp.rightElbow;
    const leftWrist = kp.leftWrist;
    const rightWrist = kp.rightWrist;

    if (leftShoulder && leftHip && rightShoulder && rightHip) {
      // Forward lean
      const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
      const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      const hipX = (leftHip.x + rightHip.x) / 2;
      const hipY = (leftHip.y + rightHip.y) / 2;

      const vx = shoulderX - hipX;
      const vy = shoulderY - hipY;
      const verticalAngle = (Math.atan2(vx, -vy) * 180) / Math.PI;
      forwardLeanSamples.push(verticalAngle);

      // Hip drop
      const pelvisTiltDeg = ((leftHip.y - rightHip.y) * 180) / Math.PI;
      if (pelvisTiltDeg > 0) hipDropLeft.push(pelvisTiltDeg);
      else hipDropRight.push(Math.abs(pelvisTiltDeg));
    }

    // Detailed gait phase analysis
    if (leftHip && leftKnee && leftAnkle) {
      const hipAngle = angleBetween(
        leftKnee.x, leftKnee.y,
        leftHip.x, leftHip.y,
        leftHip.x, leftHip.y - 0.1 // vertical reference
      );
      
      const kneeAngle = angleBetween(
        leftHip.x, leftHip.y,
        leftKnee.x, leftKnee.y,
        leftAnkle.x, leftAnkle.y
      );
      
      const ankleAngle = angleBetween(
        leftKnee.x, leftKnee.y,
        leftAnkle.x, leftAnkle.y,
        leftAnkle.x + 0.1, leftAnkle.y // horizontal reference
      );
      
      // Determine stance vs swing by ankle height and velocity
      const isStance = leftAnkle.y > 0.65; // lower ankle = stance
      const ankleVelocity = i > 0 ? leftAnkle.y - frames[i-1].keypoints.find(k => k.name === 'leftAnkle')!.y : 0;
      
      if (isStance) {
        totalStanceFrames++;
        
        // Categorize within stance phase based on knee angle and ankle position
        const kneeFlexed = kneeAngle < 170;
        const ankleBehindKnee = leftAnkle.x < leftKnee.x - 0.02;
        const ankleAheadOfKnee = leftAnkle.x > leftKnee.x + 0.02;
        
        if (ankleVelocity < -0.01) {
          // Initial contact / heel strike (rapid downward movement)
          stanceInitialContact.hip.push(hipAngle);
          stanceInitialContact.knee.push(kneeAngle);
          stanceInitialContact.ankle.push(ankleAngle);
        } else if (ankleBehindKnee && kneeFlexed) {
          // Foot flat (ankle behind knee, knee flexed)
          stanceFootFlat.hip.push(hipAngle);
          stanceFootFlat.knee.push(kneeAngle);
          stanceFootFlat.ankle.push(ankleAngle);
        } else if (!ankleBehindKnee && !ankleAheadOfKnee) {
          // Mid-stance (ankle roughly aligned with knee)
          stanceMidStance.hip.push(hipAngle);
          stanceMidStance.knee.push(kneeAngle);
          stanceMidStance.ankle.push(ankleAngle);
        } else if (ankleAheadOfKnee && kneeAngle > 165) {
          // Heel off (ankle ahead, knee extending)
          stanceHeelOff.hip.push(hipAngle);
          stanceHeelOff.knee.push(kneeAngle);
          stanceHeelOff.ankle.push(ankleAngle);
        } else {
          // Toe off (end of stance, preparing for swing)
          stanceToeOff.hip.push(hipAngle);
          stanceToeOff.knee.push(kneeAngle);
          stanceToeOff.ankle.push(ankleAngle);
        }
      } else {
        totalSwingFrames++;
        
        // Categorize within swing phase based on knee flexion and ankle position
        const highKneeFlexion = kneeAngle < 140;
        const moderateKneeFlexion = kneeAngle >= 140 && kneeAngle < 160;
        
        if (ankleVelocity > 0.01 && highKneeFlexion) {
          // Acceleration (rapid upward, high knee flexion)
          swingAcceleration.hip.push(hipAngle);
          swingAcceleration.knee.push(kneeAngle);
          swingAcceleration.ankle.push(ankleAngle);
        } else if (moderateKneeFlexion) {
          // Mid-swing (moderate knee flexion)
          swingMidSwing.hip.push(hipAngle);
          swingMidSwing.knee.push(kneeAngle);
          swingMidSwing.ankle.push(ankleAngle);
        } else {
          // Deceleration (preparing for next contact)
          swingDeceleration.hip.push(hipAngle);
          swingDeceleration.knee.push(kneeAngle);
          swingDeceleration.ankle.push(ankleAngle);
        }
      }
    }

    // Arm swing analysis
    if (leftShoulder && leftElbow && leftWrist) {
      const armAngle = angleBetween(
        leftShoulder.x, leftShoulder.y,
        leftElbow.x, leftElbow.y,
        leftWrist.x, leftWrist.y
      );
      armSwingLeft.push(armAngle);
    }

    if (rightShoulder && rightElbow && rightWrist) {
      const armAngle = angleBetween(
        rightShoulder.x, rightShoulder.y,
        rightElbow.x, rightElbow.y,
        rightWrist.x, rightWrist.y
      );
      armSwingRight.push(armAngle);
    }

    // Arm crossover (arms crossing body midline)
    if (leftWrist && rightWrist) {
      const midline = 0.5;
      const leftCross = Math.abs(leftWrist.x - midline);
      const rightCross = Math.abs(rightWrist.x - midline);
      armCrossovers.push((leftCross + rightCross) * 100);
    }

    // Cadence
    if (leftAnkle && rightAnkle) {
      cadenceSteps.push(leftAnkle.y);
      cadenceSteps.push(rightAnkle.y);
    }
  }

  const totalTime =
    frames.length > 1 ? frames[frames.length - 1].time - frames[0].time : 0;

  let cadenceSpm: number | null = null;
  if (totalTime > 0 && cadenceSteps.length > 4) {
    const stepCountApprox = cadenceSteps.length / 2;
    cadenceSpm = (stepCountApprox / totalTime) * 60;
  }

  const hipDrop = summarizeSymmetry(hipDropLeft, hipDropRight);
  const armSwing = summarizeSymmetry(armSwingLeft, armSwingRight);

  // Helper to get mean or null
  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  // Gait kinematics with detailed phases
  const totalGaitFrames = totalStanceFrames + totalSwingFrames || 1;
  const gaitKinematics: GaitKinematics = {
    stancePhase: {
      initialContact: {
        hipAngle: mean(stanceInitialContact.hip),
        kneeAngle: mean(stanceInitialContact.knee),
        ankleAngle: mean(stanceInitialContact.ankle),
      },
      footFlat: {
        hipAngle: mean(stanceFootFlat.hip),
        kneeAngle: mean(stanceFootFlat.knee),
        ankleAngle: mean(stanceFootFlat.ankle),
      },
      midStance: {
        hipAngle: mean(stanceMidStance.hip),
        kneeAngle: mean(stanceMidStance.knee),
        ankleAngle: mean(stanceMidStance.ankle),
      },
      heelOff: {
        hipAngle: mean(stanceHeelOff.hip),
        kneeAngle: mean(stanceHeelOff.knee),
        ankleAngle: mean(stanceHeelOff.ankle),
      },
      toeOff: {
        hipAngle: mean(stanceToeOff.hip),
        kneeAngle: mean(stanceToeOff.knee),
        ankleAngle: mean(stanceToeOff.ankle),
      },
      duration: (totalStanceFrames / totalGaitFrames) * 100
    },
    swingPhase: {
      acceleration: {
        hipAngle: mean(swingAcceleration.hip),
        kneeAngle: mean(swingAcceleration.knee),
        ankleAngle: mean(swingAcceleration.ankle),
      },
      midSwing: {
        hipAngle: mean(swingMidSwing.hip),
        kneeAngle: mean(swingMidSwing.knee),
        ankleAngle: mean(swingMidSwing.ankle),
      },
      deceleration: {
        hipAngle: mean(swingDeceleration.hip),
        kneeAngle: mean(swingDeceleration.knee),
        ankleAngle: mean(swingDeceleration.ankle),
      },
      duration: (totalSwingFrames / totalGaitFrames) * 100
    },
    armSwingAmplitude: armSwing,
    armCrossoverDeg: summarize(armCrossovers)
  };

  const metrics: RunningFormMetrics = {
    forwardLeanDeg: summarize(forwardLeanSamples),
    hipDropDeg: hipDrop,
    spineAlignmentDeg: null,

    overstrideIndex: null,
    footStrikePattern: null,
    pronationIndex: null,
    kneeValgusDeg: null,

    armCrossingIndex: summarize(armCrossovers),
    armSwingRangeDeg: armSwing,
    armAsymmetry: armSwing,

    cadenceSpm,
    strideLengthM: null,
    contactTimeMs: null,
    verticalOscillationCm: null,

    overallSymmetryScore:
      hipDrop && hipDrop.asymmetry !== undefined
        ? Math.max(0, 1 - hipDrop.asymmetry / 10)
        : null,
    
    gaitKinematics,
  };

  return metrics;
}

export function diagnoseRunningForm(
  metrics: RunningFormMetrics
): RunningFormIssue[] {
  const issues: RunningFormIssue[] = [];

  // Posture – forward lean
  if (metrics.forwardLeanDeg) {
    const lean = metrics.forwardLeanDeg.mean;
    if (lean < 5) {
      issues.push({
        id: "forward-lean-too-little",
        category: "Posture & Alignment",
        severity: "medium",
        label: "Limited forward lean",
        description:
          "Your torso appears quite upright while running, which can reduce propulsion efficiency.",
        recommendation:
          "Aim for a slight forward lean from the ankles (not the waist), often 5–10° for easy runs.",
      });
    } else if (lean > 15) {
      issues.push({
        id: "forward-lean-too-much",
        category: "Posture & Alignment",
        severity: "medium",
        label: "Excessive forward lean",
        description:
          "Your trunk seems to lean forward more than typical efficient ranges.",
        recommendation:
          "Think about running tall with a long spine and letting the lean come from the ankles, not hunching at the hips.",
      });
    }
  }

  // Hip drop
  if (metrics.hipDropDeg) {
    if (metrics.hipDropDeg.asymmetry > 3) {
      issues.push({
        id: "hip-drop-asymmetry",
        category: "Posture & Alignment",
        severity: "high",
        label: "Pelvic / hip drop asymmetry",
        description:
          "There appears to be a noticeable difference in hip drop from side to side, which can indicate pelvic instability.",
        recommendation:
          "Strengthen lateral hip stabilizers (glute med) and practice single-leg control drills; reassess running form after a few weeks.",
      });
    }
  }

  // Cadence
  if (metrics.cadenceSpm) {
    if (metrics.cadenceSpm < 155) {
      issues.push({
        id: "low-cadence",
        category: "Cadence & Stride",
        severity: "medium",
        label: "Low cadence",
        description:
          "Your estimated step rate is on the lower side, which often correlates with overstriding and higher impact.",
        recommendation:
          "Experiment with a very small increase in cadence (5–10%) while keeping effort the same, focusing on quick, light steps.",
      });
    } else if (metrics.cadenceSpm > 190) {
      issues.push({
        id: "high-cadence",
        category: "Cadence & Stride",
        severity: "low",
        label: "Very high cadence",
        description:
          "Your step rate appears quite high. This is not necessarily bad, but can indicate short, choppy strides at some paces.",
        recommendation:
          "Ensure you’re not overworking by forcing cadence; let it rise naturally with speed and maintain relaxed, full hip extension.",
      });
    }
  }

  return issues;
}

function predictBiometrics(frames: PoseFrame[], metrics: RunningFormMetrics): BiometricPredictions {
  // Advanced AI predictions based on biomechanics
  const predictions: BiometricPredictions = {
    injuryRiskScore: 0,
    injuryRiskAreas: [],
  };

  // Calculate injury risk
  let riskFactors = 0;
  const riskAreas: string[] = [];

  if (metrics.forwardLeanDeg) {
    const lean = metrics.forwardLeanDeg.mean;
    if (lean < 3) {
      riskFactors += 0.2;
      riskAreas.push("Lower back (excessive upright posture)");
    } else if (lean > 15) {
      riskFactors += 0.25;
      riskAreas.push("Lower back & hamstrings (excessive forward lean)");
    }
  }

  if (metrics.cadenceSpm && metrics.cadenceSpm < 155) {
    riskFactors += 0.3;
    riskAreas.push("Knees & shins (low cadence overstriding)");
  }

  if (metrics.hipDropDeg && metrics.hipDropDeg.asymmetry > 3) {
    riskFactors += 0.35;
    riskAreas.push("IT band, hip flexors, lateral knee");
  }

  predictions.injuryRiskScore = Math.min(1, riskFactors);
  predictions.injuryRiskAreas = riskAreas;

  // Estimate demographics from pose data
  if (frames.length > 0) {
    const firstFrame = frames[0];
    const kpMap = Object.fromEntries(firstFrame.keypoints.map(k => [k.name, k]));
    
    // Height estimation (from hip-to-ankle ratio, normalized)
    const leftHip = kpMap.leftHip;
    const leftAnkle = kpMap.leftAnkle;
    if (leftHip && leftAnkle) {
      const legLength = Math.abs(leftHip.y - leftAnkle.y);
      // Rough heuristic: leg length is ~50% of height, normalized coords
      const estimatedHeight = (legLength * 2) * 170; // scale to realistic cm
      predictions.estimatedHeightCm = Math.round(Math.max(150, Math.min(200, estimatedHeight)));
    }

    // Gender estimation (from shoulder-to-hip ratio)
    const leftShoulder = kpMap.leftShoulder;
    const rightShoulder = kpMap.rightShoulder;
    const rightHip = kpMap.rightHip;
    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      const hipWidth = Math.abs(leftHip.x - rightHip.x);
      const ratio = shoulderWidth / hipWidth;
      
      // Rough heuristic: males typically have ratio > 1.1, females < 1.1
      if (ratio > 1.15) {
        predictions.estimatedGender = "male";
        predictions.genderConfidence = 0.65;
      } else if (ratio < 1.05) {
        predictions.estimatedGender = "female";
        predictions.genderConfidence = 0.60;
      } else {
        predictions.estimatedGender = "unknown";
        predictions.genderConfidence = 0.4;
      }
    }

    // Weight estimation (from body proportions and running style)
    if (predictions.estimatedHeightCm) {
      const bmi = metrics.cadenceSpm && metrics.cadenceSpm < 160 ? 24 : 22; // rough estimate
      predictions.estimatedWeightKg = Math.round((bmi * Math.pow(predictions.estimatedHeightCm / 100, 2)));
    }

    // Age estimation (from cadence and posture stability)
    const cadence = metrics.cadenceSpm || 170;
    const stability = metrics.overallSymmetryScore || 0.8;
    
    // Younger runners tend to have higher cadence and better symmetry
    let ageEstimate = 30;
    if (cadence > 175 && stability > 0.85) {
      ageEstimate = 25;
      predictions.ageConfidence = 0.5;
    } else if (cadence < 160 || stability < 0.7) {
      ageEstimate = 45;
      predictions.ageConfidence = 0.5;
    } else {
      predictions.ageConfidence = 0.4;
    }
    predictions.estimatedAge = ageEstimate;

    // Running experience level
    const formScore = (stability + (metrics.cadenceSpm ? (metrics.cadenceSpm > 165 ? 1 : 0.5) : 0.5)) / 2;
    if (formScore > 0.85) {
      predictions.runningExperienceLevel = "advanced";
    } else if (formScore > 0.65) {
      predictions.runningExperienceLevel = "intermediate";
    } else {
      predictions.runningExperienceLevel = "beginner";
    }
  }

  return predictions;
}

export function buildRunningFormAnalysis(
  frames: PoseFrame[]
): RunningFormAnalysis {
  const metrics = computeRunningMetrics(frames);
  const issues = diagnoseRunningForm(metrics);
  const predictions = predictBiometrics(frames, metrics);

  let summary = "We analyzed your running video and extracted key form metrics.";
  if (issues.length === 0) {
    summary +=
      " No major issues were detected based on the current heuristic thresholds, but this is an approximate analysis.";
  } else {
    summary += ` We identified ${issues.length} area${
      issues.length > 1 ? "s" : ""
    } where your form may be improved.`;
  }

  return {
    summary,
    metrics,
    issues,
    predictions,
  };
}


