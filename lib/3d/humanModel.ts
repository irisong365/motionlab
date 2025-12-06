import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Material presets for anatomical rendering
const createAnatomyMaterials = () => {
  // Muscle/flesh material - warm skin-like appearance
  const muscleMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4a88c,
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  // Tendon/connective tissue material
  const tendonMaterial = new THREE.MeshStandardMaterial({
    color: 0xffeedd,
    roughness: 0.4,
    metalness: 0.1,
  });

  // Accent material for depth
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xc98b6a,
    roughness: 0.7,
    metalness: 0.0,
  });

  return { muscleMaterial, tendonMaterial, accentMaterial };
};

// Create smooth muscle-like geometry using lathe
function createMuscleShape(
  profile: THREE.Vector2[],
  segments: number = 32
): THREE.LatheGeometry {
  return new THREE.LatheGeometry(profile, segments);
}

// Create an anatomically-inspired human body mesh
export function createHumanBodyMesh(): THREE.Group {
  const bodyGroup = new THREE.Group();
  const { muscleMaterial, tendonMaterial, accentMaterial } = createAnatomyMaterials();

  // HEAD - More realistic skull/face shape
  const headProfile = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const angle = t * Math.PI;
    // Egg-shaped profile with slight jaw
    let radius = Math.sin(angle) * 0.12;
    if (t > 0.7) {
      radius *= 0.85 + (1 - t) * 0.5; // Narrower at chin
    }
    headProfile.push(new THREE.Vector2(radius, t * 0.24 - 0.12));
  }
  const headGeometry = createMuscleShape(headProfile, 32);
  const head = new THREE.Mesh(headGeometry, muscleMaterial);
  head.position.y = 0.78;
  head.scale.set(1, 1, 0.9);
  bodyGroup.add(head);

  // NECK - Cylindrical with slight taper
  const neckProfile = [
    new THREE.Vector2(0.065, 0),
    new THREE.Vector2(0.07, 0.03),
    new THREE.Vector2(0.075, 0.06),
    new THREE.Vector2(0.08, 0.09),
    new THREE.Vector2(0.09, 0.12),
  ];
  const neckGeometry = createMuscleShape(neckProfile, 24);
  const neck = new THREE.Mesh(neckGeometry, muscleMaterial);
  neck.position.y = 0.52;
  bodyGroup.add(neck);

  // TRAPEZIUS muscles (shoulder to neck)
  [-1, 1].forEach((side) => {
    const trapProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.06, 0.02),
      new THREE.Vector2(0.08, 0.04),
      new THREE.Vector2(0.06, 0.06),
      new THREE.Vector2(0, 0.08),
    ];
    const trapGeometry = createMuscleShape(trapProfile, 16);
    const trap = new THREE.Mesh(trapGeometry, accentMaterial);
    trap.position.set(side * 0.12, 0.56, -0.02);
    trap.rotation.z = side * 0.4;
    trap.scale.set(1.5, 1, 0.6);
    bodyGroup.add(trap);
  });

  // DELTOIDS (shoulder caps)
  [-1, 1].forEach((side) => {
    const deltoidGeometry = new THREE.SphereGeometry(0.09, 24, 24);
    const deltoid = new THREE.Mesh(deltoidGeometry, muscleMaterial);
    deltoid.position.set(side * 0.22, 0.48, 0);
    deltoid.scale.set(1.1, 0.8, 0.9);
    bodyGroup.add(deltoid);
  });

  // PECTORALIS (chest muscles)
  [-1, 1].forEach((side) => {
    const pecGeometry = new THREE.SphereGeometry(0.1, 24, 24);
    const pec = new THREE.Mesh(pecGeometry, muscleMaterial);
    pec.position.set(side * 0.08, 0.38, 0.06);
    pec.scale.set(1.3, 0.7, 0.6);
    bodyGroup.add(pec);
  });

  // TORSO CORE - Ribcage shape
  const torsoProfile = [];
  for (let i = 0; i <= 15; i++) {
    const t = i / 15;
    // Tapered torso shape
    const radius = 0.14 - t * 0.02 + Math.sin(t * Math.PI) * 0.02;
    torsoProfile.push(new THREE.Vector2(radius, t * 0.35));
  }
  const torsoGeometry = createMuscleShape(torsoProfile, 24);
  const torso = new THREE.Mesh(torsoGeometry, muscleMaterial);
  torso.position.y = 0.18;
  torso.scale.set(1.1, 1, 0.7);
  bodyGroup.add(torso);

  // ABDOMINALS (6-pack definition)
  for (let row = 0; row < 3; row++) {
    [-1, 1].forEach((side) => {
      const abGeometry = new THREE.SphereGeometry(0.035, 16, 16);
      const ab = new THREE.Mesh(abGeometry, accentMaterial);
      ab.position.set(side * 0.04, 0.28 - row * 0.08, 0.1);
      ab.scale.set(1.2, 1.3, 0.5);
      bodyGroup.add(ab);
    });
  }

  // OBLIQUES (side abs)
  [-1, 1].forEach((side) => {
    const obliqueGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.2, 12);
    const oblique = new THREE.Mesh(obliqueGeometry, accentMaterial);
    oblique.position.set(side * 0.13, 0.2, 0.02);
    oblique.rotation.z = side * 0.3;
    bodyGroup.add(oblique);
  });

  // PELVIS/HIPS
  const pelvisGeometry = new THREE.SphereGeometry(0.15, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
  const pelvis = new THREE.Mesh(pelvisGeometry, muscleMaterial);
  pelvis.rotation.x = Math.PI;
  pelvis.position.y = 0.02;
  pelvis.scale.set(1.1, 0.6, 0.8);
  bodyGroup.add(pelvis);

  // GLUTEUS (buttocks)
  [-1, 1].forEach((side) => {
    const gluteGeometry = new THREE.SphereGeometry(0.1, 20, 20);
    const glute = new THREE.Mesh(gluteGeometry, muscleMaterial);
    glute.position.set(side * 0.08, -0.05, -0.06);
    glute.scale.set(1, 1.1, 0.9);
    bodyGroup.add(glute);
  });

  // ARMS
  [-1, 1].forEach((side) => {
    // BICEPS
    const bicepProfile = [
      new THREE.Vector2(0.04, 0),
      new THREE.Vector2(0.055, 0.05),
      new THREE.Vector2(0.06, 0.1),
      new THREE.Vector2(0.055, 0.15),
      new THREE.Vector2(0.045, 0.22),
      new THREE.Vector2(0.04, 0.26),
    ];
    const bicepGeometry = createMuscleShape(bicepProfile, 20);
    const bicep = new THREE.Mesh(bicepGeometry, muscleMaterial);
    bicep.position.set(side * 0.24, 0.16, 0.02);
    bicep.rotation.z = side * 0.1;
    bodyGroup.add(bicep);

    // TRICEPS (back of upper arm)
    const tricepGeometry = new THREE.CylinderGeometry(0.04, 0.045, 0.22, 16);
    const tricep = new THREE.Mesh(tricepGeometry, accentMaterial);
    tricep.position.set(side * 0.24, 0.28, -0.02);
    tricep.rotation.z = side * 0.1;
    bodyGroup.add(tricep);

    // ELBOW joint
    const elbowGeometry = new THREE.SphereGeometry(0.045, 16, 16);
    const elbow = new THREE.Mesh(elbowGeometry, tendonMaterial);
    elbow.position.set(side * 0.26, 0.08, 0);
    bodyGroup.add(elbow);

    // FOREARM (brachioradialis)
    const forearmProfile = [
      new THREE.Vector2(0.045, 0),
      new THREE.Vector2(0.05, 0.04),
      new THREE.Vector2(0.048, 0.1),
      new THREE.Vector2(0.04, 0.18),
      new THREE.Vector2(0.035, 0.24),
    ];
    const forearmGeometry = createMuscleShape(forearmProfile, 18);
    const forearm = new THREE.Mesh(forearmGeometry, muscleMaterial);
    forearm.position.set(side * 0.28, -0.16, 0.02);
    forearm.rotation.z = side * 0.15;
    bodyGroup.add(forearm);

    // WRIST
    const wristGeometry = new THREE.CylinderGeometry(0.028, 0.032, 0.05, 12);
    const wrist = new THREE.Mesh(wristGeometry, tendonMaterial);
    wrist.position.set(side * 0.30, -0.22, 0.02);
    bodyGroup.add(wrist);

    // HAND
    const handGeometry = new THREE.BoxGeometry(0.055, 0.09, 0.025);
    const hand = new THREE.Mesh(handGeometry, muscleMaterial);
    hand.position.set(side * 0.30, -0.29, 0.03);
    bodyGroup.add(hand);

    // Fingers (simplified)
    for (let f = 0; f < 4; f++) {
      const fingerGeometry = new THREE.CylinderGeometry(0.008, 0.006, 0.05, 8);
      const finger = new THREE.Mesh(fingerGeometry, muscleMaterial);
      finger.position.set(side * (0.28 + f * 0.015 - 0.02), -0.36, 0.03);
      bodyGroup.add(finger);
    }
    // Thumb
    const thumbGeometry = new THREE.CylinderGeometry(0.01, 0.008, 0.04, 8);
    const thumb = new THREE.Mesh(thumbGeometry, muscleMaterial);
    thumb.position.set(side * 0.32, -0.30, 0.05);
    thumb.rotation.z = side * 0.5;
    bodyGroup.add(thumb);
  });

  // LEGS
  [-1, 1].forEach((side) => {
    // QUADRICEPS (front thigh)
    const quadProfile = [
      new THREE.Vector2(0.08, 0),
      new THREE.Vector2(0.095, 0.08),
      new THREE.Vector2(0.1, 0.18),
      new THREE.Vector2(0.09, 0.3),
      new THREE.Vector2(0.075, 0.4),
      new THREE.Vector2(0.07, 0.45),
    ];
    const quadGeometry = createMuscleShape(quadProfile, 24);
    const quad = new THREE.Mesh(quadGeometry, muscleMaterial);
    quad.position.set(side * 0.09, -0.52, 0.02);
    bodyGroup.add(quad);

    // HAMSTRINGS (back thigh)
    const hamGeometry = new THREE.CylinderGeometry(0.065, 0.08, 0.38, 18);
    const ham = new THREE.Mesh(hamGeometry, accentMaterial);
    ham.position.set(side * 0.09, -0.28, -0.03);
    bodyGroup.add(ham);

    // Inner thigh (adductors)
    const adductorGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.35, 14);
    const adductor = new THREE.Mesh(adductorGeometry, accentMaterial);
    adductor.position.set(side * 0.04, -0.25, 0);
    adductor.rotation.z = -side * 0.15;
    bodyGroup.add(adductor);

    // KNEE
    const kneeGeometry = new THREE.SphereGeometry(0.07, 18, 18);
    const knee = new THREE.Mesh(kneeGeometry, tendonMaterial);
    knee.position.set(side * 0.09, -0.50, 0);
    knee.scale.set(0.9, 0.7, 0.85);
    bodyGroup.add(knee);

    // Kneecap (patella)
    const patellaGeometry = new THREE.SphereGeometry(0.035, 12, 12);
    const patella = new THREE.Mesh(patellaGeometry, tendonMaterial);
    patella.position.set(side * 0.09, -0.50, 0.05);
    bodyGroup.add(patella);

    // CALF (gastrocnemius)
    const calfProfile = [
      new THREE.Vector2(0.06, 0),
      new THREE.Vector2(0.075, 0.06),
      new THREE.Vector2(0.08, 0.12),
      new THREE.Vector2(0.07, 0.22),
      new THREE.Vector2(0.055, 0.32),
      new THREE.Vector2(0.045, 0.38),
    ];
    const calfGeometry = createMuscleShape(calfProfile, 22);
    const calf = new THREE.Mesh(calfGeometry, muscleMaterial);
    calf.position.set(side * 0.09, -0.92, -0.01);
    bodyGroup.add(calf);

    // TIBIALIS (shin muscle)
    const shinGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.3, 12);
    const shin = new THREE.Mesh(shinGeometry, accentMaterial);
    shin.position.set(side * 0.09, -0.68, 0.04);
    bodyGroup.add(shin);

    // ANKLE
    const ankleGeometry = new THREE.SphereGeometry(0.045, 14, 14);
    const ankle = new THREE.Mesh(ankleGeometry, tendonMaterial);
    ankle.position.set(side * 0.09, -0.92, 0);
    ankle.scale.set(0.9, 0.6, 0.9);
    bodyGroup.add(ankle);

    // Achilles tendon
    const achillesGeometry = new THREE.CylinderGeometry(0.015, 0.025, 0.12, 8);
    const achilles = new THREE.Mesh(achillesGeometry, tendonMaterial);
    achilles.position.set(side * 0.09, -0.88, -0.04);
    bodyGroup.add(achilles);

    // FOOT
    const footProfile = [
      new THREE.Vector2(0.04, 0),
      new THREE.Vector2(0.05, 0.04),
      new THREE.Vector2(0.045, 0.12),
      new THREE.Vector2(0.035, 0.18),
    ];
    const footGeometry = createMuscleShape(footProfile, 16);
    const foot = new THREE.Mesh(footGeometry, muscleMaterial);
    foot.position.set(side * 0.09, -0.98, 0.08);
    foot.rotation.x = -Math.PI / 2;
    foot.scale.set(1.1, 1.2, 0.7);
    bodyGroup.add(foot);

    // Toes (simplified)
    for (let t = 0; t < 5; t++) {
      const toeGeometry = new THREE.SphereGeometry(0.012, 8, 8);
      const toe = new THREE.Mesh(toeGeometry, muscleMaterial);
      toe.position.set(side * (0.07 + t * 0.01 - 0.02), -1.0, 0.16 + (t === 0 ? 0 : -t * 0.008));
      bodyGroup.add(toe);
    }
  });

  // BACK MUSCLES (latissimus dorsi)
  [-1, 1].forEach((side) => {
    const latGeometry = new THREE.PlaneGeometry(0.12, 0.25, 4, 6);
    // Deform the lat for organic look
    const latPositions = latGeometry.attributes.position;
    for (let i = 0; i < latPositions.count; i++) {
      const x = latPositions.getX(i);
      const y = latPositions.getY(i);
      const z = -0.02 - Math.abs(x) * 0.1 - (y + 0.125) * 0.05;
      latPositions.setZ(i, z);
    }
    latGeometry.computeVertexNormals();
    const lat = new THREE.Mesh(latGeometry, accentMaterial);
    lat.position.set(side * 0.1, 0.32, -0.08);
    lat.rotation.y = side * 0.3;
    bodyGroup.add(lat);
  });

  // SPINE bumps
  for (let i = 0; i < 8; i++) {
    const vertebraGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const vertebra = new THREE.Mesh(vertebraGeometry, tendonMaterial);
    vertebra.position.set(0, 0.5 - i * 0.07, -0.1);
    vertebra.scale.set(1.2, 0.8, 0.6);
    bodyGroup.add(vertebra);
  }

  // Enable smooth shading for all meshes
  bodyGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.computeVertexNormals();
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return bodyGroup;
}

