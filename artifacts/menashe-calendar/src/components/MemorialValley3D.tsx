import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Instances, Instance, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import type { CommunityYahrzeitEntry } from "../lib/userApi";
import {
  SceneFoundation,
  GoldenHourLighting,
  PostProcessingPipeline,
  SceneEnvironment,
  QualityProvider,
  useQuality,
} from "../scene";

/* ── LCG seeded deterministic random ──────────────────────────────────────── */
function makeLCG(seed = 42) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
}

/* ── Water vertex shader ──────────────────────────────────────────────────── */
const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vWorldPos;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave =  sin(pos.x * 1.8 + uTime * 1.4) * 0.09
                + sin(pos.z * 2.4 + uTime * 1.1) * 0.06
                + sin((pos.x + pos.z) * 1.2 + uTime * 0.9) * 0.05;
    pos.y += wave;
    vec3 bitangent = vec3(0.0, 0.0, 1.0);
    float dX = cos(pos.x * 1.8 + uTime * 1.4) * 1.8 * 0.09 + cos((pos.x + pos.z) * 1.2 + uTime * 0.9) * 1.2 * 0.05;
    float dZ = cos(pos.z * 2.4 + uTime * 1.1) * 2.4 * 0.06 + cos((pos.x + pos.z) * 1.2 + uTime * 0.9) * 1.2 * 0.05;
    vNormal = normalize(vec3(-dX, 1.0, -dZ));
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const WATER_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3  uDeep;
  uniform vec3  uShallow;
  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vWorldPos;

  /* Cheap caustics — overlapping sine grid */
  float caustics(vec2 uv, float t) {
    vec2 p  = uv * 14.0;
    float c = sin(p.x * 1.1 + t * 1.8) * sin(p.y * 0.9 + t * 1.4)
            + sin((p.x + p.y) * 0.8 + t * 2.1) * 0.5
            + sin((p.x - p.y) * 1.3 + t * 1.6) * 0.35;
    return smoothstep(0.6, 1.1, c + 1.0);
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

    /* Golden-hour sky colour blended into water surface */
    vec3 sky = mix(vec3(0.50, 0.68, 0.90), vec3(1.0, 0.72, 0.28), 0.42);

    /* Animated flow pattern */
    vec2 flow1 = vUv + vec2(uTime * 0.038, uTime * 0.022);
    vec2 flow2 = vUv - vec2(uTime * 0.024, uTime * 0.018);
    float pattern = sin(flow1.x * 13.0) * sin(flow1.y * 9.0) * 0.025
                  + sin(flow2.x * 8.0)  * sin(flow2.y * 11.0) * 0.018;

    /* Caustic shimmer in shallow zones */
    float caus = caustics(vUv, uTime) * 0.12 * (1.0 - fresnel);

    vec3 col = mix(uDeep, uShallow, fresnel + pattern + caus);
    col = mix(col, sky, fresnel * 0.58);
    col += vec3(0.9, 0.75, 0.3) * caus * 0.22; /* warm caustic tint */

    /* Edge foam */
    float foam = smoothstep(0.85, 1.0, abs(sin(vUv.x * 24.0 + uTime) * sin(vUv.y * 19.0 + uTime * 0.8)));
    col = mix(col, vec3(0.94, 0.97, 1.0), foam * 0.22);

    gl_FragColor = vec4(col, 0.88 + fresnel * 0.10);
  }
`;

/* ── Flame vertex shader ──────────────────────────────────────────────────── */
const FLAME_VERT = /* glsl */`
  uniform float uTime;
  uniform float uOffset;
  varying float vHeight;
  void main() {
    vec3 pos = position;
    float t = uTime + uOffset;
    float flicker = sin(t * 8.3) * 0.14 + sin(t * 5.1) * 0.09 + sin(t * 13.7) * 0.05;
    float twist   = sin(t * 3.2 + pos.y * 4.0) * 0.1;
    pos.x += pos.y * twist + sin(t * 6.0 + pos.y) * 0.05 * pos.y;
    pos.z += pos.y * cos(twist) * 0.08;
    pos.x *= (1.0 + flicker * pos.y);
    pos.z *= (1.0 + flicker * pos.y);
    vHeight = (pos.y + 0.05) / 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const FLAME_FRAG = /* glsl */`
  uniform float uTime;
  varying float vHeight;
  void main() {
    float h = clamp(vHeight, 0.0, 1.0);
    vec3 innerCol = vec3(1.0, 0.98, 0.6);
    vec3 midCol   = vec3(1.0, 0.55, 0.05);
    vec3 tipCol   = vec3(0.9, 0.15, 0.02);
    vec3 col = mix(innerCol, midCol, h);
    col = mix(col, tipCol, h * h);
    float alpha = (1.0 - h) * (0.92 + sin(uTime * 11.0) * 0.06);
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ── Sky dome shaders ─────────────────────────────────────────────────────── */
const SKY_VERT = /* glsl */`
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */`
  uniform vec3  uZenith;
  uniform vec3  uHorizon;
  uniform vec3  uSunGlow;
  uniform vec3  uSunDir;
  uniform float uSunStr;
  uniform float uTime;
  varying vec3  vWorldDir;

  /* Cheap hash for cloud turbulence */
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise2(p); p *= 2.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vWorldDir);

    /* Atmospheric gradient: horizon warm, zenith deep blue */
    vec3 sky = mix(uHorizon, uZenith, pow(max(0.0, d.y), 0.42));

    /* Horizon haze band — extra warm glow where sky meets earth */
    float horizBand = exp(-d.y * 5.5) * 0.72;
    sky = mix(sky, uHorizon * 1.35, horizBand);

    /* Rayleigh-like scattering: blue shift toward zenith */
    float rayleigh = pow(max(0.0, d.y), 0.6) * 0.18 * uSunStr;
    sky += vec3(0.05, 0.12, 0.28) * rayleigh;

    /* Mie forward scattering: warm halo toward sun */
    float sd   = dot(d, normalize(uSunDir));
    float mie  = pow(max(0.0, sd * 0.5 + 0.5), 10.0) * 0.55 * uSunStr;
    sky += uSunGlow * mie;

    /* Sun corona + disc */
    float disc  = smoothstep(0.9945, 0.9985, sd) * uSunStr;
    float halo  = smoothstep(0.55,   0.9945, sd) * uSunStr * 0.40;
    sky = mix(sky, uSunGlow * 1.6, disc);
    sky += uSunGlow * halo * 0.38;

    /* Procedural cloud layer — only above horizon, driven by uTime */
    float cloudElevation = smoothstep(0.08, 0.50, d.y);
    if (cloudElevation > 0.01 && uSunStr > 0.05) {
      /* Project sky dir onto a flat cloud plane */
      vec2 cUV = d.xz / max(d.y, 0.05) * 1.8;
      cUV.x += uTime * 0.006;   /* slow drift */
      cUV.y += uTime * 0.003;

      float cloud = fbm(cUV * 1.4) - 0.38;
      cloud = smoothstep(0.0, 0.42, cloud) * cloudElevation;
      cloud *= (1.0 - horizBand * 1.4);  /* clouds fade at horizon */

      /* Cloud colour: lit side warm white, shadow side grey-blue */
      float cloudShadow = dot(vec3(cUV * 0.5, 0.8), normalize(uSunDir)) * 0.5 + 0.5;
      vec3 cloudLit   = mix(vec3(0.85, 0.78, 0.70), vec3(1.0, 0.98, 0.94), cloudShadow) * uSunStr;
      vec3 cloudDark  = mix(uZenith * 0.55, vec3(0.60, 0.65, 0.72), 0.5);
      vec3 cloudCol   = mix(cloudDark, cloudLit, cloudShadow * uSunStr);

      sky = mix(sky, cloudCol, clamp(cloud * 0.88, 0.0, 0.8));
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;

/* ── Ground mist shaders (PUBG-style volumetric low-altitude fog) ─────────── */
const MIST_VERT = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.y += sin(pos.x * 0.09 + uTime * 0.11) * 0.28
           + sin(pos.z * 0.12 + uTime * 0.08) * 0.20
           + sin((pos.x + pos.z) * 0.07 + uTime * 0.06) * 0.14;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const MIST_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i+vec2(1.0,0.0)),
          c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.08; a *= 0.50; }
    return v;
  }
  void main() {
    vec2 d1 = vUv + vec2(uTime * 0.014, uTime * 0.009);
    vec2 d2 = vUv - vec2(uTime * 0.009, uTime * 0.013);
    float mist = fbm(d1 * 2.6) * fbm(d2 * 1.4 + 0.8);
    mist = smoothstep(0.08, 0.58, mist);
    float edge = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y));
    mist *= smoothstep(0.0, 0.18, edge);
    /* Slight cool-blue tint for mist, warmer near center (candles) */
    vec3 col = mix(vec3(0.76, 0.82, 0.92), vec3(0.94, 0.90, 0.82), smoothstep(0.3, 0.7, vUv.x));
    gl_FragColor = vec4(col, mist * uOpacity);
  }
`;

/* ── Day/night cycle constants ────────────────────────────────────────────── */
const CYCLE_DURATION = 120; // seconds per full day/night loop

interface ColorKF { t: number; r: number; g: number; b: number }

/* Keyframe stops:  0=golden  0.20=sunset  0.35=dusk  0.50=night  0.70=predawn  0.85=dawn  1.0=golden */
const FOG_KF: ColorKF[] = [
  { t: 0.00, r: 0.831, g: 0.659, b: 0.353 },
  { t: 0.20, r: 0.752, g: 0.376, b: 0.157 },
  { t: 0.35, r: 0.188, g: 0.094, b: 0.282 },
  { t: 0.50, r: 0.039, g: 0.039, b: 0.118 },
  { t: 0.70, r: 0.063, g: 0.094, b: 0.196 },
  { t: 0.85, r: 0.545, g: 0.251, b: 0.118 },
  { t: 1.00, r: 0.831, g: 0.659, b: 0.353 },
];
const SKY_ZENITH_KF: ColorKF[] = [
  { t: 0.00, r: 0.29, g: 0.49, b: 0.82 },
  { t: 0.20, r: 0.20, g: 0.12, b: 0.38 },
  { t: 0.35, r: 0.07, g: 0.04, b: 0.18 },
  { t: 0.50, r: 0.01, g: 0.01, b: 0.06 },
  { t: 0.70, r: 0.02, g: 0.03, b: 0.10 },
  { t: 0.85, r: 0.14, g: 0.07, b: 0.24 },
  { t: 1.00, r: 0.29, g: 0.49, b: 0.82 },
];
const SKY_HORIZON_KF: ColorKF[] = [
  { t: 0.00, r: 0.98, g: 0.75, b: 0.42 },
  { t: 0.20, r: 0.96, g: 0.35, b: 0.10 },
  { t: 0.35, r: 0.35, g: 0.15, b: 0.42 },
  { t: 0.50, r: 0.05, g: 0.05, b: 0.12 },
  { t: 0.70, r: 0.08, g: 0.08, b: 0.18 },
  { t: 0.85, r: 0.95, g: 0.45, b: 0.20 },
  { t: 1.00, r: 0.98, g: 0.75, b: 0.42 },
];

function interpCycleColor(t: number, kfs: ColorKF[]) {
  let lo = kfs[kfs.length - 1], hi = kfs[0];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (t >= kfs[i].t && t <= kfs[i + 1].t) { lo = kfs[i]; hi = kfs[i + 1]; break; }
  }
  const span = hi.t - lo.t;
  const f = span > 0 ? (t - lo.t) / span : 0;
  const s = f * f * (3 - 2 * f); // smoothstep
  return { r: lo.r + (hi.r - lo.r) * s, g: lo.g + (hi.g - lo.g) * s, b: lo.b + (hi.b - lo.b) * s };
}

/* ── Scene view type ─────────────────────────────────────────────────────── */
export type SceneViewType = "valley" | "garden" | "waterfall" | "sanctuary" | "sunset";

const SCENE_VIEWS: Record<SceneViewType, { cam: [number, number, number]; target: [number, number, number] }> = {
  valley:    { cam: [0,    4.2,  18],  target: [0,    2.0,   0]   },
  garden:    { cam: [-8,   3.5,  12],  target: [-9,   1.5,  -4]   },
  waterfall: { cam: [-14,  3.2,   4],  target: [-18,  2.5,  -8]   },
  sanctuary: { cam: [0,    3.5,   8],  target: [0,    4.5, -25]   },
  sunset:    { cam: [24,   3.8,  10],  target: [0,    2.0,   4]   },
};

/* ── Phase 3 seeded data ──────────────────────────────────────────────────── */
const R_BIRD  = makeLCG(83);
const BIRDS   = Array.from({ length: 7 }, () => ({
  radius: 22 + R_BIRD() * 18, height: 28 + R_BIRD() * 12,
  speed:  0.050 + R_BIRD() * 0.040, phase: R_BIRD() * Math.PI * 2,
  flapSp: 2.0 + R_BIRD() * 1.4,    flapAm: 0.38 + R_BIRD() * 0.18,
  zOff:   (R_BIRD() - 0.5) * 10,
}));

const R_BUTT  = makeLCG(59);
const BFLIES  = Array.from({ length: 10 }, () => {
  const v = R_BUTT();
  return {
    x: (R_BUTT() - 0.5) * 24, z: (R_BUTT() - 0.5) * 24, y: 0.55 + R_BUTT() * 1.0,
    speed: 0.22 + R_BUTT() * 0.28, radius: 0.9 + R_BUTT() * 1.6,
    phase: R_BUTT() * Math.PI * 2,  flapSp: 5.5 + R_BUTT() * 4.5,
    col: v > 0.62 ? "#f0b030" : v > 0.32 ? "#cc58c0" : "#58a0e0",
  };
});

const R_LEAF  = makeLCG(73);
const LEAF_D  = Array.from({ length: 55 }, () => ({
  x: (R_LEAF() - 0.5) * 46, y: 3 + R_LEAF() * 9, z: (R_LEAF() - 0.5) * 46,
  sp: 0.18 + R_LEAF() * 0.34, dr: (R_LEAF() - 0.5) * 0.45,
  sn: (R_LEAF() - 0.5) * 2.2, ph: R_LEAF() * Math.PI * 2, sc: 0.10 + R_LEAF() * 0.11,
}));

const R_GRASS = makeLCG(89);
const GRASS   = Array.from({ length: 200 }, () => ({
  x: (R_GRASS() - 0.5) * 22, z: (R_GRASS() - 0.5) * 22,
  h: 0.22 + R_GRASS() * 0.18, w: 0.045 + R_GRASS() * 0.04,
  ph: R_GRASS() * Math.PI * 2, tilt: (R_GRASS() - 0.5) * 0.35,
}));

/* ── Position generators ──────────────────────────────────────────────────── */
const R_TREE   = makeLCG(17);
const TREE_POS = Array.from({ length: 70 }, () => {
  const ang = R_TREE() * Math.PI * 2;
  const rad = 20 + R_TREE() * 20;
  return [Math.cos(ang) * rad, Math.sin(ang) * rad] as [number, number];
});

const R_BG    = makeLCG(7);
const BG_CANDLES: [number, number, number][] = [];
const RINGS = [
  { count: 40, rMin: 6,  rMax: 10 }, { count: 60, rMin: 12, rMax: 18 },
  { count: 80, rMin: 19, rMax: 28 }, { count: 50, rMin: 29, rMax: 36 },
];
for (const ring of RINGS) {
  for (let i = 0; i < ring.count; i++) {
    const a = R_BG() * Math.PI * 2, r = ring.rMin + R_BG() * (ring.rMax - ring.rMin);
    const x = Math.cos(a) * r + (R_BG() - 0.5) * 1.8;
    const z = Math.sin(a) * r + (R_BG() - 0.5) * 1.8;
    if (Math.sqrt(x * x + z * z) > 5 && !(Math.abs(x) < 4 && Math.abs(z) > 14)) BG_CANDLES.push([x, 0, z]);
  }
}

const R_LAN = makeLCG(99);
const LANTERNS = Array.from({ length: 32 }, () => ({
  x: (R_LAN() - 0.5) * 50, z: (R_LAN() - 0.5) * 50,
  startY: R_LAN() * 12 + 1, speed: 0.3 + R_LAN() * 0.6,
  drift: (R_LAN() - 0.5) * 0.14, phase: R_LAN() * Math.PI * 2,
}));

function buildEntryPositions() {
  const zones = [
    { cx: 0,   cz: 5,   r: 4.2, count: 14 },
    { cx: -11, cz: 2,   r: 3.0, count: 9  },
    { cx: 11,  cz: 2,   r: 3.0, count: 9  },
    { cx: 0,   cz: -11, r: 3.0, count: 9  },
    { cx: 0,   cz: 14,  r: 2.8, count: 8  },
    { cx: -11, cz: -10, r: 2.4, count: 6  },
    { cx: 11,  cz: -10, r: 2.4, count: 6  },
    { cx: -11, cz: 13,  r: 2.4, count: 6  },
    { cx: 11,  cz: 13,  r: 2.4, count: 6  },
  ];
  const out: [number, number, number][] = [];
  zones.forEach(z => {
    for (let i = 0; i < z.count; i++) {
      const a = (i / z.count) * Math.PI * 2;
      const r = z.r * (0.35 + (i % 4) * 0.18);
      out.push([z.cx + Math.cos(a) * r, 0.14, z.cz + Math.sin(a) * r]);
    }
  });
  return out;
}
const ENTRY_POSITIONS = buildEntryPositions();

/* AAALighting replaced by scene/lighting/GoldenHourLighting — see AAAValleyScene */

