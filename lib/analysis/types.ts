export type JointName =
  | "nose"
  | "leftEye"
  | "rightEye"
  | "leftEar"
  | "rightEar"
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "leftWrist"
  | "rightWrist"
  | "leftHip"
  | "rightHip"
  | "leftKnee"
  | "rightKnee"
  | "leftAnkle"
  | "rightAnkle"
  | "leftHeel"
  | "rightHeel"
  | "leftFootIndex"
  | "rightFootIndex";

export interface PoseKeypoint {
  name: JointName;
  x: number; // normalized [0,1] across video width
  y: number; // normalized [0,1] across video height
  score?: number; // confidence 0-1
}

export interface PoseFrame {
  time: number; // seconds from start
  keypoints: PoseKeypoint[];
}

export interface AngleMetric {
  mean: number;
  min: number;
  max: number;
}

export interface SymmetryMetric {
  left: number;
  right: number;
  asymmetry: number; // abs(left-right)
}

export interface GaitPhaseAngles {
  hipFlexion: number;
  hipExtension: number;
  kneeFlexion: number;
  kneeExtension: number;
  ankleDorsiflexion: number;
  anklePlantarflexion: number;
}

export interface StancePhaseData {
  initialContact: {
    hipAngle: number | null;
    kneeAngle: number | null;
    ankleAngle: number | null;
  };
  footFlat: {
    hipAngle: number | null;
    kneeAngle: number | null;
    ankleAngle: number | null;
  };
  midStance: {
    hipAngle: number | null;
    kneeAngle: number | null;
    ankleAngle: number | null;
  };
  heelOff: {
    hipAngle: number | null;
    kneeAngle: number | null;
    ankleAngle: number | null;
  };
  toeOff: {
    hipAngle: number | null;
    kneeAngle: number | null;
    ankleAngle: number | null;
  };
  duration: number; // percentage of gait cycle
}

export interface SwingPhaseData {
  acceleration: {
    hipAngle: number | null;
    kneeAngle: number | null;
    ankleAngle: number | null;
  };
  midSwing: {
    hipAngle: number | null;
    kneeAngle: number | null;
    ankleAngle: number | null;
  };
  deceleration: {
    hipAngle: number | null;
    kneeAngle: number | null;
    ankleAngle: number | null;
  };
  duration: number; // percentage of gait cycle
}

export interface GaitKinematics {
  stancePhase: StancePhaseData;
  swingPhase: SwingPhaseData;
  armSwingAmplitude: SymmetryMetric | null;
  armCrossoverDeg: AngleMetric | null;
}

export interface RunningFormMetrics {
  // 1. Posture & Alignment
  forwardLeanDeg: AngleMetric | null;
  hipDropDeg: SymmetryMetric | null;
  spineAlignmentDeg: AngleMetric | null;

  // 2. Leg & Foot Mechanics
  overstrideIndex: AngleMetric | null;
  footStrikePattern: {
    heelPercent: number;
    midfootPercent: number;
    forefootPercent: number;
  } | null;
  pronationIndex: SymmetryMetric | null;
  kneeValgusDeg: SymmetryMetric | null;

  // 3. Arm Movements
  armCrossingIndex: AngleMetric | null;
  armSwingRangeDeg: SymmetryMetric | null;
  armAsymmetry: SymmetryMetric | null;

  // 4. Cadence & Stride
  cadenceSpm: number | null; // steps per minute
  strideLengthM: AngleMetric | null;
  contactTimeMs: SymmetryMetric | null;
  verticalOscillationCm: AngleMetric | null;

  // 5. Symmetry
  overallSymmetryScore: number | null; // 0-1
  
  // 6. Gait Kinematics (NEW)
  gaitKinematics: GaitKinematics | null;
}

export interface RunningFormIssue {
  id: string;
  category:
    | "Posture & Alignment"
    | "Leg & Foot Mechanics"
    | "Arm Movements"
    | "Cadence & Stride"
    | "Symmetry";
  severity: "low" | "medium" | "high";
  label: string;
  description: string;
  recommendation: string;
}

export interface BiometricPredictions {
  estimatedAge?: number;
  ageConfidence?: number;
  estimatedGender?: "male" | "female" | "unknown";
  genderConfidence?: number;
  estimatedHeightCm?: number;
  estimatedWeightKg?: number;
  injuryRiskScore: number; // 0-1, higher = more risk
  injuryRiskAreas: string[];
  runningExperienceLevel?: "beginner" | "intermediate" | "advanced";
}

export interface RunningFormAnalysis {
  summary: string;
  metrics: RunningFormMetrics;
  issues: RunningFormIssue[];
  predictions: BiometricPredictions;
}