// Load an external GLTF human model
export async function loadGLTFHumanModel(
  url: string,
  onProgress?: (progress: number) => void
): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        
        // Scale and center the model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        // Scale to fit in ~2 units height
        const scale = 2 / size.y;
        model.scale.setScalar(scale);
        
        // Center the model
        model.position.sub(center.multiplyScalar(scale));
        model.position.y -= 0.5; // Offset to stand on ground
        
        // Apply better materials if needed
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Enhance material if it's basic
            if (child.material instanceof THREE.MeshBasicMaterial) {
              const color = child.material.color.clone();
              child.material = new THREE.MeshStandardMaterial({
                color,
                roughness: 0.6,
                metalness: 0.1,
              });
            }
          }
        });
        
        resolve(model);
      },
      (progress) => {
        if (onProgress && progress.total > 0) {
          onProgress(progress.loaded / progress.total);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

// Create a stylized "écorché" (anatomical) figure with visible muscle definition
export function createEcorcheModel(): THREE.Group {
  const group = new THREE.Group();
  
  // Red muscle fiber material
  const muscleFiberMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc4444,
    roughness: 0.7,
    metalness: 0.0,
  });
  
  // Lighter fascia/tendon material  
  const fasciaMaterial = new THREE.MeshStandardMaterial({
    color: 0xeecc99,
    roughness: 0.5,
    metalness: 0.05,
  });
  
  // Start with base anatomical model
  const baseModel = createHumanBodyMesh();
  
  // Update materials to écorché style
  baseModel.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const material = child.material as THREE.MeshStandardMaterial;
      if (material.color) {
        // Convert to muscle red tones
        const hsl = { h: 0, s: 0, l: 0 };
        material.color.getHSL(hsl);
        
        if (hsl.l > 0.6) {
          // Lighter areas become fascia
          child.material = fasciaMaterial.clone();
        } else {
          // Darker areas become muscle
          child.material = muscleFiberMaterial.clone();
        }
      }
    }
  });
  
  group.add(baseModel);
  return group;
}