/* ══════════════════════════════════════════════════════════════════════════
   TERRACE WALLS — SPR-030: 3 tiers × 48 stones = 144 DC → 3 InstancedMesh
══════════════════════════════════════════════════════════════════════════ */
function AAATerraceWalls() {
  const TIERS = useMemo(() => [
    { rad: 8,  color: "#c4b898", y: 0.28, h: 0.58 },
    { rad: 14, color: "#bdb090", y: 0.83, h: 0.66 },
    { rad: 20, color: "#b8ac8c", y: 1.38, h: 0.74 },
  ], []);
  const N = 48;

  /* One InstancedMesh per tier (different height = different geometry) */
  const tier0Ref = useRef<THREE.InstancedMesh>(null!);
  const tier1Ref = useRef<THREE.InstancedMesh>(null!);
  const tier2Ref = useRef<THREE.InstancedMesh>(null!);
  const refs = [tier0Ref, tier1Ref, tier2Ref];

  const geos = useMemo(() => TIERS.map(t => new THREE.BoxGeometry(0.68, t.h, 0.32)), [TIERS]);

  const matrixSets = useMemo(() => {
    const dum = new THREE.Object3D();
    return TIERS.map(t => {
      const mats: THREE.Matrix4[] = [];
      for (let j = 0; j < N; j++) {
        const a = (j / N) * Math.PI * 2;
        dum.position.set(Math.cos(a) * t.rad, t.y, Math.sin(a) * t.rad + 4);
        dum.rotation.set(0, a + Math.PI / 2, 0);
        dum.updateMatrix();
        mats.push(dum.matrix.clone());
      }
      return mats;
    });
  }, [TIERS]);

  useEffect(() => {
    refs.forEach((r, ti) => {
      matrixSets[ti].forEach((m, i) => r.current?.setMatrixAt(i, m));
      if (r.current) r.current.instanceMatrix.needsUpdate = true;
    });
  }, [matrixSets]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {TIERS.map((t, ti) => (
        <instancedMesh key={ti} ref={refs[ti]} args={[geos[ti], undefined, N]} castShadow receiveShadow>
          <meshStandardMaterial color={t.color} roughness={0.88} metalness={0.04} />
        </instancedMesh>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 2 TERRAIN — Sculpted valley with vertex colours + natural zones
══════════════════════════════════════════════════════════════════════════ */
function AAATerrain() {
  const mainGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(100, 100, 160, 160);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position!;
    const nr  = makeLCG(3);
    const cr  = makeLCG(91);

    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const d = Math.sqrt(x * x + z * z);

      // Terraced hills + broader rim mountains
      const terrace    = Math.floor(d / 8) * 0.55;
      const blend      = d / 8 - Math.floor(d / 8);
      const smoothStep = blend * blend * (3 - 2 * blend);
      const rim        = Math.max(0, (d - 18) / 14);

      // Layered noise for natural feel
      const noise =
        Math.sin(x * 0.11) * 0.65 + Math.cos(z * 0.15) * 0.55
        + Math.sin(x * 0.33 + z * 0.25) * 0.28
        + Math.sin(x * 0.72 - z * 0.58) * 0.14
        + Math.sin(x * 1.4  + z * 0.9)  * 0.07
        + nr() * 0.1;

      // Cliff faces on north-east rim
      const cliffAngle = Math.atan2(z, x);
      const cliffBoost = Math.max(0, Math.sin(cliffAngle + 0.8)) * Math.max(0, (d - 32) / 10) * 2.5;

      const h = terrace + smoothStep * 0.55 + rim * 6.0 + noise * 0.4 + cliffBoost;

      // River valley + natural depression
      const riverDist = Math.abs(x + 4) < 3.5 ? (3.5 - Math.abs(x + 4)) / 3.5 : 0;
      // Secondary depression south-east (garden hollow)
      const depressionDist = Math.max(0, 1 - Math.sqrt((x - 18) ** 2 + (z - 14) ** 2) / 7) * 0.9;
      const finalH = h - riverDist * 1.3 - depressionDist;
      pos.setY(i, finalH);

      // Vertex colours — grass / stone / soil / riverbank
      const t  = cr();
      const hN = Math.min(1, Math.max(0, finalH / 4));
      const cN = Math.max(0, 1 - d / 28);

      // Grass (low, outer)
      const gR = 0.38 + t * 0.04, gG = 0.54 + t * 0.03, gB = 0.24;
      // Limestone stone (high)
      const sR = 0.76, sG = 0.70, sB = 0.58;
      // Rich soil / garden centre
      const oR = 0.46, oG = 0.37, oB = 0.25;
      // River bank (dark moist soil)
      const rR = 0.28, rG = 0.26, rB = 0.18;

      const riverBlend = riverDist * 0.85;
      const bf = 1 - riverBlend;
      const r0 = gR * (1 - hN) * (1 - cN) * bf + sR * hN * bf + oR * cN * bf + rR * riverBlend;
      const g0 = gG * (1 - hN) * (1 - cN) * bf + sG * hN * bf + oG * cN * bf + rG * riverBlend;
      const b0 = gB * (1 - hN) * (1 - cN) * bf + sB * hN * bf + oB * cN * bf + rB * riverBlend;

      colors[i * 3]     = r0;
      colors[i * 3 + 1] = g0;
      colors[i * 3 + 2] = b0;
    }

    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <>
      {/* Main terrain — vertex-coloured */}
      <mesh geometry={mainGeo} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.0} />
      </mesh>

      {/* Sacred courtyard — pale Jerusalem limestone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4]} receiveShadow>
        <circleGeometry args={[22, 72]} />
        <meshStandardMaterial color="#b8aa88" roughness={0.84} metalness={0.04} />
      </mesh>

      {/* Inner garden lawn — lush green */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 4]} receiveShadow>
        <circleGeometry args={[15, 56]} />
        <meshStandardMaterial color="#6a9448" roughness={0.88} metalness={0.0} />
      </mesh>

      {/* Terrace platform caps — broad limestone ledges */}
      {[8, 14, 20].map((rad, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02 + i * 0.55, 4]}>
          <ringGeometry args={[rad, rad + 0.8, 72]} />
          <meshStandardMaterial color="#ccc0a0" roughness={0.80} metalness={0.05} />
        </mesh>
      ))}

      {/* Stone retaining walls — SPR-030: 144 individual meshes → 3 InstancedMesh */}
      <AAATerraceWalls />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AAA WATER SYSTEM — Animated PBR water
══════════════════════════════════════════════════════════════════════════ */
function AAAWater({ position, args, rotation = [-Math.PI / 2, 0, 0] as [number, number, number], segments = [32, 32] }: {
  position: [number, number, number]; args: [number, number];
  rotation?: [number, number, number]; segments?: [number, number];
}) {
  const uniforms = useRef({
    uTime:    { value: 0 },
    uDeep:    { value: new THREE.Color("#1e5a8a") },
    uShallow: { value: new THREE.Color("#5ab0d8") },
  });
  useFrame(({ clock }) => { uniforms.current.uTime.value = clock.getElapsedTime(); });
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[...args, ...segments] as [number, number, number, number]} />
      <shaderMaterial
        uniforms={uniforms.current}
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
        transparent side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function AAAWaterSystem() {
  return (
    <>
      {/* Central reflection pool */}
      <AAAWater position={[0, 0.38, 4]} args={[10, 15]} />
      {/* Pool basin */}
      <mesh position={[0, 0.14, 4]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.42, 1]}>
        <circleGeometry args={[5.8, 48]} />
        <meshStandardMaterial color="#3a5a70" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Pool rim — Jerusalem limestone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.26, 4]}>
        <ringGeometry args={[5.5, 6.5, 48]} />
        <meshStandardMaterial color="#d4c8a8" roughness={0.75} metalness={0.08} />
      </mesh>
      {/* River channel left */}
      <AAAWater position={[-4.5, -0.22, 10]} args={[3.5, 40]} segments={[16, 64]} />
      {/* River channel right */}
      <AAAWater position={[4.5, -0.22, -12]} args={[3, 30]} segments={[16, 48]} />
      {/* Small reflecting pools on terraces */}
      <AAAWater position={[-14, 0.55, -6]} args={[5, 5]} />
      <AAAWater position={[14, 0.55, 10]} args={[5, 5]} />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WATERFALL
══════════════════════════════════════════════════════════════════════════ */
function AAAWaterfall({ position, height = 4, width = 2 }: {
  position: [number, number, number]; height?: number; width?: number;
}) {
  const uniforms = useRef({ uTime: { value: 0 } });
  const fallVert = /* glsl */`
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.x += sin(pos.y * 6.0 + uTime * 3.0) * 0.04 * pos.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;
  const fallFrag = /* glsl */`
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float v = vUv.y;
      float stripe = sin((vUv.y * 18.0 - uTime * 4.5) + vUv.x * 4.0) * 0.5 + 0.5;
      float foam   = smoothstep(0.0, 0.18, 1.0 - v) + smoothstep(0.82, 1.0, 1.0 - v);
      vec3 col = mix(vec3(0.6, 0.82, 0.95), vec3(0.92, 0.97, 1.0), stripe * 0.6 + foam * 0.4);
      float alpha = (stripe * 0.7 + 0.3) * (0.85 + foam * 0.15);
      gl_FragColor = vec4(col, alpha * 0.88);
    }
  `;
  useFrame(({ clock }) => { uniforms.current.uTime.value = clock.getElapsedTime(); });
  return (
    <group position={position}>
      {/* Falling water */}
      <mesh>
        <planeGeometry args={[width, height, 8, 32]} />
        <shaderMaterial
          uniforms={uniforms.current}
          vertexShader={fallVert}
          fragmentShader={fallFrag}
          transparent side={THREE.DoubleSide}
        />
      </mesh>
      {/* Mist / spray at base */}
      <mesh position={[0, -height / 2 - 0.3, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[width * 0.8, 16]} />
        <meshStandardMaterial color="#c8e8f5" transparent opacity={0.22} roughness={1} />
      </mesh>
      {/* Rock ledge at top */}
      <mesh position={[0, height / 2 + 0.15, -0.2]}>
        <boxGeometry args={[width + 1.2, 0.4, 0.8]} />
        <meshStandardMaterial color="#9a8870" roughness={0.9} metalness={0.05} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STONE BRIDGE
══════════════════════════════════════════════════════════════════════════ */
function AAABridge({ position, rotation = 0, span = 8 }: {
  position: [number, number, number]; rotation?: number; span?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Arch body */}
      {Array.from({ length: 12 }, (_, i) => {
        const t = (i / 11) * Math.PI;
        const x = Math.cos(t - Math.PI / 2) * span * 0.5;
        const y = Math.sin(t - Math.PI / 2) * 1.8 + 1.8;
        return (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, t - Math.PI / 2]}>
            <boxGeometry args={[span * 0.12, 0.55, 2.2]} />
            <meshStandardMaterial color="#c8b888" roughness={0.82} metalness={0.06} />
          </mesh>
        );
      })}
      {/* Deck */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[span, 0.28, 2.2]} />
        <meshStandardMaterial color="#d4c8a8" roughness={0.78} metalness={0.04} />
      </mesh>
      {/* Parapets */}
      {[-1, 1].map((side, i) => (
        <mesh key={i} position={[0, 1.18, side * 1.05]}>
          <boxGeometry args={[span, 0.5, 0.22]} />
          <meshStandardMaterial color="#ccc0a0" roughness={0.8} metalness={0.05} />
        </mesh>
      ))}
      {/* Parapet posts */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = (i / 5) * span - span / 2;
        return [-1, 1].map((side, j) => (
          <mesh key={`${i}-${j}`} position={[x, 1.36, side * 1.05]}>
            <boxGeometry args={[0.22, 0.36, 0.22]} />
            <meshStandardMaterial color="#bbb098" roughness={0.8} metalness={0.05} />
          </mesh>
        ));
      })}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   JERUSALEM SANCTUARY — detailed limestone architecture
══════════════════════════════════════════════════════════════════════════ */
function AAAArchitecture() {
  const stoneMat  = { color: "#ddd0b0", roughness: 0.76, metalness: 0.06 };
  const stoneDark = { color: "#c4b494", roughness: 0.82, metalness: 0.04 };
  const goldMat   = { color: "#D4AF37", roughness: 0.35, metalness: 0.75, emissive: "#8a6200" as unknown as THREE.Color, emissiveIntensity: 0.25 };

  return (
    <group position={[0, 0, -25]}>
      {/* Grand platform / stylobate */}
      {[0, 1, 2].map((lvl) => (
        <mesh key={lvl} position={[0, lvl * 0.55 + 0.28, lvl * 0.6]} castShadow receiveShadow>
          <boxGeometry args={[20 - lvl * 2, 0.55, 16 - lvl * 1.2]} />
          <meshStandardMaterial {...stoneDark} />
        </mesh>
      ))}
      {/* Main hall */}
      <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[13, 5.5, 11]} />
        <meshStandardMaterial {...stoneMat} />
      </mesh>
      {/* Clerestory */}
      <mesh position={[0, 7.6, 0.5]} castShadow>
        <boxGeometry args={[9, 2.2, 7.5]} />
        <meshStandardMaterial {...stoneMat} />
      </mesh>
      {/* Golden dome drum */}
      <mesh position={[0, 9.2, 0.5]} castShadow>
        <cylinderGeometry args={[3.2, 3.6, 1.8, 24]} />
        <meshStandardMaterial {...stoneDark} />
      </mesh>
      {/* Golden dome */}
      <mesh position={[0, 11.0, 0.5]} castShadow>
        <sphereGeometry args={[3.15, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial {...goldMat} />
      </mesh>
      {/* Dome finial */}
      <mesh position={[0, 14.15, 0.5]} castShadow>
        <cylinderGeometry args={[0.06, 0.18, 2.0, 8]} />
        <meshStandardMaterial {...goldMat} />
      </mesh>
      {/* 4 corner minarets */}
      {([-4.8, 4.8] as number[]).flatMap(x => ([-4, 4] as number[]).map(z => ({ x, z }))).map(({ x, z }, i) => (
        <group key={i} position={[x, 1.65, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.55, 0.72, 7.5, 12]} />
            <meshStandardMaterial {...stoneDark} />
          </mesh>
          <mesh position={[0, 4.2, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.55, 0.6, 12]} />
            <meshStandardMaterial {...stoneDark} />
          </mesh>
          <mesh position={[0, 4.75, 0]} castShadow>
            <sphereGeometry args={[0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial {...goldMat} />
          </mesh>
        </group>
      ))}
      {/* Arched entrance — triple arch */}
      {[-3, 0, 3].map((xOff, i) => (
        <group key={i} position={[xOff, 2.2, 5.55]}>
          <mesh castShadow>
            <boxGeometry args={[2.4, 4.2, 0.6]} />
            <meshStandardMaterial {...stoneMat} />
          </mesh>
          <mesh position={[0, -0.5, 0.15]}>
            <boxGeometry args={[1.4, 3.0, 0.65]} />
            <meshStandardMaterial color="#1a0f08" roughness={0.95} metalness={0} />
          </mesh>
          <mesh position={[0, 1.1, 0.15]}>
            <cylinderGeometry args={[0.7, 0.7, 0.65, 12, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#1a0f08" roughness={0.95} metalness={0} />
          </mesh>
        </group>
      ))}
      {/* Flanking wings */}
      {[-9, 9].map((x, i) => (
        <group key={i} position={[x, 2.2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[5, 4.4, 11]} />
            <meshStandardMaterial {...stoneDark} />
          </mesh>
          {/* Window openings */}
          {[-2, 2].map((z, j) => (
            <mesh key={j} position={[2.5 * (i === 0 ? -1 : 1), 0.8, z]} castShadow>
              <boxGeometry args={[0.15, 1.8, 1.0]} />
              <meshStandardMaterial color="#1a0f06" roughness={0.95} metalness={0} />
            </mesh>
          ))}
          {/* Merlon row */}
          {Array.from({ length: 6 }, (_, j) => (
            <mesh key={j} position={[0, 2.6, -2.5 + j]} castShadow>
              <boxGeometry args={[5.1, 0.8, 0.55]} />
              <meshStandardMaterial {...stoneDark} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Perimeter wall */}
      {([[-14, 0, 0, 0], [14, 0, 0, 0], [0, 0, -7.5, Math.PI / 2], [0, 0, 7.5, Math.PI / 2]] as [number, number, number, number][]).map(([x, y, z, ry], i) => (
        <mesh key={i} position={[x, 1.5, z]} rotation={[0, ry, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 3.0, 28]} />
          <meshStandardMaterial {...stoneDark} />
        </mesh>
      ))}
      {/* Sanctuary point light */}
      <pointLight color="#D4AF37" intensity={3.5} distance={22} decay={2} position={[0, 10, 0]} />
      <pointLight color="#ffaa44" intensity={1.8} distance={14} decay={2} position={[0, 4, 5.5]} />
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 2 OLIVE TREES — twisted trunks, dense canopy, wind animation
══════════════════════════════════════════════════════════════════════════ */
const TREE_PHASES = TREE_POS.map((_, i) => ((i * 137.5) % 360) * (Math.PI / 180));
const TREE_SCALES = TREE_POS.map((_, i) => 0.82 + (i % 7) * 0.065);

function AAAOliveTrees() {
  /* Trunk geometry — 10-sided for a rounder, more natural silhouette */
  const trunkGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.10, 0.28, 3.2, 10, 4);
    /* Twist each vertex to simulate gnarled old-growth trunk */
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const y  = pos.getY(i);
      const tN = (y + 1.6) / 3.2;
      const tw = Math.sin(tN * Math.PI * 2.5) * 0.18;
      pos.setX(i, pos.getX(i) + tw);
      pos.setZ(i, pos.getZ(i) + Math.cos(tN * Math.PI * 1.8) * 0.12);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  /* Three canopy tiers — ellipsoid shapes for olive density */
  const canopyA = useMemo(() => new THREE.SphereGeometry(1.55, 11, 8), []);
  const canopyB = useMemo(() => new THREE.SphereGeometry(1.25, 10, 7), []);
  const canopyC = useMemo(() => new THREE.SphereGeometry(0.95, 9,  7), []);
  const canopyD = useMemo(() => new THREE.SphereGeometry(0.72, 8,  6), []);

  /* Wind refs — animate the three canopy instance groups */
  const grpA = useRef<THREE.Group>(null!);
  const grpB = useRef<THREE.Group>(null!);
  const grpC = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    /* Gentle sway — primary wind direction + small perpendicular gust */
    const swayX = Math.sin(t * 0.55) * 0.022 + Math.sin(t * 1.3) * 0.008;
    const swayZ = Math.cos(t * 0.48) * 0.016 + Math.cos(t * 1.1) * 0.006;
    if (grpA.current) { grpA.current.rotation.x = swayX; grpA.current.rotation.z = swayZ; }
    if (grpB.current) { grpB.current.rotation.x = swayX * 1.15; grpB.current.rotation.z = swayZ * 1.1; }
    if (grpC.current) { grpC.current.rotation.x = swayX * 1.3;  grpC.current.rotation.z = swayZ * 1.25; }
  });

  return (
    <>
      {/* Trunks — static, receive/cast shadows */}
      <Instances geometry={trunkGeo} limit={TREE_POS.length}>
        <meshStandardMaterial color="#3e2a12" roughness={0.96} metalness={0.01} />
        {TREE_POS.map(([x, z], i) => (
          <Instance key={i} position={[x, 1.6, z]} scale={TREE_SCALES[i]}
            rotation={[0, TREE_PHASES[i] * 0.3, 0]} />
        ))}
      </Instances>

      {/* Canopy tier A — dark base */}
      <group ref={grpA}>
        <Instances geometry={canopyA} limit={TREE_POS.length}>
          <meshStandardMaterial color="#304e1c" roughness={0.90} metalness={0.0} />
          {TREE_POS.map(([x, z], i) => (
            <Instance key={i} position={[x, 3.9 + (i % 3) * 0.22, z]}
              scale={[TREE_SCALES[i], TREE_SCALES[i] * 0.82, TREE_SCALES[i]]}
              rotation={[0, TREE_PHASES[i], 0]} />
          ))}
        </Instances>
      </group>

      {/* Canopy tier B — mid-green */}
      <group ref={grpB}>
        <Instances geometry={canopyB} limit={TREE_POS.length}>
          <meshStandardMaterial color="#476e2a" roughness={0.87} metalness={0.0} />
          {TREE_POS.map(([x, z], i) => (
            <Instance key={i}
              position={[x + Math.sin(TREE_PHASES[i]) * 0.55, 4.8 + (i % 4) * 0.18, z + Math.cos(TREE_PHASES[i]) * 0.55]}
              scale={TREE_SCALES[i]}
              rotation={[0, TREE_PHASES[i] + 0.8, 0]} />
          ))}
        </Instances>
      </group>

      {/* Canopy tier C — bright highlights */}
      <group ref={grpC}>
        <Instances geometry={canopyC} limit={TREE_POS.length}>
          <meshStandardMaterial color="#5d8836" roughness={0.84} metalness={0.0} />
          {TREE_POS.map(([x, z], i) => (
            <Instance key={i}
              position={[x + Math.cos(TREE_PHASES[i] * 1.3) * 0.7, 5.5 + (i % 3) * 0.2, z + Math.sin(TREE_PHASES[i] * 1.3) * 0.7]}
              scale={TREE_SCALES[i] * 0.9}
              rotation={[0, TREE_PHASES[i] + 1.6, 0]} />
          ))}
        </Instances>
        {/* Sparse silvery-green top leaves */}
        <Instances geometry={canopyD} limit={TREE_POS.length}>
          <meshStandardMaterial color="#7aaa52" roughness={0.82} metalness={0.0} />
          {TREE_POS.map(([x, z], i) => (
            <Instance key={i}
              position={[x + Math.sin(TREE_PHASES[i] * 0.7) * 0.4, 6.2 + (i % 4) * 0.15, z + Math.cos(TREE_PHASES[i] * 0.7) * 0.4]}
              scale={TREE_SCALES[i] * 0.75}
              rotation={[0, TREE_PHASES[i] + 2.4, 0]} />
          ))}
        </Instances>
      </group>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 2 MEDITERRANEAN VEGETATION — cypress, lavender, flowers, shrubs
══════════════════════════════════════════════════════════════════════════ */
const R_VEG = makeLCG(53);
const CYPRESS_POS = Array.from({ length: 22 }, () => {
  const a = R_VEG() * Math.PI * 2, r = 16 + R_VEG() * 18;
  return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
});
const LAVENDER_BEDS = [
  { cx: -9, cz: -8,  count: 28, radius: 3.2 },
  { cx:  9, cz: 12,  count: 28, radius: 3.0 },
  { cx: -14, cz: 10, count: 22, radius: 2.6 },
  { cx:  14, cz: -8, count: 22, radius: 2.6 },
  { cx:  0,  cz: -16, count: 18, radius: 2.2 },
];
const R_LAV = makeLCG(61);
const LAVENDER_PTS = LAVENDER_BEDS.flatMap(bed =>
  Array.from({ length: bed.count }, () => {
    const a = R_LAV() * Math.PI * 2, r = R_LAV() * bed.radius;
    return [bed.cx + Math.cos(a) * r, bed.cz + Math.sin(a) * r] as [number, number];
  })
);
const R_FLOW = makeLCG(79);
const FLOWER_PTS = Array.from({ length: 90 }, () => {
  const a = R_FLOW() * Math.PI * 2, r = 6 + R_FLOW() * 22;
  return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
});
const R_SHRUB = makeLCG(41);
const SHRUB_POS = Array.from({ length: 35 }, () => {
  const a = R_SHRUB() * Math.PI * 2, r = 12 + R_SHRUB() * 20;
  return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
});

function AAAMediterraneanVegetation() {
  /* ── Cypress tree: 4 stacked layered cones create the classic narrow-columnar silhouette */
  const cyp1Geo = useMemo(() => new THREE.ConeGeometry(0.95, 3.2, 11, 3), []);  // base tier
  const cyp2Geo = useMemo(() => new THREE.ConeGeometry(0.76, 2.9, 10, 3), []);  // mid-low
  const cyp3Geo = useMemo(() => new THREE.ConeGeometry(0.54, 2.5,  9, 3), []);  // mid-high
  const cyp4Geo = useMemo(() => new THREE.ConeGeometry(0.30, 2.1,  8, 2), []);  // tip
  const cypTrunkGeo = useMemo(() => new THREE.CylinderGeometry(0.10, 0.15, 1.8, 7), []);

  /* ── Olive/broad-leafed tree: 3 overlapping sphere clusters form a rounded canopy */
  const oliveCanopy1 = useMemo(() => new THREE.SphereGeometry(1.55, 9, 7), []);  // main crown
  const oliveCanopy2 = useMemo(() => new THREE.SphereGeometry(1.10, 8, 6), []);  // side lobe
  const oliveTrunkGeo = useMemo(() => new THREE.CylinderGeometry(0.13, 0.18, 3.5, 7), []);

  /* ── Lavender geometry */
  const lavStemGeo = useMemo(() => new THREE.CylinderGeometry(0.022, 0.03, 0.6, 5), []);
  const lavHeadGeo = useMemo(() => new THREE.SphereGeometry(0.14, 6, 5), []);

  /* ── Flower geometry */
  const flowerGeo = useMemo(() => new THREE.SphereGeometry(0.18, 7, 5), []);

  /* ── Shrub: two overlapping spheres for irregular lumpy silhouette */
  const shrubMainGeo = useMemo(() => new THREE.SphereGeometry(0.88, 9, 7), []);
  const shrubLobeGeo = useMemo(() => new THREE.SphereGeometry(0.62, 8, 6), []);

  /* Wind sway refs */
  const swayRootRef  = useRef<THREE.Group>(null!);
  const swayRootRef2 = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t  = clock.getElapsedTime();
    const sw = Math.sin(t * 0.38) * 0.013 + Math.sin(t * 1.07) * 0.005 + Math.sin(t * 2.3) * 0.002;
    if (swayRootRef.current)  swayRootRef.current.rotation.z  = sw;
    if (swayRootRef2.current) swayRootRef2.current.rotation.x = sw * 0.65;
  });

  /* Cypress foliage — dark green, slightly varied */
  const cypDark   = "#1c3818";
  const cypMid    = "#254d1e";
  const cypLight  = "#2e5e24";
  const cypBright = "#38712c";

  return (
    <>
      {/* ── CYPRESS TREES (4-layer stacked for realistic columnar silhouette) ── */}
      <group ref={swayRootRef}>
        {/* Layer 1: base — widest, darkest */}
        <Instances geometry={cyp1Geo} limit={CYPRESS_POS.length}>
          <meshStandardMaterial color={cypDark} roughness={0.88} metalness={0.0}
            envMapIntensity={0.3} />
          {CYPRESS_POS.map(([x, z], i) => (
            <Instance key={i}
              position={[x, 1.6 + (i % 3) * 0.15, z]}
              scale={[0.72 + (i % 5) * 0.07, 0.88 + (i % 4) * 0.06, 0.72 + (i % 3) * 0.07]}
              rotation={[0, (i * 53) * Math.PI / 180, 0]} />
          ))}
        </Instances>
        {/* Layer 2: mid-low */}
        <Instances geometry={cyp2Geo} limit={CYPRESS_POS.length}>
          <meshStandardMaterial color={cypMid} roughness={0.86} metalness={0.0}
            envMapIntensity={0.3} />
          {CYPRESS_POS.map(([x, z], i) => (
            <Instance key={i}
              position={[x, 3.8 + (i % 3) * 0.12, z]}
              scale={[0.68 + (i % 4) * 0.08, 0.92 + (i % 5) * 0.05, 0.68 + (i % 3) * 0.07]}
              rotation={[0, (i * 53 + 15) * Math.PI / 180, 0]} />
          ))}
        </Instances>
        {/* Layer 3: mid-high — brighter as light hits top */}
        <Instances geometry={cyp3Geo} limit={CYPRESS_POS.length}>
          <meshStandardMaterial color={cypLight} roughness={0.84} metalness={0.0}
            envMapIntensity={0.35} />
          {CYPRESS_POS.map(([x, z], i) => (
            <Instance key={i}
              position={[x, 5.8 + (i % 3) * 0.12, z]}
              scale={[0.62 + (i % 5) * 0.06, 0.95 + (i % 4) * 0.04, 0.62 + (i % 3) * 0.07]}
              rotation={[0, (i * 53 + 30) * Math.PI / 180, 0]} />
          ))}
        </Instances>
        {/* Layer 4: tip — narrowest, slightly brighter */}
        <Instances geometry={cyp4Geo} limit={CYPRESS_POS.length}>
          <meshStandardMaterial color={cypBright} roughness={0.82} metalness={0.0}
            envMapIntensity={0.4} />
          {CYPRESS_POS.map(([x, z], i) => (
            <Instance key={i}
              position={[x, 7.55 + (i % 3) * 0.15, z]}
              scale={[0.55 + (i % 5) * 0.05, 0.95 + (i % 4) * 0.05, 0.55 + (i % 3) * 0.06]}
              rotation={[0, (i * 53 + 45) * Math.PI / 180, 0]} />
          ))}
        </Instances>
        {/* Trunks */}
        <Instances geometry={cypTrunkGeo} limit={CYPRESS_POS.length}>
          <meshStandardMaterial color="#3d2c1a" roughness={0.94} metalness={0.0} />
          {CYPRESS_POS.map(([x, z], i) => (
            <Instance key={i} position={[x, 0.9, z]}
              scale={[1, 1 + (i % 3) * 0.08, 1]} />
          ))}
        </Instances>
      </group>

      {/* ── OLIVE / BROAD-LEAFED TREES — rounded silver-green canopy ── */}
      <group ref={swayRootRef2}>
        {/* Main crown */}
        <Instances geometry={oliveCanopy1} limit={SHRUB_POS.length}>
          <meshStandardMaterial color="#4e7234" roughness={0.84} metalness={0.0}
            envMapIntensity={0.4} />
          {SHRUB_POS.map(([x, z], i) => (
            <Instance key={i}
              position={[x, 2.8 + (i % 4) * 0.28, z]}
              scale={[0.9 + (i % 5) * 0.16, 0.8 + (i % 3) * 0.12, 0.9 + (i % 4) * 0.13]}
              rotation={[0, (i * 67) * Math.PI / 180, 0]} />
          ))}
        </Instances>
        {/* Side lobe (offset canopy cluster for irregular silhouette) */}
        <Instances geometry={oliveCanopy2} limit={SHRUB_POS.length}>
          <meshStandardMaterial color="#3d6228" roughness={0.86} metalness={0.0}
            envMapIntensity={0.35} />
          {SHRUB_POS.map(([x, z], i) => {
            const off = ((i % 6) - 2.5) * 0.55;
            return (
              <Instance key={i}
                position={[x + off * 0.7, 2.4 + (i % 3) * 0.22, z + off * 0.3]}
                scale={[0.85 + (i % 4) * 0.14, 0.72 + (i % 5) * 0.10, 0.85 + (i % 3) * 0.12]}
                rotation={[0, (i * 67 + 30) * Math.PI / 180, 0]} />
            );
          })}
        </Instances>
        {/* Trunks */}
        <Instances geometry={oliveTrunkGeo} limit={SHRUB_POS.length}>
          <meshStandardMaterial color="#4a3520" roughness={0.96} metalness={0.0} />
          {SHRUB_POS.map(([x, z], i) => (
            <Instance key={i} position={[x, 1.75, z]}
              scale={[1 + (i % 3) * 0.08, 1, 1 + (i % 4) * 0.06]}
              rotation={[0, (i * 67) * Math.PI / 180, 0]} />
          ))}
        </Instances>
      </group>

      {/* ── LAVENDER STEMS ── */}
      <Instances geometry={lavStemGeo} limit={LAVENDER_PTS.length}>
        <meshStandardMaterial color="#6b8040" roughness={0.9} metalness={0.0} />
        {LAVENDER_PTS.map(([x, z], i) => (
          <Instance key={i} position={[x + (i % 3 - 1) * 0.12, 0.3, z + (i % 2 - 0.5) * 0.1]} />
        ))}
      </Instances>
      {/* Lavender heads */}
      <Instances geometry={lavHeadGeo} limit={LAVENDER_PTS.length}>
        <meshStandardMaterial color="#8868b0" roughness={0.82} metalness={0.0}
          emissive={new THREE.Color("#3a2560")} emissiveIntensity={0.22} />
        {LAVENDER_PTS.map(([x, z], i) => (
          <Instance key={i} position={[x + (i % 3 - 1) * 0.12, 0.65, z + (i % 2 - 0.5) * 0.1]}
            scale={[1, 1.6, 1]} />
        ))}
      </Instances>

      {/* ── FLOWERS ── */}
      <Instances geometry={flowerGeo} limit={FLOWER_PTS.length}>
        <meshStandardMaterial color="#f0ede8" roughness={0.72} metalness={0.0}
          emissive={new THREE.Color("#ecdfc0")} emissiveIntensity={0.16} />
        {FLOWER_PTS.map(([x, z], i) => (
          <Instance key={i} position={[x, 0.22 + (i % 3) * 0.04, z]}
            scale={0.62 + (i % 5) * 0.08}
            rotation={[0, (i * 83) * Math.PI / 180, 0]} />
        ))}
      </Instances>

      {/* ── LOW GROUND SHRUBS (smaller scale, using flower bed positions) ── */}
      <Instances geometry={shrubMainGeo} limit={FLOWER_PTS.length}>
        <meshStandardMaterial color="#4a6830" roughness={0.88} metalness={0.0}
          envMapIntensity={0.3} />
        {FLOWER_PTS.map(([x, z], i) => (
          <Instance key={i} position={[x, 0.5, z]}
            scale={[0.8 + (i % 4) * 0.13, 0.55 + (i % 3) * 0.07, 0.8 + (i % 5) * 0.10]}
            rotation={[0, (i * 61) * Math.PI / 180, 0]} />
        ))}
      </Instances>
      <Instances geometry={shrubLobeGeo} limit={FLOWER_PTS.length}>
        <meshStandardMaterial color="#3d5828" roughness={0.90} metalness={0.0} />
        {FLOWER_PTS.map(([x, z], i) => {
          const lx = ((i % 3) - 1) * 0.42;
          return (
            <Instance key={i} position={[x + lx, 0.45, z + lx * 0.3]}
              scale={[0.72 + (i % 5) * 0.10, 0.48 + (i % 4) * 0.06, 0.72 + (i % 3) * 0.09]}
              rotation={[0, (i * 61 + 22) * Math.PI / 180, 0]} />
          );
        })}
      </Instances>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 2 POLLEN PARTICLES — floating Mediterranean pollen + dust motes
══════════════════════════════════════════════════════════════════════════ */
function AAAPollenParticles() {
  const { particleScale } = useQuality();
  const N       = Math.max(20, Math.ceil(220 * particleScale));
  const ref     = useRef<THREE.InstancedMesh>(null!);
  const dum     = useMemo(() => new THREE.Object3D(), []);
  const pts     = useMemo(() => {
    const rp = makeLCG(33);
    return Array.from({ length: 220 }, () => ({
      x:   (rp() - 0.5) * 52,
      y:   rp() * 10 + 0.4,
      z:   (rp() - 0.5) * 52,
      sp:  0.08 + rp() * 0.18,
      ph:  rp() * Math.PI * 2,
      dr:  (rp() - 0.5) * 0.6,   // horizontal drift speed
      sc:  0.018 + rp() * 0.025, // size
    }));
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    pts.slice(0, N).forEach((p, i) => {
      /* Lazy upward drift with gentle horizontal swirl */
      const yPos = ((p.y + t * p.sp) % 12) + 0.3;
      const xPos = p.x + Math.sin(t * 0.22 + p.ph) * 2.2 + p.dr * delta * 18;
      const zPos = p.z + Math.cos(t * 0.18 + p.ph * 1.3) * 1.8;
      dum.position.set(xPos, yPos, zPos);
      const sc = p.sc * (0.85 + Math.sin(t * p.sp * 3 + p.ph) * 0.15);
      dum.scale.setScalar(sc);
      dum.updateMatrix();
      ref.current.setMatrixAt(i, dum.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <sphereGeometry args={[1, 4, 3]} />
      <meshStandardMaterial
        color="#f0e060"
        emissive={new THREE.Color("#b89800")}
        emissiveIntensity={1.4}
        transparent opacity={0.52}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STONE PATHWAYS — detailed limestone paths
   SPR-030: Circular stones, edging, terrace edges converted to InstancedMesh.
   Reduction: ~208 individual draw calls → 3 draw calls.
══════════════════════════════════════════════════════════════════════════ */
function AAAStonePathways() {
  /* Geometries */
  const circGeo  = useMemo(() => new THREE.BoxGeometry(0.85, 0.1,  0.52), []);
  const edgeGeo  = useMemo(() => new THREE.BoxGeometry(0.40, 0.22, 0.40), []);
  const stepGeo  = useMemo(() => new THREE.BoxGeometry(0.70, 0.25, 0.42), []);

  /* Pre-compute instance matrices */
  const { circMats, edgeMats, stepMats } = useMemo(() => {
    const dum = new THREE.Object3D();
    const N_CIRC = 56, N_EDGE = 32, N_STEP_RING = 40;

    /* Circular pool path (56) */
    const circMats: THREE.Matrix4[] = [];
    for (let i = 0; i < N_CIRC; i++) {
      const a = (i / N_CIRC) * Math.PI * 2;
      dum.position.set(Math.cos(a) * 7.5, 0.09, Math.sin(a) * 10.5 + 4);
      dum.rotation.set(0, a, 0);
      dum.updateMatrix();
      circMats.push(dum.matrix.clone());
    }

    /* Stone edging (32) */
    const edgeMats: THREE.Matrix4[] = [];
    for (let i = 0; i < N_EDGE; i++) {
      const a = (i / N_EDGE) * Math.PI * 2;
      dum.position.set(Math.cos(a) * 8.5, 0.12, Math.sin(a) * 11.5 + 4);
      dum.rotation.set(0, 0, 0);
      dum.updateMatrix();
      edgeMats.push(dum.matrix.clone());
    }

    /* Terrace step edges (3 rings × 40 = 120) */
    const RINGS = [8.5, 14.5, 20.5];
    const stepMats: THREE.Matrix4[] = [];
    RINGS.forEach((r, ri) => {
      for (let j = 0; j < N_STEP_RING; j++) {
        const a = (j / N_STEP_RING) * Math.PI * 2;
        dum.position.set(Math.cos(a) * r, 0.14 + ri * 0.55, Math.sin(a) * r + 4);
        dum.rotation.set(0, a, 0);
        dum.updateMatrix();
        stepMats.push(dum.matrix.clone());
      }
    });

    return { circMats, edgeMats, stepMats };
  }, []);

  /* Apply matrices via refs */
  const circRef = useRef<THREE.InstancedMesh>(null!);
  const edgeRef = useRef<THREE.InstancedMesh>(null!);
  const stepRef = useRef<THREE.InstancedMesh>(null!);

  useEffect(() => {
    circMats.forEach((m, i) => circRef.current?.setMatrixAt(i, m));
    if (circRef.current) circRef.current.instanceMatrix.needsUpdate = true;
  }, [circMats]);
  useEffect(() => {
    edgeMats.forEach((m, i) => edgeRef.current?.setMatrixAt(i, m));
    if (edgeRef.current) edgeRef.current.instanceMatrix.needsUpdate = true;
  }, [edgeMats]);
  useEffect(() => {
    stepMats.forEach((m, i) => stepRef.current?.setMatrixAt(i, m));
    if (stepRef.current) stepRef.current.instanceMatrix.needsUpdate = true;
  }, [stepMats]);

  return (
    <>
      {/* Main cross paths — 2 draw calls, large slabs */}
      <mesh position={[0, 0.08, 4]} receiveShadow>
        <boxGeometry args={[3.2, 0.1, 34]} />
        <meshStandardMaterial color="#cfc5a8" roughness={0.84} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.08, 4]} receiveShadow>
        <boxGeometry args={[34, 0.1, 3.2]} />
        <meshStandardMaterial color="#cfc5a8" roughness={0.84} metalness={0.04} />
      </mesh>
      {/* Diagonal paths */}
      {[45, -45].map((deg, i) => (
        <mesh key={i} position={[0, 0.07, 4]} rotation={[0, (deg * Math.PI) / 180, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.09, 28]} />
          <meshStandardMaterial color="#b8ad98" roughness={0.88} metalness={0.04} />
        </mesh>
      ))}

      {/* Circular pool path — 56 stones as 1 draw call */}
      <instancedMesh ref={circRef} args={[circGeo, undefined, circMats.length]} receiveShadow>
        <meshStandardMaterial color="#cac0a8" roughness={0.84} metalness={0.04} />
      </instancedMesh>

      {/* Stone edging — 32 blocks as 1 draw call */}
      <instancedMesh ref={edgeRef} args={[edgeGeo, undefined, edgeMats.length]} receiveShadow>
        <meshStandardMaterial color="#b0a898" roughness={0.85} metalness={0.04} />
      </instancedMesh>

      {/* Terrace step edges — 120 stones as 1 draw call */}
      <instancedMesh ref={stepRef} args={[stepGeo, undefined, stepMats.length]} receiveShadow>
        <meshStandardMaterial color="#c8bda8" roughness={0.82} metalness={0.05} />
      </instancedMesh>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CANDLE FIELD — instanced + bloom-reactive emissive
══════════════════════════════════════════════════════════════════════════ */
function AAABackgroundCandles() {
  const waxGeo    = useMemo(() => new THREE.CylinderGeometry(0.06, 0.082, 0.35, 8), []);
  const flameGeo  = useMemo(() => new THREE.ConeGeometry(0.07, 0.24, 7, 1, true), []);
  const flameMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const flameGrpRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (flameGrpRef.current) {
      flameGrpRef.current.rotation.x = Math.sin(t * 2.1) * 0.028;
      flameGrpRef.current.rotation.z = Math.cos(t * 1.7) * 0.028;
    }
    if (flameMatRef.current) {
      flameMatRef.current.emissiveIntensity = 1.4 + Math.sin(t * 4.2) * 0.55;
    }
  });

  return (
    <>
      <Instances geometry={waxGeo} limit={BG_CANDLES.length}>
        <meshStandardMaterial color="#f0e8d8" roughness={0.6} metalness={0.0} />
        {BG_CANDLES.map(([x, , z], i) => <Instance key={i} position={[x, 0.175, z]} />)}
      </Instances>
      <group ref={flameGrpRef}>
        <Instances geometry={flameGeo} limit={BG_CANDLES.length}>
          <meshStandardMaterial
            ref={flameMatRef}
            color="#ff9922"
            emissive={new THREE.Color("#ff5500")}
            emissiveIntensity={1.4}
            transparent opacity={0.9}
            roughness={0.3}
          />
          {BG_CANDLES.map(([x, , z], i) => <Instance key={i} position={[x, 0.47, z]} />)}
        </Instances>
      </group>
      {/* Clustered warm point lights */}
      {[[-7,0,-3],[7,0,3],[-12,0,8],[12,0,-8],[0,0,14],[0,0,-14],[-16,0,0],[16,0,0]].map(([x, y, z], i) => (
        <pointLight key={i} position={[x!, y! + 1.4, z!]} color="#ff9933" intensity={2.2} distance={9} decay={2} />
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ETERNAL FLAME ALTAR — central animated flame
══════════════════════════════════════════════════════════════════════════ */
function AAAEternalAltar() {
  const flameUniforms = useRef({ uTime: { value: 0 }, uOffset: { value: 0 } });
  const lightRef = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    flameUniforms.current.uTime.value = clock.getElapsedTime();
    if (lightRef.current) lightRef.current.intensity = 4.5 + Math.sin(clock.getElapsedTime() * 4.8) * 1.5;
  });

  return (
    <group position={[0, 0, 4]}>
      {/* Island */}
      <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 20]} />
        <meshStandardMaterial color="#ccc4a8" roughness={0.72} metalness={0.1} />
      </mesh>
      {/* Altar column */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.68, 1.6, 14]} />
        <meshStandardMaterial color="#c8b880" roughness={0.65} metalness={0.15} />
      </mesh>
      <mesh position={[0, 1.88, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.52, 0.38, 14]} />
        <meshStandardMaterial color="#d4c888" roughness={0.6} metalness={0.18} />
      </mesh>
      {/* Candle */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 1.1, 12]} />
        <meshStandardMaterial color="#fef6ee" roughness={0.55} metalness={0.0} />
      </mesh>
      {/* Shader flame */}
      <mesh position={[0, 3.1, 0]}>
        <coneGeometry args={[0.22, 0.62, 10, 1, true]} />
        <shaderMaterial
          uniforms={flameUniforms.current}
          vertexShader={FLAME_VERT}
          fragmentShader={FLAME_FRAG}
          transparent depthWrite={false} side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight ref={lightRef} position={[0, 3.2, 0]} color="#ff8822" intensity={5.0} distance={18} decay={2} />
      <Text position={[0, 0.4, 1.95]} fontSize={0.22} color="#D4AF37" anchorX="center">
        נֵר תָּמִיד
      </Text>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ENTRY CANDLE — interactive per-memorial candle
══════════════════════════════════════════════════════════════════════════ */
function AAAEntryCandle({ pos, entry, animOffset, onCandleClick, highlighted, index }: {
  pos: [number, number, number]; entry: CommunityYahrzeitEntry;
  animOffset: number; onCandleClick: (e: CommunityYahrzeitEntry) => void;
  highlighted: boolean; index: number;
}) {
  const { lightPoolSize } = useQuality();
  const showLight = highlighted || index < lightPoolSize;

  const flameUniforms = useRef({ uTime: { value: 0 }, uOffset: { value: animOffset } });
  const lightRef  = useRef<THREE.PointLight>(null!);
  const grpRef    = useRef<THREE.Group>(null!);
  const ring1Ref  = useRef<THREE.Mesh>(null!);
  const ring2Ref  = useRef<THREE.Mesh>(null!);
  const ring1Mat  = useRef<THREE.MeshStandardMaterial>(null!);
  const ring2Mat  = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    flameUniforms.current.uTime.value = t;
    if (lightRef.current) {
      lightRef.current.intensity = (highlighted ? 3.2 : 1.4) + Math.sin(t * 5.5 + animOffset) * 0.6
        + Math.sin(t * 12.3 + animOffset * 0.7) * 0.2;
    }
    if (grpRef.current && highlighted) {
      grpRef.current.position.y = pos[1] + Math.sin(t * 2.0) * 0.06;
    }
    if (highlighted && ring1Ref.current && ring2Ref.current) {
      const p1 = (t * 0.9 + animOffset) % 1;
      const p2 = (t * 0.9 + animOffset + 0.5) % 1;
      const s1 = 0.8 + p1 * 0.9, s2 = 0.8 + p2 * 0.9;
      ring1Ref.current.scale.setScalar(s1);
      ring2Ref.current.scale.setScalar(s2);
      if (ring1Mat.current) ring1Mat.current.opacity = (1 - p1) * 0.75;
      if (ring2Mat.current) ring2Mat.current.opacity = (1 - p2) * 0.75;
    }
  });

  const shortName = entry.deceasedName.split("·")[0].trim();

  return (
    <group ref={grpRef} position={pos} onClick={e => { e.stopPropagation(); onCandleClick(entry); }}>
      {/* Invisible click target */}
      <mesh>
        <cylinderGeometry args={[0.7, 0.7, 1.8, 8]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      {/* Pulsing golden rings when highlighted */}
      {highlighted && (
        <>
          <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.36, 0.52, 28]} />
            <meshStandardMaterial ref={ring1Mat} color="#D4AF37"
              emissive={new THREE.Color("#D4AF37")} emissiveIntensity={2.8}
              transparent opacity={0.8} depthWrite={false} />
          </mesh>
          <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.36, 0.52, 28]} />
            <meshStandardMaterial ref={ring2Mat} color="#ffcc44"
              emissive={new THREE.Color("#ffcc44")} emissiveIntensity={2.2}
              transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* Wax body */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.56, 10]} />
        <meshStandardMaterial color="#f5edd0" roughness={0.52} metalness={0.02} />
      </mesh>

      {/* Shader flame */}
      <mesh position={[0, 0.68, 0]}>
        <coneGeometry args={[0.1, 0.28, 10, 1, true]} />
        <shaderMaterial
          uniforms={flameUniforms.current}
          vertexShader={FLAME_VERT}
          fragmentShader={FLAME_FRAG}
          transparent depthWrite={false} side={THREE.DoubleSide}
        />
      </mesh>

      {showLight && (
        <pointLight ref={lightRef} color="#ff9933" intensity={1.4} distance={5} decay={2} />
      )}

      <Text position={[0, 1.08, 0]} fontSize={0.13} color="#ffd988" anchorX="center" maxWidth={2.2}>
        {shortName.length > 16 ? shortName.slice(0, 15) + "…" : shortName}
      </Text>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: NEW CANDLE PLACEMENT ANIMATION — golden pulse rings
══════════════════════════════════════════════════════════════════════════ */
function AAANewCandleAnim({ pos }: { pos: [number, number, number] }) {
  const r1 = useRef<THREE.Mesh>(null!), r2 = useRef<THREE.Mesh>(null!), r3 = useRef<THREE.Mesh>(null!);
  const m1 = useRef<THREE.MeshStandardMaterial>(null!), m2 = useRef<THREE.MeshStandardMaterial>(null!), m3 = useRef<THREE.MeshStandardMaterial>(null!);
  const startTime = useRef<number | null>(null);
  const ringGeo   = useMemo(() => new THREE.RingGeometry(0.38, 0.56, 32), []);

  useFrame(({ clock }) => {
    if (startTime.current === null) startTime.current = clock.getElapsedTime();
    const age  = clock.getElapsedTime() - startTime.current;
    const DUR  = 3.2;
    if (age > DUR) return;

    ([
      { ref: r1, mat: m1, phase: 0.00 },
      { ref: r2, mat: m2, phase: 0.30 },
      { ref: r3, mat: m3, phase: 0.60 },
    ] as const).forEach(({ ref: rr, mat: mm, phase }) => {
      const p  = Math.min(1, Math.max(0, (age / DUR - phase) / (1 - phase)));
      const ss = 0.5 + p * 3.8;
      const al = Math.max(0, (1 - p) * 0.85);
      if (rr.current) rr.current.scale.setScalar(ss);
      if (mm.current) mm.current.opacity = al;
    });
  });

  return (
    <group position={[pos[0], pos[1] + 0.05, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={r1} geometry={ringGeo}>
        <meshStandardMaterial ref={m1} color="#D4AF37" emissive={new THREE.Color("#D4AF37")} emissiveIntensity={3.0} transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh ref={r2} geometry={ringGeo}>
        <meshStandardMaterial ref={m2} color="#ffcc44" emissive={new THREE.Color("#ffcc44")} emissiveIntensity={2.2} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={r3} geometry={ringGeo}>
        <meshStandardMaterial ref={m3} color="#ff9922" emissive={new THREE.Color("#ff9922")} emissiveIntensity={1.6} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: VIRTUAL FLOWERS — placed by visitors in the sanctuary
══════════════════════════════════════════════════════════════════════════ */
const FLOWER_PALETTE = ["#ff6b8a","#ff99bb","#c778e8","#ff8833","#55ccaa","#f0c030","#e855a0","#7799ff"];

/* Maximum flowers before stopping — protects FPS */
const MAX_VIRTUAL_FLOWERS = 40;

export function AAAVirtualFlowers({ flowers }: { flowers: { pos: [number, number, number]; colorIdx: number }[] }) {
  const capped   = flowers.slice(-MAX_VIRTUAL_FLOWERS);
  const petalGeo = useMemo(() => new THREE.SphereGeometry(0.11, 6, 5), []);
  const centerGeo = useMemo(() => new THREE.SphereGeometry(0.058, 6, 4), []);
  const stemGeo   = useMemo(() => new THREE.CylinderGeometry(0.017, 0.024, 0.32, 5), []);

  if (!capped.length) return null;

  return (
    <>
      {capped.map((f, i) => {
        const col = FLOWER_PALETTE[f.colorIdx % FLOWER_PALETTE.length];
        return (
          <group key={i} position={f.pos}>
            {/* Stem */}
            <mesh position={[0, 0.16, 0]} geometry={stemGeo}>
              <meshStandardMaterial color="#3a6a20" roughness={0.88} />
            </mesh>
            {/* 6 petals — emissive-only, no per-flower point light */}
            {Array.from({ length: 6 }, (_, j) => {
              const a = (j / 6) * Math.PI * 2;
              return (
                <mesh key={j} position={[Math.cos(a) * 0.13, 0.35, Math.sin(a) * 0.13]} geometry={petalGeo}>
                  <meshStandardMaterial
                    color={col}
                    emissive={new THREE.Color(col)}
                    emissiveIntensity={0.55}
                    roughness={0.58}
                  />
                </mesh>
              );
            })}
            {/* Center — bright emissive instead of point light */}
            <mesh position={[0, 0.37, 0]} geometry={centerGeo}>
              <meshStandardMaterial color="#ffe050" emissive={new THREE.Color("#ddaa00")} emissiveIntensity={1.6} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PLACED CANDLE
══════════════════════════════════════════════════════════════════════════ */
function AAAPlacedCandle({ pos, name, animOffset }: { pos: [number, number, number]; name: string; animOffset: number }) {
  const u = useRef({ uTime: { value: 0 }, uOffset: { value: animOffset } });
  useFrame(({ clock }) => { u.current.uTime.value = clock.getElapsedTime(); });
  return (
    <group position={pos}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.44, 8]} />
        <meshStandardMaterial color="#fdf8f0" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <coneGeometry args={[0.09, 0.24, 8, 1, true]} />
        <shaderMaterial uniforms={u.current} vertexShader={FLAME_VERT} fragmentShader={FLAME_FRAG} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#ff9933" intensity={0.9} distance={3.5} decay={2} />
      <Text position={[0, 0.94, 0]} fontSize={0.11} color="#ffd988" anchorX="center">
        {name.length > 14 ? name.slice(0, 13) + "…" : name}
      </Text>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FLOATING LANTERNS
══════════════════════════════════════════════════════════════════════════ */
function AAAFloatingLanterns() {
  const { particleScale, lightPoolSize } = useQuality();
  const activeLanterns = useMemo(() => LANTERNS.slice(0, Math.max(4, Math.ceil(LANTERNS.length * particleScale))), [particleScale]);
  const grpRefs = useRef<THREE.Group[]>([]);
  const matRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const posRef  = useRef(activeLanterns.map(d => ({ x: d.x, y: d.startY, z: d.z })));

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    activeLanterns.forEach((d, i) => {
      posRef.current[i].y += d.speed * delta;
      posRef.current[i].x += Math.sin(t * 0.4 + d.phase) * d.drift * delta;
      if (posRef.current[i].y > 28) { posRef.current[i].y = 0.5; posRef.current[i].x = d.x; }
      const grp = grpRefs.current[i];
      if (grp) { grp.position.set(posRef.current[i].x, posRef.current[i].y, posRef.current[i].z); grp.rotation.y = t * 0.22 + d.phase; }
      const mat = matRefs.current[i];
      if (mat) {
        const alt = posRef.current[i].y / 28;
        mat.opacity = Math.max(0.08, 0.88 - alt * 0.78);
        mat.emissiveIntensity = 1.2 + Math.sin(t * 2.5 + d.phase) * 0.45;
      }
    });
  });

  return (
    <>
      {activeLanterns.map((d, i) => (
        <group key={i} ref={el => { if (el) grpRefs.current[i] = el; }} position={[d.x, d.startY, d.z]}>
          <mesh>
            <boxGeometry args={[0.36, 0.48, 0.36]} />
            <meshStandardMaterial
              ref={el => { if (el) matRefs.current[i] = el as THREE.MeshStandardMaterial; }}
              color="#ffcc66" emissive={new THREE.Color("#ff7700")}
              emissiveIntensity={1.2} transparent opacity={0.78}
              roughness={0.3} metalness={0.1}
            />
          </mesh>
          {[0.26, -0.26].map((y, j) => (
            <mesh key={j} position={[0, y, 0]}>
              <cylinderGeometry args={[0.25, 0.25, 0.07, 10]} />
              <meshStandardMaterial color="#cc8822" roughness={0.6} metalness={0.3} />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshStandardMaterial color="#ffee88" emissive={new THREE.Color("#ffcc00")} emissiveIntensity={3.5} />
          </mesh>
          {i < lightPoolSize && (
            <pointLight color="#ffaa33" intensity={1.2} distance={5.5} decay={2} />
          )}
        </group>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GOLDEN DUST PARTICLES
══════════════════════════════════════════════════════════════════════════ */
function AAAGoldenDust() {
  const { particleScale } = useQuality();
  const n    = Math.max(20, Math.ceil(150 * particleScale));
  const ref  = useRef<THREE.InstancedMesh>(null!);
  const dum  = useMemo(() => new THREE.Object3D(), []);
  const pts  = useMemo(() => {
    const r = makeLCG(77);
    return Array.from({ length: n }, () => ({ x: (r()-0.5)*55, y: r()*14+0.5, z: (r()-0.5)*55, sp: 0.15+r()*0.32, ph: r()*Math.PI*2 }));
  }, [n]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    pts.forEach((p, i) => {
      dum.position.set(p.x+Math.sin(t*0.28+p.ph)*0.7, p.y+Math.sin(t*p.sp+p.ph)*0.75, p.z+Math.cos(t*0.22+p.ph)*0.7);
      dum.scale.setScalar(0.032+Math.sin(t*p.sp+p.ph)*0.016);
      dum.updateMatrix();
      ref.current.setMatrixAt(i, dum.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial color="#D4AF37" emissive={new THREE.Color("#aa8800")} emissiveIntensity={2.5} transparent opacity={0.65} />
    </instancedMesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MOVING CLOUDS
══════════════════════════════════════════════════════════════════════════ */
function AAAMovingClouds() {
  /* Layer A — main cloud bank, mid-altitude */
  const refA0 = useRef<THREE.Group>(null!); const refA1 = useRef<THREE.Group>(null!);
  const refA2 = useRef<THREE.Group>(null!); const refA3 = useRef<THREE.Group>(null!);
  const refA4 = useRef<THREE.Group>(null!); const refA5 = useRef<THREE.Group>(null!);
  /* Layer B — high cirrus wisps */
  const refB0 = useRef<THREE.Group>(null!); const refB1 = useRef<THREE.Group>(null!);
  const refB2 = useRef<THREE.Group>(null!);
  /* Layer C — low atmospheric haze bands */
  const refC0 = useRef<THREE.Group>(null!); const refC1 = useRef<THREE.Group>(null!);

  const layerA = [
    { r: refA0, y: 22, z: -12, speed: 1.00, scale: 1.40, op: 0.74 },
    { r: refA1, y: 25, z:   8, speed: 0.70, scale: 1.10, op: 0.68 },
    { r: refA2, y: 19, z: -28, speed: 1.30, scale: 1.70, op: 0.78 },
    { r: refA3, y: 21, z:  18, speed: 0.85, scale: 0.90, op: 0.65 },
    { r: refA4, y: 24, z: -42, speed: 0.92, scale: 1.55, op: 0.72 },
    { r: refA5, y: 20, z:  34, speed: 1.10, scale: 1.25, op: 0.70 },
  ];
  const layerB = [
    { r: refB0, y: 36, z: -18, speed: 1.60, scale: 2.20, op: 0.32 },
    { r: refB1, y: 38, z:  12, speed: 1.20, scale: 2.80, op: 0.26 },
    { r: refB2, y: 34, z:  30, speed: 1.90, scale: 1.80, op: 0.30 },
  ];
  const layerC = [
    { r: refC0, y: 14, z: -35, speed: 0.40, scale: 3.50, op: 0.14 },
    { r: refC1, y: 13, z:  22, speed: 0.30, scale: 4.00, op: 0.12 },
  ];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    layerA.forEach(d => { if (d.r.current) d.r.current.position.x = -50 + ((t * d.speed * 0.75) % 110); });
    layerB.forEach(d => { if (d.r.current) d.r.current.position.x = -55 + ((t * d.speed * 0.60) % 120); });
    layerC.forEach(d => { if (d.r.current) d.r.current.position.x = -45 + ((t * d.speed * 0.50) % 100); });
  });

  /* Dense cumulus cloud — 7 spheres */
  const Cumulus = ({ scale, opacity }: { scale: number; opacity: number }) => {
    const m = <meshStandardMaterial color="#f8f8ff" transparent opacity={opacity} roughness={1} metalness={0} />;
    return (
      <group>
        <mesh scale={scale}><sphereGeometry args={[2.4, 10, 8]} />{m}</mesh>
        <mesh position={[2.2*scale, -0.5*scale, 0]} scale={scale}><sphereGeometry args={[1.8, 10, 8]} />{m}</mesh>
        <mesh position={[-2.2*scale, -0.4*scale, 0]} scale={scale}><sphereGeometry args={[1.5, 9, 7]} />{m}</mesh>
        <mesh position={[0.8*scale, 1.1*scale, 0]} scale={scale}><sphereGeometry args={[1.4, 9, 7]} />{m}</mesh>
        <mesh position={[-0.6*scale, 0.9*scale, 0.5*scale]} scale={scale*0.75}><sphereGeometry args={[1.2, 8, 6]} />{m}</mesh>
        <mesh position={[1.4*scale, 1.3*scale, 0.3*scale]} scale={scale*0.65}><sphereGeometry args={[1.1, 8, 6]} />{m}</mesh>
        <mesh position={[-1.6*scale, 0.5*scale, -0.4*scale]} scale={scale*0.60}><sphereGeometry args={[1.0, 7, 5]} />{m}</mesh>
      </group>
    );
  };

  /* Stretched cirrus wisp — thin elongated puffs */
  const Cirrus = ({ scale, opacity }: { scale: number; opacity: number }) => {
    const m = <meshStandardMaterial color="#eef2ff" transparent opacity={opacity} roughness={1} metalness={0} />;
    return (
      <group>
        <mesh scale={[scale * 3.5, scale * 0.45, scale]}><sphereGeometry args={[1.8, 9, 6]} />{m}</mesh>
        <mesh position={[4.0*scale, 0.1*scale, 0.5*scale]} scale={[scale*2.2, scale*0.35, scale*0.9]}><sphereGeometry args={[1.5, 8, 5]} />{m}</mesh>
        <mesh position={[-3.5*scale, -0.1*scale, -0.3*scale]} scale={[scale*1.8, scale*0.30, scale*0.85]}><sphereGeometry args={[1.4, 7, 5]} />{m}</mesh>
      </group>
    );
  };

  /* Haze band — very large, very faint */
  const HazeBand = ({ scale, opacity }: { scale: number; opacity: number }) => {
    const m = <meshStandardMaterial color="#ffe8d8" transparent opacity={opacity} roughness={1} metalness={0} />;
    return (
      <group>
        <mesh scale={[scale * 5.0, scale * 0.30, scale * 1.5]}><sphereGeometry args={[2.0, 8, 5]} />{m}</mesh>
        <mesh position={[7.0*scale, 0, 0.8*scale]} scale={[scale*4.0, scale*0.22, scale*1.2]}><sphereGeometry args={[1.8, 7, 5]} />{m}</mesh>
      </group>
    );
  };

  return (
    <>
      {layerA.map((d, i) => (
        <group key={`a${i}`} ref={d.r} position={[-50, d.y, d.z]}>
          <Cumulus scale={d.scale} opacity={d.op} />
        </group>
      ))}
      {layerB.map((d, i) => (
        <group key={`b${i}`} ref={d.r} position={[-55, d.y, d.z]}>
          <Cirrus scale={d.scale} opacity={d.op} />
        </group>
      ))}
      {layerC.map((d, i) => (
        <group key={`c${i}`} ref={d.r} position={[-45, d.y, d.z]}>
          <HazeBand scale={d.scale} opacity={d.op} />
        </group>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STONE BENCHES
══════════════════════════════════════════════════════════════════════════ */
function AAAStoneBenches() {
  return (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const a = (deg * Math.PI) / 180, r = 12.5;
        return (
          <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r + 4]} rotation={[0, -a, 0]}>
            <mesh position={[0, 0.42, 0]} castShadow>
              <boxGeometry args={[1.5, 0.14, 0.5]} />
              <meshStandardMaterial color="#d0c8b0" roughness={0.78} metalness={0.06} />
            </mesh>
            {[-0.55, 0.55].map((dx, j) => (
              <mesh key={j} position={[dx, 0.22, 0]} castShadow>
                <boxGeometry args={[0.15, 0.42, 0.44]} />
                <meshStandardMaterial color="#bcb4a0" roughness={0.8} metalness={0.06} />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CAMERA SETUP
══════════════════════════════════════════════════════════════════════════ */
function AAACamera() {
  const { camera } = useThree();
  useEffect(() => { camera.position.set(0, 1.7, 18); camera.lookAt(0, 1.7, 0); }, [camera]);
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   TERRAIN HEIGHT HELPER — analytical approximation (no raycasting needed)
   Matches AAATerrain geometry exactly (drops per-vertex LCG noise ±0.1)
══════════════════════════════════════════════════════════════════════════ */
function terrainHeightAt(x: number, z: number): number {
  const d = Math.sqrt(x * x + z * z);
  const terrace    = Math.floor(d / 8) * 0.55;
  const blend      = (d / 8) - Math.floor(d / 8);
  const smoothStep = blend * blend * (3 - 2 * blend);
  const rim        = Math.max(0, (d - 18) / 14);
  const noise      =
    Math.sin(x * 0.11) * 0.65 + Math.cos(z * 0.15) * 0.55
    + Math.sin(x * 0.33 + z * 0.25) * 0.28
    + Math.sin(x * 0.72 - z * 0.58) * 0.14
    + Math.sin(x * 1.4  + z * 0.9)  * 0.07;
  const cliffAngle = Math.atan2(z, x);
  const cliffBoost = Math.max(0, Math.sin(cliffAngle + 0.8)) * Math.max(0, (d - 32) / 10) * 2.5;
  const h          = terrace + smoothStep * 0.55 + rim * 6.0 + noise * 0.4 + cliffBoost;
  const riverDist  = Math.abs(x + 4) < 3.5 ? (3.5 - Math.abs(x + 4)) / 3.5 : 0;
  const deprDist   = Math.max(0, 1 - Math.sqrt((x - 18) ** 2 + (z - 14) ** 2) / 7) * 0.9;
  return h - riverDist * 1.3 - deprDist;
}

/* ══════════════════════════════════════════════════════════════════════════
   FOOTSTEP PARTICLES — dust motes that puff at the feet while walking
══════════════════════════════════════════════════════════════════════════ */
interface FootstepPt { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; }

function FootstepParticles({ particlesRef }: { particlesRef: React.MutableRefObject<FootstepPt[]> }) {
  const meshRef = useRef<THREE.Points>(null!);
  const MAX_P   = 80;
  const positions = useMemo(() => new Float32Array(MAX_P * 3), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  useFrame((_, delta) => {
    const pts = particlesRef.current;
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      p.life -= delta * 2.4;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.vy -= 2.2 * delta;
      if (p.life <= 0) pts.splice(i, 1);
    }
    const count = Math.min(pts.length, MAX_P);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pts[i].x; positions[i * 3 + 1] = pts[i].y; positions[i * 3 + 2] = pts[i].z;
    }
    for (let i = count; i < MAX_P; i++) positions[i * 3 + 1] = -999;
    if (meshRef.current) {
      (meshRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <points ref={meshRef} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.07} color="#c8b87a" transparent opacity={0.50} depthWrite={false} sizeAttenuation />
    </points>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FIRST-PERSON CONTROLLER
   • PointerLockControls for mouse look
   • WASD with smooth acceleration / deceleration
   • Eye-height = terrain_y + 1.7 via analytical terrainHeightAt()
   • Head bob (sin wave ±0.044 units) when moving
   • Footstep dust particles every ~0.28s while walking
   • Soft boundary clamp at world radius 44
   • Click-to-walk overlay when pointer is not locked
══════════════════════════════════════════════════════════════════════════ */
function FirstPersonController({
  fakeCtrlRef,
  particlesRef,
}: {
  fakeCtrlRef:   React.MutableRefObject<{ target: THREE.Vector3; update: () => void } | null>;
  particlesRef:  React.MutableRefObject<FootstepPt[]>;
}) {
  const { camera } = useThree();
  const plcRef = useRef<any>(null);

  const [locked, setLocked] = useState(false);
  const isLocked   = useRef(false);
  const keys       = useRef({ w: false, a: false, s: false, d: false });
  const vel        = useRef(new THREE.Vector3());
  const bobT       = useRef(0);
  const stepTimer  = useRef(0);
  const fwdVec     = useRef(new THREE.Vector3());
  const rightVec   = useRef(new THREE.Vector3());
  const UP         = new THREE.Vector3(0, 1, 0);

  /* Stable callbacks — prevent PointerLockControls from remounting */
  const handleLock = useCallback(() => {
    isLocked.current = true;
    setLocked(true);
  }, []);
  const handleUnlock = useCallback(() => {
    isLocked.current = false;
    setLocked(false);
    keys.current = { w: false, a: false, s: false, d: false };
    vel.current.set(0, 0, 0);
  }, []);

  /* Initialise the fake ctrl so CameraStateTracker + AAASceneCameraDriver work */
  useEffect(() => {
    fakeCtrlRef.current = { target: new THREE.Vector3(0, 1.7, 0), update: () => {} };
  }, [fakeCtrlRef]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!isLocked.current) return;
      if (e.code === "KeyW") keys.current.w = true;
      if (e.code === "KeyA") keys.current.a = true;
      if (e.code === "KeyS") keys.current.s = true;
      if (e.code === "KeyD") keys.current.d = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyW") keys.current.w = false;
      if (e.code === "KeyA") keys.current.a = false;
      if (e.code === "KeyS") keys.current.s = false;
      if (e.code === "KeyD") keys.current.d = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((_, delta) => {
    const dt      = Math.min(delta, 0.05);
    const cx      = camera.position.x;
    const cz      = camera.position.z;
    const groundY = terrainHeightAt(cx, cz);
    const EYE_H   = 1.7;
    const wantY   = groundY + EYE_H;

    /* Keep fake target updated so minimap / CameraStateTracker see a valid target */
    camera.getWorldDirection(fwdVec.current);
    fwdVec.current.y = 0;
    if (fwdVec.current.lengthSq() < 0.001) fwdVec.current.set(0, 0, -1);
    fwdVec.current.normalize();
    if (fakeCtrlRef.current) {
      fakeCtrlRef.current.target.set(cx + fwdVec.current.x * 8, wantY, cz + fwdVec.current.z * 8);
    }

    if (!isLocked.current) {
      /* Gentle ground-snap even when not locked so scene feels grounded */
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, wantY, 0.06);
      return;
    }

    /* ── WASD Movement ─────────────────────────────────────────────────── */
    rightVec.current.crossVectors(fwdVec.current, UP).normalize();
    const moveDir = new THREE.Vector3();
    if (keys.current.w) moveDir.addScaledVector(fwdVec.current,  1);
    if (keys.current.s) moveDir.addScaledVector(fwdVec.current, -1);
    if (keys.current.a) moveDir.addScaledVector(rightVec.current, -1);
    if (keys.current.d) moveDir.addScaledVector(rightVec.current,  1);
    const isMoving = moveDir.lengthSq() > 0.01;

    const SPEED = 5.5;
    const ACCEL = 14;
    const DECEL = 11;
    const ZERO  = new THREE.Vector3();

    if (isMoving) {
      moveDir.normalize();
      vel.current.lerp(moveDir.clone().multiplyScalar(SPEED), ACCEL * dt);
    } else {
      vel.current.lerp(ZERO, DECEL * dt);
    }

    /* Apply horizontal movement */
    const nx = cx + vel.current.x * dt;
    const nz = cz + vel.current.z * dt;

    /* World-boundary soft clamp */
    const WORLD_R = 43;
    const nd = Math.sqrt(nx * nx + nz * nz);
    camera.position.x = nd > WORLD_R ? nx * WORLD_R / nd : nx;
    camera.position.z = nd > WORLD_R ? nz * WORLD_R / nd : nz;

    /* ── Ground following + head bob ───────────────────────────────────── */
    const speed = vel.current.length();
    let bobOffset = 0;
    if (isMoving && speed > 0.5) {
      bobT.current += dt * 9.0;
      bobOffset = Math.sin(bobT.current) * 0.044;
    } else {
      bobT.current *= 0.80;
    }
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, wantY + bobOffset, 0.20);

    /* ── Footstep dust particles ────────────────────────────────────────── */
    if (isMoving && speed > 0.4) {
      stepTimer.current += dt;
      if (stepTimer.current > 0.28) {
        stepTimer.current = 0;
        for (let i = 0; i < 5; i++) {
          particlesRef.current.push({
            x:  camera.position.x + (Math.random() - 0.5) * 0.5,
            y:  groundY + 0.04,
            z:  camera.position.z + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 0.20 + Math.random() * 0.35,
            vz: (Math.random() - 0.5) * 0.5,
            life: 1.0,
          });
        }
      }
    }
  });

  return (
    <>
      <PointerLockControls ref={plcRef} onLock={handleLock} onUnlock={handleUnlock} />

      {/* Click-to-walk prompt — shown only when pointer is not locked */}
      <Html fullscreen zIndexRange={[8, 0]}>
        <div style={{
          position: "absolute", inset: 0,
          display: locked ? "none" : "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 88,
          pointerEvents: "none",
        }}>
          <button
            onClick={() => plcRef.current?.lock()}
            style={{
              pointerEvents: "all",
              background: "rgba(0,0,0,0.72)",
              border: "1.5px solid rgba(212,175,55,0.60)",
              borderRadius: 14,
              padding: "11px 26px",
              color: "#D4AF37",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              letterSpacing: "0.01em",
              boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
            }}
          >
            <span style={{ fontSize: 20 }}>🚶</span>
            <span>Click to Walk</span>
            <span style={{ opacity: 0.55, fontWeight: 400, fontSize: 12 }}>WASD · Mouse Look · Esc to Exit</span>
          </button>
        </div>
      </Html>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CAMERA IDLE DRIFT — SPR-030: subtle cinematic breathing when idle ≥3s
   Applies a gentle Y/X oscillation that fades in over 2 s of inactivity.
   Reverts cleanly the moment the user interacts again.
══════════════════════════════════════════════════════════════════════════ */
function CameraIdleDrift({ ctrlRef }: { ctrlRef: React.MutableRefObject<any> }) {
  const { camera } = useThree();
  const lastInteract = useRef(Date.now());
  const basePos      = useRef(new THREE.Vector3());
  const drifting     = useRef(false);

  useEffect(() => {
    const onInput = () => {
      lastInteract.current = Date.now();
      if (drifting.current) {
        /* Snap base back to current real position so there's no jump */
        basePos.current.copy(camera.position);
        drifting.current = false;
      }
    };
    window.addEventListener("pointerdown", onInput, { passive: true });
    window.addEventListener("wheel",       onInput, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onInput);
      window.removeEventListener("wheel",       onInput);
    };
  }, [camera]);

  useFrame(({ clock }) => {
    const idleSec = (Date.now() - lastInteract.current) / 1000;
    if (idleSec < 3) {
      /* Keep updating base while user is active */
      basePos.current.copy(camera.position);
      return;
    }
    drifting.current = true;
    const t     = clock.getElapsedTime();
    const blend = Math.min(1, (idleSec - 3) / 2.5); // fade in over 2.5 s
    /* Very subtle oscillation — approx ±0.06 units, imperceptible but alive */
    const dy = Math.sin(t * 0.13) * 0.06 * blend;
    const dx = Math.sin(t * 0.09 + 0.7) * 0.04 * blend;
    camera.position.set(
      basePos.current.x + dx,
      basePos.current.y + dy,
      basePos.current.z,
    );
    ctrlRef.current?.update();
  });

  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   CAMERA STATE TRACKER — writes position + target to a ref every frame
   (zero React re-renders; the minimap overlay reads this directly)
══════════════════════════════════════════════════════════════════════════ */
interface CameraState {
  px: number; py: number; pz: number;
  tx: number; ty: number; tz: number;
}

function CameraStateTracker({
  stateRef,
  ctrlRef,
}: {
  stateRef: React.MutableRefObject<CameraState | null>;
  ctrlRef:  React.MutableRefObject<any>;
}) {
  const { camera } = useThree();
  useFrame(() => {
    const tgt = ctrlRef.current?.target;
    stateRef.current = {
      px: camera.position.x, py: camera.position.y, pz: camera.position.z,
      tx: tgt?.x ?? 0, ty: tgt?.y ?? 0, tz: tgt?.z ?? 0,
    };
  });
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: BIRD FLOCK — 7 birds soaring, lazy circles, flapping wings
══════════════════════════════════════════════════════════════════════════ */
function AAABirdFlock() {
  const { particleScale } = useQuality();
  const activeBirds = useMemo(() => BIRDS.slice(0, Math.max(1, Math.ceil(BIRDS.length * particleScale))), [particleScale]);
  const groupRef = useRef<THREE.Group>(null!);
  const wingGeo  = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.15, 0.30, 2, 1);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) + Math.abs(pos.getX(i)) * 0.18);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const bodyGeo = useMemo(() => new THREE.SphereGeometry(0.09, 6, 4), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    activeBirds.forEach((b, i) => {
      const g = groupRef.current?.children[i] as THREE.Group;
      if (!g) return;
      const a = b.phase + t * b.speed;
      g.position.set(
        Math.cos(a) * b.radius,
        b.height + Math.sin(t * 0.14 + b.phase) * 1.8,
        Math.sin(a) * b.radius + b.zOff,
      );
      g.rotation.y = -a - Math.PI / 2 + Math.sin(t * 0.36 + b.phase) * 0.1;
      g.rotation.z = Math.sin(t * 0.32 + b.phase) * 0.07;
      const flap = Math.sin(t * b.flapSp + b.phase) * b.flapAm;
      const lw = g.children[0] as THREE.Mesh, rw = g.children[1] as THREE.Mesh;
      if (lw) lw.rotation.z =  flap;
      if (rw) rw.rotation.z = -flap;
    });
  });

  return (
    <group ref={groupRef}>
      {activeBirds.map((_, i) => (
        <group key={i}>
          <mesh geometry={wingGeo} position={[-0.62, 0, 0]}>
            <meshStandardMaterial color="#28200e" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={wingGeo} position={[0.62, 0, 0]} scale={[-1, 1, 1]}>
            <meshStandardMaterial color="#28200e" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={bodyGeo}>
            <meshStandardMaterial color="#221a0a" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: BUTTERFLIES — 10 wing-flapping creatures near the flowers
══════════════════════════════════════════════════════════════════════════ */
function AAAButterflies() {
  const { particleScale } = useQuality();
  const activeFlies = useMemo(() => BFLIES.slice(0, Math.max(1, Math.ceil(BFLIES.length * particleScale))), [particleScale]);
  const groupRef = useRef<THREE.Group>(null!);
  const wingGeo  = useMemo(() => new THREE.PlaneGeometry(0.20, 0.15), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    activeFlies.forEach((bf, i) => {
      const g = groupRef.current?.children[i] as THREE.Group;
      if (!g) return;
      g.position.set(
        bf.x + Math.sin(t * bf.speed + bf.phase) * bf.radius,
        bf.y + Math.sin(t * 0.85 + bf.phase * 1.3) * 0.22,
        bf.z + Math.cos(t * bf.speed * 0.65 + bf.phase) * bf.radius * 0.55,
      );
      g.rotation.y = t * bf.speed * 0.4 + bf.phase;
      const flap = Math.sin(t * bf.flapSp) * 0.78;
      const lw = g.children[0] as THREE.Mesh, rw = g.children[1] as THREE.Mesh;
      if (lw) lw.rotation.y =  flap;
      if (rw) rw.rotation.y = -flap;
    });
  });

  return (
    <group ref={groupRef}>
      {activeFlies.map((bf, i) => (
        <group key={i}>
          <mesh geometry={wingGeo} position={[-0.11, 0, 0]}>
            <meshStandardMaterial color={bf.col} transparent opacity={0.76}
              side={THREE.DoubleSide} roughness={0.62}
              emissive={new THREE.Color(bf.col)} emissiveIntensity={0.18} />
          </mesh>
          <mesh geometry={wingGeo} position={[0.11, 0, 0]}>
            <meshStandardMaterial color={bf.col} transparent opacity={0.76}
              side={THREE.DoubleSide} roughness={0.62}
              emissive={new THREE.Color(bf.col)} emissiveIntensity={0.18} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: DRIFTING LEAVES — 55 autumn leaves falling and spinning
══════════════════════════════════════════════════════════════════════════ */
function AAADriftingLeaves() {
  const { particleScale } = useQuality();
  const activeLeaves = useMemo(() => LEAF_D.slice(0, Math.max(4, Math.ceil(LEAF_D.length * particleScale))), [particleScale]);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dum = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    activeLeaves.forEach((lf, i) => {
      const yRaw = ((lf.y - t * lf.sp) % 11) + 0.1;
      const yPos = yRaw < 0 ? yRaw + 11 : yRaw;
      dum.position.set(
        lf.x + Math.sin(t * 0.26 + lf.ph) * 1.8 + lf.dr * t * 0.3,
        Math.max(0.08, yPos),
        lf.z + Math.cos(t * 0.20 + lf.ph * 1.1) * 1.5,
      );
      dum.rotation.set(
        Math.sin(t * lf.sn + lf.ph) * Math.PI,
        t * lf.sn * 0.55,
        Math.cos(t * lf.sn * 0.6) * Math.PI,
      );
      dum.scale.setScalar(lf.sc);
      dum.updateMatrix();
      ref.current.setMatrixAt(i, dum.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, activeLeaves.length]}>
      <planeGeometry args={[1, 1.15]} />
      <meshStandardMaterial color="#b04c20" roughness={0.88} side={THREE.DoubleSide}
        transparent opacity={0.84} depthWrite={false} />
    </instancedMesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: GOD RAYS — subtle volumetric light shafts through tree canopy
══════════════════════════════════════════════════════════════════════════ */
function AAAGodRays() {
  const N   = 16;
  const ref = useRef<THREE.InstancedMesh>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const dum = useMemo(() => new THREE.Object3D(), []);

  const shafts = useMemo(() => {
    const r = makeLCG(97);
    return Array.from({ length: N }, () => ({
      x: (r() - 0.5) * 36, z: (r() - 0.5) * 36,
      rotX: 0.12 + r() * 0.20, rotZ: (r() - 0.5) * 0.24,
      ph: r() * Math.PI * 2, sc: 0.5 + r() * 0.75,
      len: 5 + r() * 9,
    }));
  }, []);

  useFrame(({ clock }) => {
    const t    = clock.getElapsedTime();
    const cyc  = (t % CYCLE_DURATION) / CYCLE_DURATION;
    const elev = Math.sin(cyc * Math.PI * 2 - Math.PI * 0.28) * 0.85;
    const sunStr = Math.max(0, elev + 0.08) / 0.93;

    shafts.forEach((s, i) => {
      const flicker = 0.90 + Math.sin(t * 0.28 + s.ph) * 0.10;
      dum.position.set(s.x, s.len * 0.5 + 1.5, s.z);
      dum.rotation.set(s.rotX, s.ph * 0.3, s.rotZ);
      dum.scale.set(s.sc * 1.5 * flicker, s.len, s.sc * 0.85);
      dum.updateMatrix();
      ref.current.setMatrixAt(i, dum.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (mat.current) {
      mat.current.opacity = Math.max(0, sunStr * 0.088 * (0.92 + Math.sin(t * 0.14) * 0.08));
    }
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={mat}
        color="#fff8e0"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: WATERFALL MIST — floating mist particles at waterfall bases
══════════════════════════════════════════════════════════════════════════ */
function AAAWaterfallMist({ position }: { position: [number, number, number] }) {
  const N   = 20;
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dum = useMemo(() => new THREE.Object3D(), []);
  const pts = useMemo(() => {
    const r = makeLCG(71 + Math.round(position[0] * 7 + position[2] * 3));
    return Array.from({ length: N }, () => ({
      dx: (r() - 0.5) * 2.6, dz: (r() - 0.5) * 1.8,
      sp: 0.32 + r() * 0.42,  ph: r() * Math.PI * 2, sc: 0.32 + r() * 0.72,
    }));
  }, [position]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    pts.forEach((p, i) => {
      const y = ((p.ph + t * p.sp) % 3.2);
      dum.position.set(
        position[0] + p.dx + Math.sin(t * 0.5 + p.ph) * 0.35,
        position[1] + y * 0.45,
        position[2] + p.dz + Math.cos(t * 0.42 + p.ph) * 0.3,
      );
      dum.scale.setScalar(p.sc * (1 + y * 0.55));
      dum.updateMatrix();
      ref.current.setMatrixAt(i, dum.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <sphereGeometry args={[0.36, 5, 4]} />
      <meshStandardMaterial color="#d8eef8" transparent opacity={0.11} depthWrite={false} />
    </instancedMesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: GRASS BLADES — 200 wind-swaying grass blades
══════════════════════════════════════════════════════════════════════════ */
function AAAGrassBlades() {
  const { particleScale } = useQuality();
  const activeGrass = useMemo(() => GRASS.slice(0, Math.max(10, Math.ceil(GRASS.length * particleScale))), [particleScale]);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dum = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    activeGrass.forEach((g, i) => {
      const sway = Math.sin(t * 0.75 + g.ph) * 0.18 + Math.sin(t * 1.35 + g.ph * 1.4) * 0.07;
      dum.position.set(g.x, g.h * 0.5, g.z);
      dum.rotation.set(0, g.ph, sway + g.tilt);
      dum.scale.set(g.w, g.h, g.w);
      dum.updateMatrix();
      ref.current.setMatrixAt(i, dum.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, activeGrass.length]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color="#548030" roughness={0.88} side={THREE.DoubleSide}
        transparent opacity={0.88} depthWrite={false} />
    </instancedMesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: CANDLE SMOKE — subtle wisps drifting above flame clusters
══════════════════════════════════════════════════════════════════════════ */
function AAACandleSmoke() {
  /* Sample positions near entry candles + altar area */
  const smkPos = useMemo(() => {
    const pts: [number, number, number][] = [];
    /* Altar area */
    const ra = makeLCG(19);
    for (let i = 0; i < 6; i++) pts.push([(ra() - 0.5) * 3.5, 3.6, (ra() - 0.5) * 3]);
    /* First 28 entry candle positions */
    ENTRY_POSITIONS.slice(0, 28).forEach(([x, y, z]) => pts.push([x, y + 0.9, z]));
    return pts;
  }, []);
  const N   = smkPos.length;
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dum = useMemo(() => new THREE.Object3D(), []);
  const ph  = useMemo(() => smkPos.map((_, i) => (i * 0.41) % (Math.PI * 2)), [smkPos]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    smkPos.forEach(([x, y, z], i) => {
      const rise = ((ph[i] + t * 0.38) % 2.0);
      const drift = Math.sin(t * 0.28 + ph[i]) * 0.12;
      dum.position.set(x + drift, y + rise * 0.7, z + drift * 0.6);
      dum.scale.setScalar(0.07 + rise * 0.10);
      dum.updateMatrix();
      ref.current.setMatrixAt(i, dum.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshStandardMaterial color="#c8c0b8" transparent opacity={0.055} depthWrite={false} />
    </instancedMesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DAY/NIGHT: SKY DOME — animated horizon/zenith gradient with sun disc
══════════════════════════════════════════════════════════════════════════ */
function AAASkyDome() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const { scene } = useThree();

  const uniforms = useMemo(() => ({
    uZenith:  { value: new THREE.Color(0.29, 0.49, 0.82) },
    uHorizon: { value: new THREE.Color(0.98, 0.75, 0.42) },
    uSunGlow: { value: new THREE.Color(1.0,  0.95, 0.72) },
    uSunDir:  { value: new THREE.Vector3(0.5, 0.3, 0.4).normalize() },
    uSunStr:  { value: 1.0 },
    uTime:    { value: 0.0 },
  }), []);

  useFrame(({ clock }) => {
    const raw = clock.getElapsedTime();
    const t = (raw % CYCLE_DURATION) / CYCLE_DURATION;

    const zenith  = interpCycleColor(t, SKY_ZENITH_KF);
    const horizon = interpCycleColor(t, SKY_HORIZON_KF);
    const fog     = interpCycleColor(t, FOG_KF);

    const u = matRef.current.uniforms;
    u.uZenith.value.setRGB(zenith.r,  zenith.g,  zenith.b);
    u.uHorizon.value.setRGB(horizon.r, horizon.g, horizon.b);
    u.uTime.value = raw;

    /* Sun glow colour */
    if      (t < 0.15 || t > 0.90) u.uSunGlow.value.setRGB(1.0, 0.95, 0.72);
    else if (t < 0.28)              u.uSunGlow.value.setRGB(1.0, 0.40, 0.14);
    else if (t > 0.78)              u.uSunGlow.value.setRGB(1.0, 0.62, 0.32);
    else                            u.uSunGlow.value.setRGB(0.0, 0.0,  0.0);

    /* Sun position arc */
    const cyc   = t * Math.PI * 2;
    const elev  = Math.sin(cyc - Math.PI * 0.28) * 0.85;
    u.uSunDir.value.set(Math.cos(cyc) * 0.7, Math.max(-0.3, elev), Math.sin(cyc) * 0.5).normalize();
    u.uSunStr.value = Math.max(0, elev + 0.1) * 1.4;

    /* Update scene fog live */
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.setRGB(fog.r, fog.g, fog.b);
      const isDeepNight = t > 0.42 && t < 0.70;
      scene.fog.density = isDeepNight ? 0.016 : 0.011;
    }
  });

  return (
    <mesh scale={[1, 1, 1]}>
      <sphereGeometry args={[88, 32, 16]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DAY/NIGHT: STAR FIELD — points fade in at dusk, out at dawn
══════════════════════════════════════════════════════════════════════════ */
function AAAStarField() {
  const starGeo = useMemo(() => {
    const r  = makeLCG(77);
    const N  = 1400;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = r() * Math.PI * 2;
      const phi   = Math.acos(r() * 0.86 + 0.14); // upper dome only
      const rad   = 80 + r() * 6;
      positions[i * 3]     = Math.sin(phi) * Math.cos(theta) * rad;
      positions[i * 3 + 1] = Math.cos(phi) * rad;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * rad;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const matRef = useRef<THREE.PointsMaterial>(null!);

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() % CYCLE_DURATION) / CYCLE_DURATION;
    /* Fade in at dusk (0.30), full at night (0.45–0.70), fade out at dawn (0.82) */
    let alpha = 0;
    if (t > 0.28 && t < 0.86) {
      const fadeIn  = Math.min(1, (t - 0.28) / 0.10);
      const fadeOut = Math.min(1, (0.86 - t)  / 0.09);
      alpha = Math.min(fadeIn, fadeOut);
    }
    if (matRef.current) matRef.current.opacity = alpha;
  });

  return (
    <points geometry={starGeo}>
      <pointsMaterial
        ref={matRef}
        color="#dde8ff"
        size={0.55}
        transparent
        opacity={0}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DAY/NIGHT: MOON — glowing disc arcs across the night sky
══════════════════════════════════════════════════════════════════════════ */
function AAAMoon() {
  const groupRef = useRef<THREE.Group>(null!);
  const discRef  = useRef<THREE.MeshBasicMaterial>(null!);
  const haloRef  = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() % CYCLE_DURATION) / CYCLE_DURATION;
    /* Moon visible during dusk → dawn (0.33 → 0.82) */
    let alpha = 0;
    if (t > 0.30 && t < 0.84) {
      const fadeIn  = Math.min(1, (t - 0.30) / 0.07);
      const fadeOut = Math.min(1, (0.84 - t)  / 0.07);
      alpha = Math.min(fadeIn, fadeOut);
    }
    if (discRef.current)  discRef.current.opacity  = alpha * 0.96;
    if (haloRef.current)  haloRef.current.opacity   = alpha * 0.26;

    /* Slow arc: rises in east, peaks overhead, sets in west */
    if (groupRef.current && alpha > 0) {
      const ang = (t - 0.5) * Math.PI * 1.4; // arc angle during night
      const r   = 58, peak = 50;
      groupRef.current.position.set(
        Math.cos(ang) * r,
        peak * Math.max(0, Math.sin((t - 0.33) / 0.51 * Math.PI)),
        Math.sin(ang) * 30 - 22,
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 48, -25]}>
      {/* Soft halo */}
      <mesh>
        <circleGeometry args={[9, 32]} />
        <meshBasicMaterial ref={haloRef} color="#c8dcf0" transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Moon disc */}
      <mesh>
        <circleGeometry args={[4.5, 32]} />
        <meshBasicMaterial ref={discRef} color="#e8e2d8" transparent opacity={0} />
      </mesh>
      {/* Subtle crater texture */}
      <mesh position={[1.2, 0.8, 0.01]}>
        <circleGeometry args={[0.9, 16]} />
        <meshBasicMaterial color="#d0cac0" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DAY/NIGHT: LIGHTING — sun, fill, ambient all driven by cycle clock
   (replaces static GoldenHourLighting so everything stays in sync)
══════════════════════════════════════════════════════════════════════════ */
function DayNightLighting() {
  const sunRef  = useRef<THREE.DirectionalLight>(null!);
  const fillRef = useRef<THREE.DirectionalLight>(null!);
  const ambRef  = useRef<THREE.AmbientLight>(null!);

  useFrame(({ clock }) => {
    const raw = clock.getElapsedTime();
    const t   = (raw % CYCLE_DURATION) / CYCLE_DURATION;

    /* Sun arc — full sine curve across the sky */
    const cyc    = t * Math.PI * 2;
    const elevR  = Math.sin(cyc - Math.PI * 0.28) * 0.85;
    const azR    = cyc;
    const dist   = 55;
    sunRef.current.position.set(
      Math.cos(elevR) * Math.cos(azR) * dist,
      Math.sin(elevR) * dist,
      Math.cos(elevR) * Math.sin(azR) * dist,
    );

    /* Sun intensity: 0 below horizon, max 2.2 at peak, flicker at golden hour */
    const sunI = Math.max(0, elevR + 0.08) / 0.93;
    const flick = 1 + Math.sin(raw * 1.8) * 0.07 * Math.min(1, sunI * 4);
    sunRef.current.intensity = Math.min(2.2, sunI * 2.2 * flick);

    /* Sun colour: golden → sunset red → off → dawn pink → golden */
    if      (t < 0.12 || t > 0.92) sunRef.current.color.setRGB(1.0, 0.74, 0.42); // golden
    else if (t < 0.28)              sunRef.current.color.setRGB(1.0, 0.40, 0.14); // sunset
    else if (t > 0.80)              sunRef.current.color.setRGB(1.0, 0.55, 0.28); // dawn
    else                            sunRef.current.color.setRGB(0.05, 0.05, 0.1); // night

    /* Fill light (sky fill, opposite sun) */
    fillRef.current.position.set(
      -sunRef.current.position.x * 0.6, 14, -sunRef.current.position.z * 0.6,
    );
    fillRef.current.intensity = Math.max(0, sunI * 0.40);

    /* Ambient: warm day → deep cool night */
    const isNight = t > 0.38 && t < 0.78;
    const nightT  = isNight
      ? Math.min(1, Math.min((t - 0.38) / 0.09, (0.78 - t) / 0.07))
      : 0;
    ambRef.current.intensity = 0.52 * (1 - nightT) + 0.055 * nightT;
    ambRef.current.color.setRGB(
      1.0  * (1 - nightT) + 0.18 * nightT,
      0.72 * (1 - nightT) + 0.22 * nightT,
      0.45 * (1 - nightT) + 0.62 * nightT,
    );
  });

  return (
    <>
      <hemisphereLight args={["#ffd4a0", "#2e4a1e", 0.62]} position={[0, 50, 0]} />
      <directionalLight
        ref={sunRef}
        color="#ffbb66"
        intensity={2.2}
        position={[38, 22, 28]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <directionalLight
        ref={fillRef}
        color="#8ab8d8"
        intensity={0.38}
        position={[-22, 14, -18]}
        castShadow={false}
      />
      {/* Ground bounce — static warm fill from limestone */}
      <directionalLight color="#d49a50" intensity={0.20} position={[0, -8, 0]} castShadow={false} />
      <ambientLight ref={ambRef} color="#ffaa66" intensity={0.52} />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GROUND MIST — PUBG-style volumetric low-altitude fog, thickens at night
══════════════════════════════════════════════════════════════════════════ */
function AAAGroundMist() {
  const uRef = useRef({
    uTime:    { value: 0 },
    uOpacity: { value: 0.10 },
  });
  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const t = (elapsed % CYCLE_DURATION) / CYCLE_DURATION;
    uRef.current.uTime.value = elapsed;
    /* Denser at dusk/night, lighter at noon */
    const nightBlend = (t > 0.32 && t < 0.80)
      ? Math.min(1, Math.min((t - 0.32) / 0.10, (0.80 - t) / 0.09))
      : 0;
    uRef.current.uOpacity.value = 0.07 + nightBlend * 0.16;
  });
  return (
    <group>
      {/* Layer 1 — hugging the ground, densest */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.24, 4]}>
        <planeGeometry args={[100, 100, 1, 1]} />
        <shaderMaterial
          uniforms={uRef.current}
          vertexShader={MIST_VERT}
          fragmentShader={MIST_FRAG}
          transparent depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Layer 2 — slightly higher, offset rotation for non-repeating pattern */}
      <mesh rotation={[-Math.PI / 2, 0.55, 0]} position={[0, 0.62, 4]}>
        <planeGeometry args={[75, 75, 1, 1]} />
        <shaderMaterial
          uniforms={uRef.current}
          vertexShader={MIST_VERT}
          fragmentShader={MIST_FRAG}
          transparent depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Layer 3 — wispy tendrils near candle clusters */}
      <mesh rotation={[-Math.PI / 2, 1.1, 0]} position={[0, 1.05, 4]}>
        <planeGeometry args={[45, 45, 1, 1]} />
        <shaderMaterial
          uniforms={uRef.current}
          vertexShader={MIST_VERT}
          fragmentShader={MIST_FRAG}
          transparent depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GROUND CLICK PLANE
   Drag-guard: only fires onGroundClick when the pointer moved < 10 px
   between pointerdown and click — prevents unintentional triggers during
   camera pan / rotate gestures.
══════════════════════════════════════════════════════════════════════════ */
const DRAG_THRESHOLD_PX = 10;
function GroundClickPlane({ onGroundClick }: { onGroundClick: (pos: [number, number, number]) => void }) {
  const downPos = useRef<{ x: number; y: number } | null>(null);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      onPointerDown={e => {
        downPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
      }}
      onClick={e => {
        e.stopPropagation();
        if (downPos.current) {
          const dx = e.nativeEvent.clientX - downPos.current.x;
          const dy = e.nativeEvent.clientY - downPos.current.y;
          if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) return;
        }
        const { x, y, z } = e.point;
        onGroundClick([x, y + 0.15, z]);
      }}
    >
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial transparent opacity={0} />
    </mesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPR-031: DISTANT MOUNTAINS — background ridge silhouettes for depth
══════════════════════════════════════════════════════════════════════════ */
function AAADistantMountains() {
  const farPeaks = [
    { x: -82, z: -68, h: 30, w: 30 }, { x: -58, z: -75, h: 40, w: 34 },
    { x: -32, z: -70, h: 34, w: 27 }, { x: -8,  z: -78, h: 46, w: 32 },
    { x: 18,  z: -72, h: 38, w: 30 }, { x: 44,  z: -76, h: 44, w: 36 },
    { x: 68,  z: -67, h: 32, w: 28 }, { x: 90,  z: -62, h: 24, w: 24 },
  ];
  const nearRidge = [
    { x: -72, z: -50, h: 18, w: 22 }, { x: -46, z: -56, h: 24, w: 26 },
    { x: -22, z: -53, h: 19, w: 20 }, { x: 6,   z: -58, h: 26, w: 24 },
    { x: 32,  z: -54, h: 21, w: 22 }, { x: 58,  z: -56, h: 19, w: 24 },
    { x: 78,  z: -48, h: 15, w: 20 },
  ];
  /* Side ridges — east and west */
  const eastRidge = [
    { x: 78, z: -20, h: 22, w: 24 }, { x: 82, z: 4,  h: 18, w: 20 },
    { x: 80, z: 26, h: 20, w: 22 },
  ];
  const westRidge = [
    { x: -80, z: -16, h: 20, w: 22 }, { x: -84, z: 6,  h: 16, w: 18 },
    { x: -78, z: 28, h: 18, w: 20 },
  ];

  return (
    <group>
      {/* Far cool-blue range */}
      {farPeaks.map(({ x, z, h, w }, i) => (
        <mesh key={`far-${i}`} position={[x, h * 0.5 - 2, z]} castShadow={false} receiveShadow={false}>
          <coneGeometry args={[w, h, 5, 1]} />
          <meshStandardMaterial color="#7888a4" roughness={0.95} metalness={0.0} envMapIntensity={0.1} />
        </mesh>
      ))}
      {/* Near warm-stone ridge */}
      {nearRidge.map(({ x, z, h, w }, i) => (
        <mesh key={`near-${i}`} position={[x, h * 0.5 - 1, z]} castShadow={false} receiveShadow={false}>
          <coneGeometry args={[w, h, 4, 1]} />
          <meshStandardMaterial color="#9e8f7c" roughness={0.92} metalness={0.0} />
        </mesh>
      ))}
      {/* Side ridges */}
      {[...eastRidge, ...westRidge].map(({ x, z, h, w }, i) => (
        <mesh key={`side-${i}`} position={[x, h * 0.5 - 1, z]} castShadow={false} receiveShadow={false}>
          <coneGeometry args={[w, h, 4, 1]} />
          <meshStandardMaterial color="#92827a" roughness={0.93} metalness={0.0} />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPR-031: TREE OF REMEMBRANCE — giant ancient olive, the central landmark
══════════════════════════════════════════════════════════════════════════ */
function AAATreeOfRemembrance() {
  const trunkGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.42, 0.88, 7.0, 14, 7);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const y  = pos.getY(i);
      const tN = (y + 3.5) / 7.0;
      const tw = Math.sin(tN * Math.PI * 3.8) * 0.32 + Math.cos(tN * Math.PI * 2.4) * 0.20;
      pos.setX(i, pos.getX(i) + tw + Math.sin(i * 0.77) * 0.14);
      pos.setZ(i, pos.getZ(i) + Math.cos(tN * Math.PI * 2.9) * 0.24);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const rootGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.07, 0.52, 2.4, 6, 2);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) + pos.getY(i) * 0.28);
    g.computeVertexNormals();
    return g;
  }, []);

  const canA = useMemo(() => new THREE.SphereGeometry(5.0, 12, 9), []);
  const canB = useMemo(() => new THREE.SphereGeometry(3.8, 11, 8), []);
  const canC = useMemo(() => new THREE.SphereGeometry(3.0, 10, 8), []);
  const canD = useMemo(() => new THREE.SphereGeometry(2.2, 9,  7), []);
  const canE = useMemo(() => new THREE.SphereGeometry(1.5, 8,  6), []);

  const canopyRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const sw = Math.sin(t * 0.30) * 0.016 + Math.sin(t * 0.88) * 0.006;
    if (canopyRef.current) { canopyRef.current.rotation.x = sw; canopyRef.current.rotation.z = sw * 0.72; }
  });

  return (
    <group position={[-9, 0, -4]}>
      {/* Root buttresses */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.72, -0.3, Math.sin(a) * 0.72]}
            rotation={[0, a, Math.PI * 0.13]} geometry={rootGeo}>
            <meshStandardMaterial color="#2a1a08" roughness={0.97} metalness={0.0} />
          </mesh>
        );
      })}
      {/* Main trunk */}
      <mesh position={[0, 3.5, 0]} geometry={trunkGeo} castShadow>
        <meshStandardMaterial color="#2e1a0a" roughness={0.97} metalness={0.0} />
      </mesh>
      {/* Major branches */}
      {[
        { pos: [0.9, 5.0, 0.5] as [number,number,number], rot: [0.45, 0.3, 0.22] as [number,number,number], len: 3.0 },
        { pos: [-0.7, 5.5, 0.7] as [number,number,number], rot: [-0.32, 0.8, 0.12] as [number,number,number], len: 2.6 },
        { pos: [0.5, 6.2, -0.9] as [number,number,number], rot: [0.22, 1.4, -0.18] as [number,number,number], len: 2.4 },
        { pos: [-0.8, 6.8, -0.4] as [number,number,number], rot: [-0.15, 2.1, 0.28] as [number,number,number], len: 2.0 },
      ].map((b, i) => (
        <mesh key={i} position={b.pos} rotation={b.rot} castShadow>
          <cylinderGeometry args={[0.07, 0.17, b.len, 8]} />
          <meshStandardMaterial color="#332010" roughness={0.96} metalness={0.0} />
        </mesh>
      ))}
      {/* Massive multi-layered crown */}
      <group ref={canopyRef}>
        <mesh position={[0, 9.0, 0]} geometry={canA} castShadow>
          <meshStandardMaterial color="#243c12" roughness={0.92} metalness={0.0} envMapIntensity={0.4} />
        </mesh>
        <mesh position={[2.0, 10.2, -1.4]} geometry={canB} castShadow>
          <meshStandardMaterial color="#304e1c" roughness={0.89} metalness={0.0} />
        </mesh>
        <mesh position={[-2.4, 9.6, 1.2]} geometry={canB} castShadow>
          <meshStandardMaterial color="#2b481a" roughness={0.90} metalness={0.0} />
        </mesh>
        <mesh position={[0.6, 12.0, 1.0]} geometry={canC} castShadow>
          <meshStandardMaterial color="#3c5c22" roughness={0.87} metalness={0.0} />
        </mesh>
        <mesh position={[-1.2, 12.8, -1.0]} geometry={canD}>
          <meshStandardMaterial color="#507830" roughness={0.85} metalness={0.0}
            emissive={new THREE.Color("#1a3008")} emissiveIntensity={0.14} />
        </mesh>
        <mesh position={[2.2, 12.4, 0.5]} geometry={canD}>
          <meshStandardMaterial color="#4c7030" roughness={0.85} metalness={0.0} />
        </mesh>
        {/* Silver-green sunlit tips */}
        <mesh position={[0, 14.2, 0]} geometry={canE}>
          <meshStandardMaterial color="#78a850" roughness={0.82} metalness={0.0}
            emissive={new THREE.Color("#2a5010")} emissiveIntensity={0.22} />
        </mesh>
        <mesh position={[-1.4, 13.5, 0.8]} geometry={canE}>
          <meshStandardMaterial color="#6ea046" roughness={0.83} metalness={0.0}
            emissive={new THREE.Color("#244808")} emissiveIntensity={0.18} />
        </mesh>
      </group>
      {/* Moss ring at base */}
      <mesh position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1.75, 18]} />
        <meshStandardMaterial color="#2e5a18" roughness={0.95} metalness={0.0} transparent opacity={0.72} />
      </mesh>
      {/* Carved stone plaque */}
      <mesh position={[0.96, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.04, 0.52, 0.72]} />
        <meshStandardMaterial color="#c8b860" roughness={0.5} metalness={0.5}
          emissive={new THREE.Color("#8a7020")} emissiveIntensity={0.32} />
      </mesh>
      <Text position={[1.02, 1.3, 0]} fontSize={0.11} color="#D4AF37" anchorX="center" rotation={[0, Math.PI / 2, 0]}>
        עץ הזיכרון
      </Text>
      {/* Warm glow from the ancient tree */}
      <pointLight color="#ff9944" intensity={1.8} distance={14} decay={2} position={[0, 2.5, 0]} />
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPR-031: MEMORIAL GATE — ceremonial entrance arch at the valley entrance
══════════════════════════════════════════════════════════════════════════ */
function AAAMemorialGate() {
  const flameU = useRef({ uTime: { value: 0 }, uOffset: { value: 0 } });
  const flameU2 = useRef({ uTime: { value: 0 }, uOffset: { value: 1.7 } });
  useFrame(({ clock }) => {
    flameU.current.uTime.value  = clock.getElapsedTime();
    flameU2.current.uTime.value = clock.getElapsedTime();
  });

  return (
    <group position={[0, 0, 21]}>
      {/* Left pillar */}
      <mesh position={[-3.6, 3.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 6.4, 1.25]} />
        <meshStandardMaterial color="#d0c4a0" roughness={0.84} metalness={0.05} />
      </mesh>
      {/* Right pillar */}
      <mesh position={[3.6, 3.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 6.4, 1.25]} />
        <meshStandardMaterial color="#d0c4a0" roughness={0.84} metalness={0.05} />
      </mesh>
      {/* Pillar caps */}
      {[-3.6, 3.6].map((x, i) => (
        <mesh key={i} position={[x, 6.75, 0]} castShadow>
          <boxGeometry args={[1.65, 0.72, 1.65]} />
          <meshStandardMaterial color="#beb290" roughness={0.80} metalness={0.06} />
        </mesh>
      ))}
      {/* Lintel beam */}
      <mesh position={[0, 7.05, 0]} castShadow>
        <boxGeometry args={[9.0, 0.68, 1.30]} />
        <meshStandardMaterial color="#cfc5a4" roughness={0.82} metalness={0.05} />
      </mesh>
      {/* Decorative top rail */}
      <mesh position={[0, 7.58, 0]}>
        <boxGeometry args={[7.2, 0.42, 1.12]} />
        <meshStandardMaterial color="#bdb08e" roughness={0.82} metalness={0.05} />
      </mesh>
      {/* Central Star of David emblem */}
      <mesh position={[0, 7.34, 0.71]}>
        <cylinderGeometry args={[0.30, 0.30, 0.11, 6]} />
        <meshStandardMaterial color="#D4AF37" roughness={0.32} metalness={0.78}
          emissive={new THREE.Color("#9a7800")} emissiveIntensity={0.6} />
      </mesh>
      {/* Moss weathering on pillars */}
      {[-3.6, 3.6].map((x, i) => (
        <mesh key={i} position={[x + (i === 0 ? 0.63 : -0.63), 1.9, 0.1]}>
          <boxGeometry args={[0.02, 1.5, 0.85]} />
          <meshStandardMaterial color="#3e621a" roughness={0.95} metalness={0.0} transparent opacity={0.72} />
        </mesh>
      ))}
      {/* Flanking eternal flame pillars */}
      {[-5.0, 5.0].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 1.6, 10]} />
            <meshStandardMaterial color="#c8ba98" roughness={0.78} metalness={0.08} />
          </mesh>
          <mesh position={[0, 1.7, 0]}>
            <cylinderGeometry args={[0.30, 0.22, 0.32, 10]} />
            <meshStandardMaterial color="#d4c8a0" roughness={0.72} metalness={0.1} />
          </mesh>
          {/* Flame */}
          <mesh position={[0, 2.0, 0]}>
            <coneGeometry args={[0.12, 0.32, 10, 1, true]} />
            <shaderMaterial
              uniforms={i === 0 ? flameU.current : flameU2.current}
              vertexShader={FLAME_VERT} fragmentShader={FLAME_FRAG}
              transparent depthWrite={false} side={THREE.DoubleSide}
            />
          </mesh>
          <pointLight color="#ff9933" intensity={3.2} distance={9} decay={2} position={[0, 2.1, 0]} />
        </group>
      ))}
      {/* Hebrew inscription */}
      <Text position={[0, 5.9, 0.78]} fontSize={0.30} color="#D4AF37" anchorX="center">
        בֵּית עוֹלַם
      </Text>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPR-031: WATER LILIES — floating pads and blossoms on the reflection pool
══════════════════════════════════════════════════════════════════════════ */
const R_LILY = makeLCG(113);
const LILY_DATA = Array.from({ length: 16 }, () => {
  const a = R_LILY() * Math.PI * 2;
  const r = 1.0 + R_LILY() * 3.8;
  return {
    x: Math.cos(a) * r, z: 4 + Math.sin(a) * r * 0.72,
    size: 0.26 + R_LILY() * 0.24, phase: R_LILY() * Math.PI * 2,
    bloom: R_LILY() > 0.58, pink: R_LILY() > 0.5,
  };
});

function AAAWaterLilies() {
  const padGeo    = useMemo(() => new THREE.CircleGeometry(1, 12), []);
  const petalGeo  = useMemo(() => new THREE.SphereGeometry(0.12, 6, 4), []);
  const centerGeo = useMemo(() => new THREE.SphereGeometry(0.16, 7, 5), []);

  const padRefs = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    LILY_DATA.forEach((l, i) => {
      const m = padRefs.current[i];
      if (m) m.position.y = 0.41 + Math.sin(t * 0.45 + l.phase) * 0.018;
    });
  });

  return (
    <>
      {LILY_DATA.map((l, i) => (
        <group key={i}>
          {/* Pad */}
          <mesh
            ref={el => { if (el) padRefs.current[i] = el; }}
            position={[l.x, 0.41, l.z]}
            rotation={[-Math.PI / 2, 0, l.phase]}
            scale={l.size}
            geometry={padGeo}
          >
            <meshStandardMaterial color="#2a6216" roughness={0.84} metalness={0.0}
              emissive={new THREE.Color("#0c3006")} emissiveIntensity={0.14} />
          </mesh>
          {/* Flower on every third lily */}
          {l.bloom && (
            <group position={[l.x, 0.50, l.z]}>
              {Array.from({ length: 7 }, (_, j) => {
                const a = (j / 7) * Math.PI * 2;
                return (
                  <mesh key={j} position={[Math.cos(a) * 0.14, 0.02, Math.sin(a) * 0.14]} scale={l.size * 0.85} geometry={petalGeo}>
                    <meshStandardMaterial
                      color={l.pink ? "#f8e4f0" : "#fff8e8"}
                      roughness={0.55}
                      emissive={new THREE.Color(l.pink ? "#d090b8" : "#d4aa40")}
                      emissiveIntensity={0.42}
                    />
                  </mesh>
                );
              })}
              <mesh position={[0, 0.09, 0]} scale={l.size * 0.9} geometry={centerGeo}>
                <meshStandardMaterial color="#ffe060" emissive={new THREE.Color("#ddaa00")} emissiveIntensity={1.4} roughness={0.4} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPR-031: FLOWERING TREES — cherry/almond blossoms, seasonal beauty
══════════════════════════════════════════════════════════════════════════ */
const R_FTREE = makeLCG(127);
const FTREE_DATA = Array.from({ length: 18 }, () => {
  const a = R_FTREE() * Math.PI * 2;
  const r = 9 + R_FTREE() * 16;
  return {
    x: Math.cos(a) * r, z: Math.sin(a) * r,
    sc: 0.78 + R_FTREE() * 0.52, phase: R_FTREE() * Math.PI * 2,
    pink: R_FTREE() > 0.44,
  };
});

function AAAFloweringTrees() {
  const canA   = useMemo(() => new THREE.SphereGeometry(1.45, 9, 7), []);
  const canB   = useMemo(() => new THREE.SphereGeometry(1.05, 8, 6), []);
  const canC   = useMemo(() => new THREE.SphereGeometry(0.72, 7, 5), []);
  const blosGeo = useMemo(() => new THREE.SphereGeometry(0.075, 5, 4), []);

  /* Pre-compute blossom cloud positions per tree */
  const blossomClouds = useMemo(() => FTREE_DATA.map(t => {
    const r = makeLCG(Math.round(t.phase * 100) + 44);
    return Array.from({ length: 26 }, () => ({
      dx: (r() - 0.5) * 3.0 * t.sc,
      dy: 2.2 + r() * 3.0 * t.sc,
      dz: (r() - 0.5) * 3.0 * t.sc,
      sc: 0.55 + r() * 0.9,
    }));
  }), []);

  const swayRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const sw = Math.sin(t * 0.44) * 0.014 + Math.sin(t * 1.12) * 0.005;
    if (swayRef.current) { swayRef.current.rotation.x = sw; swayRef.current.rotation.z = sw * 0.65; }
  });

  return (
    <group ref={swayRef}>
      {FTREE_DATA.map((tree, ti) => {
        const col     = tree.pink ? "#f4b8cc" : "#fae0b4";
        const emCol   = tree.pink ? "#c85888" : "#c89028";
        const tipCol  = tree.pink ? "#fff0f4" : "#fffaf0";
        return (
          <group key={ti} position={[tree.x, 0, tree.z]}>
            {/* Trunk */}
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.15, 3.0, 8, 3]} />
              <meshStandardMaterial color="#3a2010" roughness={0.95} metalness={0.0} />
            </mesh>
            {/* Canopy clusters */}
            <mesh position={[0, 3.6 * tree.sc, 0]} geometry={canA}>
              <meshStandardMaterial color={col} roughness={0.74} metalness={0.0}
                emissive={new THREE.Color(emCol)} emissiveIntensity={0.30} />
            </mesh>
            <mesh position={[0.75 * tree.sc, 4.4 * tree.sc, -0.55 * tree.sc]} geometry={canB}>
              <meshStandardMaterial color={col} roughness={0.71} metalness={0.0}
                emissive={new THREE.Color(emCol)} emissiveIntensity={0.32} />
            </mesh>
            <mesh position={[-0.65 * tree.sc, 4.8 * tree.sc, 0.55 * tree.sc]} geometry={canC}>
              <meshStandardMaterial color={tipCol} roughness={0.67} metalness={0.0}
                emissive={new THREE.Color(emCol)} emissiveIntensity={0.42} />
            </mesh>
            {/* Blossom cloud particles */}
            {blossomClouds[ti].map((b, bi) => (
              <mesh key={bi} position={[b.dx, b.dy, b.dz]} scale={b.sc * 0.52} geometry={blosGeo}>
                <meshStandardMaterial color={col} roughness={0.60}
                  emissive={new THREE.Color(emCol)} emissiveIntensity={0.52}
                  transparent opacity={0.80} depthWrite={false} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPR-031: SAPLINGS — young small trees scattered organically
══════════════════════════════════════════════════════════════════════════ */
const R_SAP = makeLCG(143);
const SAPLING_DATA = Array.from({ length: 32 }, () => {
  const a = R_SAP() * Math.PI * 2;
  const r = 7 + R_SAP() * 28;
  return {
    x: Math.cos(a) * r, z: Math.sin(a) * r,
    h: 0.7 + R_SAP() * 1.5, colIdx: Math.floor(R_SAP() * 3),
  };
});

function AAASaplings() {
  const leafGeo = useMemo(() => new THREE.SphereGeometry(0.36, 6, 5), []);
  const COLS = ["#4e7820", "#3a6218", "#567e2e"];

  return (
    <>
      {SAPLING_DATA.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          <mesh position={[0, s.h * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.07, s.h, 6, 2]} />
            <meshStandardMaterial color="#3a2010" roughness={0.95} metalness={0.0} />
          </mesh>
          <mesh position={[0, s.h * 1.12, 0]} scale={[s.h * 0.55, s.h * 0.68, s.h * 0.55]} geometry={leafGeo}>
            <meshStandardMaterial color={COLS[s.colIdx]} roughness={0.88} metalness={0.0} />
          </mesh>
          {/* Tiny secondary cluster */}
          {s.h > 1.4 && (
            <mesh position={[s.h * 0.22, s.h * 0.98, s.h * 0.14]} scale={s.h * 0.32} geometry={leafGeo}>
              <meshStandardMaterial color={COLS[(s.colIdx + 1) % 3]} roughness={0.88} metalness={0.0} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPR-031: MOSS RUINS — weathered ancient columns, carved walls, pavilion
══════════════════════════════════════════════════════════════════════════ */
function AAAMossRuins() {
  const stone  = { color: "#bab098", roughness: 0.90, metalness: 0.03 } as const;
  const dark   = { color: "#9a9080", roughness: 0.92, metalness: 0.03 } as const;
  const mossC  = "#4a7030";
  const flameU = useRef({ uTime: { value: 0 }, uOffset: { value: 0.8 } });
  useFrame(({ clock }) => { flameU.current.uTime.value = clock.getElapsedTime(); });

  return (
    <>
      {/* Broken column cluster — west side */}
      <group position={[-23, 0, -6]}>
        <mesh position={[0, 2.9, 0]} rotation={[0.04, 0, -0.07]} castShadow>
          <cylinderGeometry args={[0.38, 0.46, 5.8, 11]} />
          <meshStandardMaterial {...stone} />
        </mesh>
        <mesh position={[0, 6.05, 0]} castShadow>
          <boxGeometry args={[1.05, 0.42, 1.05]} />
          <meshStandardMaterial {...dark} />
        </mesh>
        {/* Fallen drum section */}
        <mesh position={[2.0, 0.40, 0.6]} rotation={[0, 0.38, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.36, 0.40, 4.0, 11]} />
          <meshStandardMaterial {...stone} />
        </mesh>
        {/* Base disc */}
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.72, 12]} />
          <meshStandardMaterial {...dark} />
        </mesh>
        {/* Moss stripe */}
        <mesh position={[0.45, 1.4, 0.1]}>
          <boxGeometry args={[0.03, 2.0, 0.58]} />
          <meshStandardMaterial color={mossC} roughness={0.95} metalness={0.0} transparent opacity={0.70} />
        </mesh>
      </group>

      {/* Column cluster — east side */}
      <group position={[25, 0, -9]}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.33, 0.40, 3.2, 11]} />
          <meshStandardMaterial {...stone} />
        </mesh>
        <mesh position={[2.3, 0.32, -0.9]} rotation={[0, 0.52, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.30, 0.35, 3.4, 10]} />
          <meshStandardMaterial {...dark} />
        </mesh>
        <mesh position={[-1.6, 0.28, 1.3]} rotation={[0, -0.28, Math.PI / 2.2]} castShadow>
          <cylinderGeometry args={[0.28, 0.33, 3.0, 9]} />
          <meshStandardMaterial {...stone} />
        </mesh>
        {/* Carved stone block */}
        <mesh position={[0.6, 0.38, 2.2]} castShadow>
          <boxGeometry args={[1.5, 0.75, 0.90]} />
          <meshStandardMaterial {...dark} />
        </mesh>
        {/* Moss on standing column */}
        <mesh position={[0.34, 1.2, 0.2]}>
          <boxGeometry args={[0.03, 1.4, 0.48]} />
          <meshStandardMaterial color={mossC} roughness={0.95} metalness={0.0} transparent opacity={0.68} />
        </mesh>
      </group>

      {/* Ancient carved memorial wall */}
      <group position={[-19, 0, 15]}>
        <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.8, 2.9, 0.68]} />
          <meshStandardMaterial {...stone} />
        </mesh>
        {/* Arch relief */}
        <mesh position={[0, 1.95, 0.36]} castShadow>
          <boxGeometry args={[2.3, 1.9, 0.13]} />
          <meshStandardMaterial color="#ccc09e" roughness={0.84} metalness={0.04} />
        </mesh>
        <mesh position={[0, 2.98, 0.36]}>
          <cylinderGeometry args={[1.14, 1.14, 0.13, 14, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#ccc09e" roughness={0.84} metalness={0.04} />
        </mesh>
        <Text position={[0, 1.52, 0.46]} fontSize={0.23} color="#9a8870" anchorX="center">
          לזכר עולם
        </Text>
        {/* Moss cornice */}
        <mesh position={[0, 2.92, 0.35]}>
          <boxGeometry args={[5.9, 0.20, 0.09]} />
          <meshStandardMaterial color={mossC} roughness={0.95} transparent opacity={0.62} />
        </mesh>
        {/* Candle at wall base */}
        <mesh position={[2.2, 0.5, 0.5]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, 1.0, 8]} />
          <meshStandardMaterial color="#f5edd0" roughness={0.55} metalness={0.0} />
        </mesh>
        <mesh position={[2.2, 1.1, 0.5]}>
          <coneGeometry args={[0.08, 0.22, 8, 1, true]} />
          <shaderMaterial uniforms={flameU.current} vertexShader={FLAME_VERT} fragmentShader={FLAME_FRAG}
            transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <pointLight color="#ff9933" intensity={1.8} distance={6} decay={2} position={[2.2, 1.2, 0.6]} />
      </group>

      {/* Prayer Pavilion — quiet shelter on east side */}
      <group position={[21, 0, 9]}>
        {/* 4 corner pillars */}
        {([-1.9, 1.9] as number[]).flatMap(x => ([-1.9, 1.9] as number[]).map(z => ({ x, z }))).map(({ x, z }, i) => (
          <mesh key={i} position={[x, 2.1, z]} castShadow>
            <cylinderGeometry args={[0.19, 0.24, 4.2, 11]} />
            <meshStandardMaterial {...stone} />
          </mesh>
        ))}
        {/* Flat roof slab */}
        <mesh position={[0, 4.4, 0]} castShadow>
          <boxGeometry args={[5.0, 0.38, 5.0]} />
          <meshStandardMaterial {...dark} />
        </mesh>
        {/* Canopy overhang */}
        <mesh position={[0, 4.60, 0]} castShadow>
          <boxGeometry args={[6.0, 0.18, 6.0]} />
          <meshStandardMaterial color="#c6b88e" roughness={0.82} metalness={0.04} />
        </mesh>
        {/* Central altar */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.58, 0.72, 1.1, 12]} />
          <meshStandardMaterial color="#d2ca9e" roughness={0.78} metalness={0.06} />
        </mesh>
        {/* Inner stone benches */}
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 1.35, 0.38, Math.sin(a) * 1.35]} castShadow>
            <boxGeometry args={[1.05, 0.18, 0.40]} />
            <meshStandardMaterial {...stone} />
          </mesh>
        ))}
        {/* Pavilion ambient glow */}
        <pointLight color="#ffcc88" intensity={1.8} distance={8} decay={2} position={[0, 3.9, 0]} />
      </group>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPR-031: ENHANCED CANDLE VARIETY — tall pillars, grouped clusters, bowls
══════════════════════════════════════════════════════════════════════════ */
const R_TALL = makeLCG(157);
const TALL_CANDLES = Array.from({ length: 24 }, () => {
  const a = R_TALL() * Math.PI * 2;
  const r = 5 + R_TALL() * 18;
  return {
    x: Math.cos(a) * r, z: Math.sin(a) * r,
    h: 0.7 + R_TALL() * 1.1,   // varied heights
    phase: R_TALL() * Math.PI * 2,
    wax: R_TALL() > 0.5 ? "#f0e8d8" : (R_TALL() > 0.25 ? "#fef6ee" : "#ffe8d0"),
  };
});

function AAATallCandleVariety() {
  const flameU = useRef({ uTime: { value: 0 }, uOffset: { value: 0 } });
  const lightRef1 = useRef<THREE.PointLight>(null!);
  const lightRef2 = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    flameU.current.uTime.value = t;
    if (lightRef1.current) lightRef1.current.intensity = 2.8 + Math.sin(t * 3.8) * 0.9;
    if (lightRef2.current) lightRef2.current.intensity = 2.4 + Math.sin(t * 4.2 + 1.1) * 0.8;
  });

  return (
    <>
      {/* Varied-height candles */}
      {TALL_CANDLES.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <mesh position={[0, c.h * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.055 + c.h * 0.02, 0.075 + c.h * 0.02, c.h, 8]} />
            <meshStandardMaterial color={c.wax} roughness={0.58} metalness={0.0} />
          </mesh>
          <mesh position={[0, c.h + 0.14, 0]}>
            <coneGeometry args={[0.075, 0.21, 8, 1, true]} />
            <shaderMaterial uniforms={flameU.current} vertexShader={FLAME_VERT} fragmentShader={FLAME_FRAG}
              transparent depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* Eternal flame bowls — 2 large focal points */}
      <group position={[8, 0, -6]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.38, 0.8, 12]} />
          <meshStandardMaterial color="#c4a850" roughness={0.55} metalness={0.45} />
        </mesh>
        <mesh position={[0, 1.04, 0]}>
          <sphereGeometry args={[0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.4} metalness={0.6}
            emissive={new THREE.Color("#8a6000")} emissiveIntensity={0.4} />
        </mesh>
        {/* Bowl flame */}
        <mesh position={[0, 1.28, 0]}>
          <coneGeometry args={[0.32, 0.68, 10, 1, true]} />
          <shaderMaterial uniforms={flameU.current} vertexShader={FLAME_VERT} fragmentShader={FLAME_FRAG}
            transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <pointLight ref={lightRef1} color="#ff8811" intensity={2.8} distance={10} decay={2} position={[0, 1.5, 0]} />
      </group>
      <group position={[-8, 0, 12]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.38, 0.8, 12]} />
          <meshStandardMaterial color="#c4a850" roughness={0.55} metalness={0.45} />
        </mesh>
        <mesh position={[0, 1.04, 0]}>
          <sphereGeometry args={[0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.4} metalness={0.6}
            emissive={new THREE.Color("#8a6000")} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 1.28, 0]}>
          <coneGeometry args={[0.32, 0.68, 10, 1, true]} />
          <shaderMaterial uniforms={flameU.current} vertexShader={FLAME_VERT} fragmentShader={FLAME_FRAG}
            transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <pointLight ref={lightRef2} color="#ff8811" intensity={2.4} distance={10} decay={2} position={[0, 1.5, 0]} />
      </group>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: SCENE CAMERA DRIVER — smooth scene-tab camera transitions
══════════════════════════════════════════════════════════════════════════ */
function AAASceneCameraDriver({ sceneView, ctrlRef }: {
  sceneView: SceneViewType;
  ctrlRef:   React.MutableRefObject<any>;
}) {
  const { camera } = useThree();
  const fromCam    = useRef(new THREE.Vector3(0, 4.2, 18));
  const toCam      = useRef(new THREE.Vector3(0, 4.2, 18));
  const fromTarget = useRef(new THREE.Vector3(0, 2.0, 0));
  const toTarget   = useRef(new THREE.Vector3(0, 2.0, 0));
  const progress   = useRef(1);
  const animating  = useRef(false);
  const prevView   = useRef<SceneViewType>(sceneView);

  useEffect(() => {
    if (sceneView === prevView.current) return;
    prevView.current = sceneView;
    const ctrl = ctrlRef.current;
    if (!ctrl) return;

    fromCam.current.copy(camera.position);
    fromTarget.current.copy(ctrl.target);
    const v = SCENE_VIEWS[sceneView];
    toCam.current.set(...v.cam);
    toTarget.current.set(...v.target);
    progress.current = 0;
    animating.current = true;
  }, [sceneView, camera, ctrlRef]);

  useFrame((_, delta) => {
    if (!animating.current || !ctrlRef.current) return;
    progress.current = Math.min(1, progress.current + delta * 0.75);
    /* Smooth cubic ease in-out */
    const t = progress.current * progress.current * (3 - 2 * progress.current);
    camera.position.lerpVectors(fromCam.current, toCam.current, t);
    ctrlRef.current.target.lerpVectors(fromTarget.current, toTarget.current, t);
    ctrlRef.current.update();
    if (progress.current >= 1) animating.current = false;
  });

  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   FULL SCENE
══════════════════════════════════════════════════════════════════════════ */
interface SceneProps {
  entries:        CommunityYahrzeitEntry[];
  placedCandles:  { pos: [number, number, number]; name: string }[];
  virtualFlowers: { pos: [number, number, number]; colorIdx: number }[];
  newCandlePos:   [number, number, number] | null;
  onGroundClick:  (pos: [number, number, number]) => void;
  onCandleClick:  (entry: CommunityYahrzeitEntry) => void;
  selectedId:     string | null;
  sceneView:      SceneViewType;
  cameraStateRef?: React.MutableRefObject<CameraState | null>;
}

function AAAValleyScene({ entries, placedCandles, virtualFlowers, newCandlePos, onGroundClick, onCandleClick, selectedId, sceneView, cameraStateRef }: SceneProps) {
  const litEntries   = useMemo(() => entries.slice(0, ENTRY_POSITIONS.length), [entries]);
  const fakeCtrlRef  = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);
  const particlesRef = useRef<FootstepPt[]>([]);

  return (
    <>
      <AAACamera />
      <FirstPersonController fakeCtrlRef={fakeCtrlRef} particlesRef={particlesRef} />
      <FootstepParticles particlesRef={particlesRef} />
      <AAAFocusCamera selectedId={selectedId} entries={litEntries} ctrlRef={fakeCtrlRef} sceneView={sceneView} />
      <AAASceneCameraDriver sceneView={sceneView} ctrlRef={fakeCtrlRef} />
      {cameraStateRef && <CameraStateTracker stateRef={cameraStateRef} ctrlRef={fakeCtrlRef} />}

      {/* ── Phase 3: Day/night sky dome (renders behind everything) ── */}
      <AAASkyDome />
      <AAAStarField />
      <AAAMoon />

      {/* ── Day/night lighting (replaces static GoldenHourLighting) ── */}
      <DayNightLighting />
      {/* SceneEnvironment: env map IBL only — AAASkyDome handles the sky visuals */}
      <SceneEnvironment fogColor="#d4a85a" fogDensity={0.007} envIntensity={0.55} showSky={false} />

      {/* Ground & terrain */}
      <AAATerrain />
      <AAAStonePathways />

      {/* Water */}
      <AAAWaterSystem />

      {/* Waterfalls */}
      <AAAWaterfall position={[-18, 3.8, -8]} height={5} width={2.5} />
      <AAAWaterfall position={[16, 3.2, 14]} height={4} width={2} />
      <AAAWaterfall position={[-4, 2.8, -20]} height={3.5} width={1.8} />

      {/* Bridges */}
      <AAABridge position={[-4.5, -0.15, 12]} span={7} rotation={0.15} />
      <AAABridge position={[4.5, -0.15, -6]} span={6} rotation={-0.12} />

      {/* SPR-031: Distant mountains — background depth */}
      <AAADistantMountains />

      {/* Architecture */}
      <AAAArchitecture />

      {/* SPR-031: Landmark — memorial gate at valley entrance */}
      <AAAMemorialGate />

      {/* SPR-031: Landmark — Tree of Remembrance */}
      <AAATreeOfRemembrance />

      {/* SPR-031: Weathered ruins and prayer pavilion */}
      <AAAMossRuins />

      {/* Trees */}
      <AAAOliveTrees />

      {/* SPR-031: Flowering trees — cherry/almond blossoms */}
      <AAAFloweringTrees />

      {/* SPR-031: Young saplings scattered organically */}
      <AAASaplings />

      {/* Phase 2: Mediterranean vegetation */}
      <AAAMediterraneanVegetation />

      {/* Benches */}
      <AAAStoneBenches />

      {/* SPR-031: Water lilies on the reflection pool */}
      <AAAWaterLilies />

      {/* Candle systems */}
      <AAAEternalAltar />
      <AAABackgroundCandles />

      {/* SPR-031: Tall pillar candles + eternal flame bowls */}
      <AAATallCandleVariety />

      {/* Per-memorial candles */}
      {litEntries.map((entry, i) => (
        <AAAEntryCandle
          key={entry.id}
          index={i}
          pos={ENTRY_POSITIONS[i]}
          entry={entry}
          animOffset={i * 0.38}
          onCandleClick={onCandleClick}
          highlighted={entry.id === selectedId}
        />
      ))}

      {/* User-placed candles */}
      {placedCandles.map((c, i) => (
        <AAAPlacedCandle key={`placed-${i}`} pos={c.pos} name={c.name} animOffset={i * 0.55 + 1.2} />
      ))}

      {/* New candle placement animation */}
      {newCandlePos && <AAANewCandleAnim pos={newCandlePos} />}

      {/* Virtual flowers placed by visitors */}
      <AAAVirtualFlowers flowers={virtualFlowers} />

      {/* Phase 3: God rays through tree canopy */}
      <AAAGodRays />

      {/* Atmosphere */}
      <AAAFloatingLanterns />
      <AAAGoldenDust />
      <AAAMovingClouds />

      {/* Phase 2: Pollen + dust motes */}
      <AAAPollenParticles />

      {/* ── Phase 3: Living sanctuary elements ── */}
      <AAABirdFlock />
      <AAAButterflies />
      <AAADriftingLeaves />
      <AAAGrassBlades />
      <AAACandleSmoke />

      {/* Phase 3: Waterfall mist at each waterfall base */}
      <AAAWaterfallMist position={[-18, 3.8, -8]} />
      <AAAWaterfallMist position={[16, 3.2, 14]} />
      <AAAWaterfallMist position={[-4, 2.8, -20]} />

      {/* Ground-level mist — volumetric fog layers */}
      <AAAGroundMist />

      {/* Ground click */}
      <GroundClickPlane onGroundClick={onGroundClick} />

      {/* First-person controls handled by FirstPersonController above */}

      {/* ── Phase 1 Foundation: post-processing pipeline (SPR-031: stronger bloom) ── */}
      <PostProcessingPipeline
        enableSMAA
        enableBloom
        enableSSAO={false}
        bloomIntensity={2.2}
        bloomThreshold={0.20}
      />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PHASE 3: CAMERA FOCUS — smooth pan to selected candle, returns home
══════════════════════════════════════════════════════════════════════════ */
const HOME_TARGET = new THREE.Vector3(0, 0, 4);

function AAAFocusCamera({ selectedId, entries, ctrlRef, sceneView }: {
  selectedId: string | null;
  entries:    CommunityYahrzeitEntry[];
  ctrlRef:    React.MutableRefObject<any>;
  sceneView:  SceneViewType;
}) {
  const { camera } = useThree();
  const animating  = useRef(false);
  const progress   = useRef(0);
  const fromTarget = useRef(new THREE.Vector3(0, 0, 4));
  const toTarget   = useRef(new THREE.Vector3(0, 0, 4));
  const fromCam    = useRef(new THREE.Vector3());
  const toCam      = useRef(new THREE.Vector3());

  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;

    fromTarget.current.copy(ctrl.target);
    fromCam.current.copy(camera.position);

    if (selectedId) {
      const idx = entries.findIndex(e => e.id === selectedId);
      if (idx >= 0 && idx < ENTRY_POSITIONS.length) {
        const [cx, cy, cz] = ENTRY_POSITIONS[idx];
        toTarget.current.set(cx, cy + 0.5, cz);
        /* Walk camera 3 units in front of the candle at eye height */
        const dx = camera.position.x - cx;
        const dz = camera.position.z - cz;
        const hd = Math.max(Math.sqrt(dx * dx + dz * dz), 0.01);
        toCam.current.set(
          cx + (dx / hd) * 3.2,
          terrainHeightAt(cx + (dx / hd) * 3.2, cz + (dz / hd) * 3.2) + 1.7,
          cz + (dz / hd) * 3.2,
        );
      }
    } else {
      const sceneTarget = SCENE_VIEWS[sceneView]?.target ?? [0, 0, 4];
      toTarget.current.set(...sceneTarget);
      const sv = SCENE_VIEWS[sceneView];
      if (sv) toCam.current.set(...sv.cam);
      else toCam.current.copy(camera.position);
    }
    progress.current = 0;
    animating.current = true;
  }, [selectedId, entries, ctrlRef, sceneView, camera]);

  useFrame((_, delta) => {
    if (!animating.current || !ctrlRef.current) return;
    progress.current = Math.min(1, progress.current + delta * 1.2);
    const t = progress.current * progress.current * (3 - 2 * progress.current);
    ctrlRef.current.target.lerpVectors(fromTarget.current, toTarget.current, t);
    /* Also walk the camera position toward the candle (FPS-friendly) */
    camera.position.x = THREE.MathUtils.lerp(fromCam.current.x, toCam.current.x, t);
    camera.position.z = THREE.MathUtils.lerp(fromCam.current.z, toCam.current.z, t);
    if (progress.current >= 1) animating.current = false;
  });

  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC EXPORT
══════════════════════════════════════════════════════════════════════════ */
export type { CameraState };

export interface MemorialValley3DProps {
  entries:        CommunityYahrzeitEntry[];
  placedCandles:  { pos: [number, number, number]; name: string }[];
  virtualFlowers: { pos: [number, number, number]; colorIdx: number }[];
  newCandlePos:   [number, number, number] | null;
  onGroundClick:  (pos: [number, number, number]) => void;
  onCandleClick:  (entry: CommunityYahrzeitEntry) => void;
  selectedId:     string | null;
  sceneView:      SceneViewType;
  cameraStateRef?: React.MutableRefObject<CameraState | null>;
}

export default function MemorialValley3D(props: MemorialValley3DProps) {
  return (
    <QualityProvider>
      <SceneFoundation fov={75}>
        <AAAValleyScene {...props} />
      </SceneFoundation>
    </QualityProvider>
  );
}
