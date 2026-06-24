import { useRef, useMemo, useEffect, Suspense, useCallback } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import {
  OrbitControls, Sky, Instances, Instance, Text, Environment,
} from "@react-three/drei";
import { EffectComposer, Bloom, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import type { CommunityYahrzeitEntry } from "../lib/userApi";

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
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
    vec3 sky = mix(vec3(0.55, 0.72, 0.92), vec3(0.98, 0.75, 0.35), 0.35);
    vec2 flow = vUv + vec2(uTime * 0.04, uTime * 0.02);
    float pattern = sin(flow.x * 12.0) * sin(flow.y * 8.0) * 0.03;
    vec3 col = mix(uDeep, uShallow, fresnel + pattern);
    col = mix(col, sky, fresnel * 0.55);
    float foam = smoothstep(0.88, 1.0, abs(sin(vUv.x * 22.0 + uTime) * sin(vUv.y * 18.0 + uTime * 0.7)));
    col = mix(col, vec3(0.92, 0.96, 1.0), foam * 0.18);
    gl_FragColor = vec4(col, 0.86 + fresnel * 0.12);
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

/* ══════════════════════════════════════════════════════════════════════════
   AAA LIGHTING — Golden hour with warm hemisphere + moving sun
══════════════════════════════════════════════════════════════════════════ */
function AAALighting() {
  const sunRef  = useRef<THREE.DirectionalLight>(null!);
  const fillRef = useRef<THREE.DirectionalLight>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.025;
    if (sunRef.current) {
      sunRef.current.position.set(Math.cos(t) * 40, 22 + Math.sin(t * 0.7) * 6, Math.sin(t) * 22);
      const warm = 0.78 + Math.sin(t * 2.2) * 0.12;
      sunRef.current.color.setRGB(1.0, warm * 0.78, warm * 0.52);
      sunRef.current.intensity = 1.8 + Math.sin(t * 1.4) * 0.3;
    }
  });
  return (
    <>
      <hemisphereLight args={["#ffd5a0", "#2d4a22", 0.65]} />
      <directionalLight
        ref={sunRef} color="#ffcc77" intensity={2.2}
        position={[28, 24, 14]} castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={120} shadow-camera-left={-55}
        shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55}
        shadow-bias={-0.0005}
      />
      <directionalLight ref={fillRef} color="#7ab8d4" intensity={0.35} position={[-20, 10, -15]} />
      <pointLight color="#ff9944" intensity={0.6} position={[0, -0.5, 0]} distance={70} />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AAA TERRAIN — Terraced Jerusalem hills
══════════════════════════════════════════════════════════════════════════ */
function AAATerrain() {
  const mainGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(100, 100, 128, 128);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position!;
    const r = makeLCG(3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const d = Math.sqrt(x * x + z * z);
      // terraced hills
      const terrace = Math.floor(d / 8) * 0.55;
      const blend = (d / 8 - Math.floor(d / 8));
      const smoothStep = blend * blend * (3 - 2 * blend);
      const rim = Math.max(0, (d - 18) / 14);
      const noise = Math.sin(x * 0.11) * 0.6 + Math.cos(z * 0.15) * 0.5
                  + Math.sin(x * 0.33 + z * 0.25) * 0.3
                  + Math.sin(x * 0.72 - z * 0.58) * 0.15;
      const h = terrace + smoothStep * 0.55 + rim * 5.5 + noise * 0.4 + r() * 0.12;
      // river valley cut
      const riverDist = Math.abs(x + 4) < 3.5 ? (3.5 - Math.abs(x + 4)) / 3.5 : 0;
      pos.setY(i, h - riverDist * 1.2);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <>
      {/* Main terrain */}
      <mesh geometry={mainGeo} receiveShadow>
        <meshStandardMaterial color="#7a8c5a" roughness={0.92} metalness={0.0} />
      </mesh>
      {/* Center sacred ground — lighter stone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4]} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <meshStandardMaterial color="#a09070" roughness={0.88} metalness={0.02} />
      </mesh>
      {/* Inner grass terrace */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 4]} receiveShadow>
        <circleGeometry args={[15, 48]} />
        <meshStandardMaterial color="#8aaa60" roughness={0.85} metalness={0.0} />
      </mesh>
      {/* Terrace walls */}
      {[8, 14, 20].map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01 + i * 0.55, 4]}>
          <ringGeometry args={[r, r + 0.5, 64]} />
          <meshStandardMaterial color="#c8b890" roughness={0.82} metalness={0.05} />
        </mesh>
      ))}
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
   OLIVE TREES — mature, multi-layered canopy
══════════════════════════════════════════════════════════════════════════ */
function AAAOliveTrees() {
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.26, 2.8, 8), []);
  const canopy1  = useMemo(() => new THREE.SphereGeometry(1.5, 9, 7), []);
  const canopy2  = useMemo(() => new THREE.SphereGeometry(1.2, 9, 6), []);
  const canopy3  = useMemo(() => new THREE.SphereGeometry(0.9, 8, 6), []);

  return (
    <>
      <Instances geometry={trunkGeo} limit={TREE_POS.length}>
        <meshStandardMaterial color="#4a3018" roughness={0.95} metalness={0.02} />
        {TREE_POS.map(([x, z], i) => <Instance key={i} position={[x, 1.4, z]} />)}
      </Instances>
      <Instances geometry={canopy1} limit={TREE_POS.length}>
        <meshStandardMaterial color="#3d5e28" roughness={0.88} metalness={0.0} />
        {TREE_POS.map(([x, z], i) => <Instance key={i} position={[x, 3.8 + (i % 3) * 0.2, z]} />)}
      </Instances>
      <Instances geometry={canopy2} limit={TREE_POS.length}>
        <meshStandardMaterial color="#4d7032" roughness={0.85} metalness={0.0} />
        {TREE_POS.map(([x, z], i) => <Instance key={i} position={[x + (i % 3 - 1) * 0.6, 4.6 + (i % 4) * 0.15, z + (i % 2 - 0.5) * 0.6]} />)}
      </Instances>
      <Instances geometry={canopy3} limit={TREE_POS.length}>
        <meshStandardMaterial color="#5e8240" roughness={0.84} metalness={0.0} />
        {TREE_POS.map(([x, z], i) => <Instance key={i} position={[x + (i % 2 - 0.5) * 0.8, 5.3 + (i % 3) * 0.2, z + (i % 3 - 1) * 0.5]} />)}
      </Instances>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STONE PATHWAYS — detailed limestone paths
══════════════════════════════════════════════════════════════════════════ */
function AAAStonePathways() {
  const pathMat = <meshStandardMaterial color="#cfc5a8" roughness={0.84} metalness={0.04} />;
  const cobbleMat = <meshStandardMaterial color="#b8ad98" roughness={0.88} metalness={0.04} />;

  return (
    <>
      {/* Main cross paths */}
      <mesh position={[0, 0.08, 4]} receiveShadow>
        <boxGeometry args={[3.2, 0.1, 34]} />{pathMat}
      </mesh>
      <mesh position={[0, 0.08, 4]} receiveShadow>
        <boxGeometry args={[34, 0.1, 3.2]} />{pathMat}
      </mesh>
      {/* Diagonal paths */}
      {[45, -45].map((deg, i) => (
        <mesh key={i} position={[0, 0.07, 4]} rotation={[0, (deg * Math.PI) / 180, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.09, 28]} />{cobbleMat}
        </mesh>
      ))}
      {/* Circular path around pool */}
      {Array.from({ length: 56 }, (_, i) => {
        const a = (i / 56) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 7.5, 0.09, Math.sin(a) * 10.5 + 4]} receiveShadow>
            <boxGeometry args={[0.85, 0.1, 0.52]} />
            <meshStandardMaterial color="#cac0a8" roughness={0.84} metalness={0.04} />
          </mesh>
        );
      })}
      {/* Stone edging */}
      {Array.from({ length: 32 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 8.5, 0.12, Math.sin(a) * 11.5 + 4]} receiveShadow>
            <boxGeometry args={[0.4, 0.22, 0.4]} />
            <meshStandardMaterial color="#b0a898" roughness={0.85} metalness={0.04} />
          </mesh>
        );
      })}
      {/* Terrace step edges */}
      {[8.5, 14.5, 20.5].map((r, i) => (
        Array.from({ length: 40 }, (_, j) => {
          const a = (j / 40) * Math.PI * 2;
          return (
            <mesh key={`${i}-${j}`} position={[Math.cos(a) * r, 0.14 + i * 0.55, Math.sin(a) * r + 4]}>
              <boxGeometry args={[0.7, 0.25, 0.42]} />
              <meshStandardMaterial color="#c8bda8" roughness={0.82} metalness={0.05} />
            </mesh>
          );
        })
      ))}
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
      <pointLight ref={lightRef} position={[0, 3.2, 0]} color="#ff8822" intensity={5.0} distance={18} decay={2} castShadow />
      <Text position={[0, 0.4, 1.95]} fontSize={0.22} color="#D4AF37" anchorX="center">
        נֵר תָּמִיד
      </Text>
    </group>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ENTRY CANDLE — interactive per-memorial candle
══════════════════════════════════════════════════════════════════════════ */
function AAAEntryCandle({ pos, entry, animOffset, onCandleClick, highlighted }: {
  pos: [number, number, number]; entry: CommunityYahrzeitEntry;
  animOffset: number; onCandleClick: (e: CommunityYahrzeitEntry) => void; highlighted: boolean;
}) {
  const flameUniforms = useRef({ uTime: { value: 0 }, uOffset: { value: animOffset } });
  const lightRef = useRef<THREE.PointLight>(null!);
  const grpRef   = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    flameUniforms.current.uTime.value = clock.getElapsedTime();
    if (lightRef.current) lightRef.current.intensity = 1.2 + Math.sin(clock.getElapsedTime() * 5.5 + animOffset) * 0.55;
    if (grpRef.current && highlighted) grpRef.current.position.y = pos[1] + Math.sin(clock.getElapsedTime() * 2.1) * 0.05;
  });

  const shortName = entry.deceasedName.split("·")[0].trim();

  return (
    <group ref={grpRef} position={pos} onClick={e => { e.stopPropagation(); onCandleClick(entry); }}>
      <mesh>
        <cylinderGeometry args={[0.7, 0.7, 1.8, 8]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
      {highlighted && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.6, 24]} />
          <meshStandardMaterial color="#D4AF37" emissive={new THREE.Color("#D4AF37")} emissiveIntensity={2.5} transparent opacity={0.8} />
        </mesh>
      )}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.56, 10]} />
        <meshStandardMaterial color="#f5edd0" roughness={0.55} metalness={0} />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <coneGeometry args={[0.1, 0.28, 10, 1, true]} />
        <shaderMaterial
          uniforms={flameUniforms.current}
          vertexShader={FLAME_VERT}
          fragmentShader={FLAME_FRAG}
          transparent depthWrite={false} side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight ref={lightRef} color="#ff9933" intensity={1.4} distance={5} decay={2} />
      <Text position={[0, 1.08, 0]} fontSize={0.13} color="#ffd988" anchorX="center" maxWidth={2.2}>
        {shortName.length > 16 ? shortName.slice(0, 15) + "…" : shortName}
      </Text>
    </group>
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
  const grpRefs = useRef<THREE.Group[]>([]);
  const matRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const posRef  = useRef(LANTERNS.map(d => ({ x: d.x, y: d.startY, z: d.z })));

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    LANTERNS.forEach((d, i) => {
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
      {LANTERNS.map((d, i) => (
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
          <pointLight color="#ffaa33" intensity={1.2} distance={5.5} decay={2} />
        </group>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GOLDEN DUST PARTICLES
══════════════════════════════════════════════════════════════════════════ */
function AAAGoldenDust() {
  const n    = 150;
  const ref  = useRef<THREE.InstancedMesh>(null!);
  const dum  = useMemo(() => new THREE.Object3D(), []);
  const pts  = useMemo(() => {
    const r = makeLCG(77);
    return Array.from({ length: n }, () => ({ x: (r()-0.5)*55, y: r()*14+0.5, z: (r()-0.5)*55, sp: 0.15+r()*0.32, ph: r()*Math.PI*2 }));
  }, []);

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
  const ref0 = useRef<THREE.Group>(null!);
  const ref1 = useRef<THREE.Group>(null!);
  const ref2 = useRef<THREE.Group>(null!);
  const ref3 = useRef<THREE.Group>(null!);
  const cloudData = [
    { r: ref0, y: 22, z: -12, speed: 1.0, scale: 1.4 },
    { r: ref1, y: 25, z: 8,   speed: 0.7, scale: 1.1 },
    { r: ref2, y: 19, z: -28, speed: 1.3, scale: 1.7 },
    { r: ref3, y: 21, z: 18,  speed: 0.85, scale: 0.9 },
  ];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    cloudData.forEach(d => {
      if (d.r.current) d.r.current.position.x = -40 + ((t * d.speed * 0.75) % 100);
    });
  });

  const Cloud = ({ scale, opacity }: { scale: number; opacity: number }) => {
    const m = <meshStandardMaterial color="white" transparent opacity={opacity} roughness={1} metalness={0} />;
    return (
      <group>
        <mesh scale={scale}><sphereGeometry args={[2.4, 10, 8]} />{m}</mesh>
        <mesh position={[2.2*scale, -0.5*scale, 0]} scale={scale}><sphereGeometry args={[1.8, 10, 8]} />{m}</mesh>
        <mesh position={[-2.2*scale, -0.4*scale, 0]} scale={scale}><sphereGeometry args={[1.5, 9, 7]} />{m}</mesh>
        <mesh position={[0.8*scale, 1.1*scale, 0]} scale={scale}><sphereGeometry args={[1.4, 9, 7]} />{m}</mesh>
        <mesh position={[-0.6*scale, 0.9*scale, 0.5*scale]} scale={scale*0.75}><sphereGeometry args={[1.2, 8, 6]} />{m}</mesh>
      </group>
    );
  };

  return (
    <>
      {cloudData.map((d, i) => (
        <group key={i} ref={d.r} position={[-40, d.y, d.z]}>
          <Cloud scale={d.scale} opacity={0.72} />
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
  useEffect(() => { camera.position.set(22, 28, 22); camera.lookAt(0, 0, 4); }, [camera]);
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   GROUND CLICK PLANE
══════════════════════════════════════════════════════════════════════════ */
function GroundClickPlane({ onGroundClick }: { onGroundClick: (pos: [number, number, number]) => void }) {
  return (
    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}
      onClick={e => { e.stopPropagation(); const { x, y, z } = e.point; onGroundClick([x, y + 0.15, z]); }}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial transparent opacity={0} />
    </mesh>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   POST-PROCESSING
══════════════════════════════════════════════════════════════════════════ */
function AAAPostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        intensity={1.6}
        luminanceThreshold={0.28}
        luminanceSmoothing={0.85}
        mipmapBlur
        blendFunction={BlendFunction.ADD}
      />
    </EffectComposer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FULL SCENE
══════════════════════════════════════════════════════════════════════════ */
interface SceneProps {
  entries:       CommunityYahrzeitEntry[];
  placedCandles: { pos: [number, number, number]; name: string }[];
  onGroundClick: (pos: [number, number, number]) => void;
  onCandleClick: (entry: CommunityYahrzeitEntry) => void;
  selectedId:    string | null;
}

function AAAValleyScene({ entries, placedCandles, onGroundClick, onCandleClick, selectedId }: SceneProps) {
  const litEntries = useMemo(() => entries.slice(0, ENTRY_POSITIONS.length), [entries]);

  return (
    <>
      <AAACamera />
      <AAALighting />

      {/* Atmospheric golden-hour sky */}
      <Sky distance={450} sunPosition={[0.72, 0.28, 0.12]}
        turbidity={5.5} rayleigh={1.2}
        mieCoefficient={0.008} mieDirectionalG={0.88}
        inclination={0.51} azimuth={0.24}
      />

      {/* Exp2 fog for depth/atmosphere */}
      <fog attach="fog" args={["#e8c880", 55, 110]} />

      {/* Environment light for ambient PBR reflections */}
      <Environment preset="sunset" background={false} />

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

      {/* Architecture */}
      <AAAArchitecture />

      {/* Trees */}
      <AAAOliveTrees />

      {/* Benches */}
      <AAAStoneBenches />

      {/* Candle systems */}
      <AAAEternalAltar />
      <AAABackgroundCandles />

      {/* Per-memorial candles */}
      {litEntries.map((entry, i) => (
        <AAAEntryCandle
          key={entry.id}
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

      {/* Atmosphere */}
      <AAAFloatingLanterns />
      <AAAGoldenDust />
      <AAAMovingClouds />

      {/* Ground click */}
      <GroundClickPlane onGroundClick={onGroundClick} />

      {/* Camera controls */}
      <OrbitControls
        enableRotate={false} enablePan={true} enableZoom={true}
        panSpeed={1.4} zoomSpeed={0.9}
        minDistance={8} maxDistance={65}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
        maxPolarAngle={Math.PI / 2.5} minPolarAngle={Math.PI / 5.8}
        target={[0, 0, 4]}
      />

      {/* Post-processing */}
      <AAAPostProcessing />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC EXPORT
══════════════════════════════════════════════════════════════════════════ */
export interface MemorialValley3DProps {
  entries:       CommunityYahrzeitEntry[];
  placedCandles: { pos: [number, number, number]; name: string }[];
  onGroundClick: (pos: [number, number, number]) => void;
  onCandleClick: (entry: CommunityYahrzeitEntry) => void;
  selectedId:    string | null;
}

export default function MemorialValley3D(props: MemorialValley3DProps) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      camera={{ fov: 44, near: 0.3, far: 250 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      dpr={[1, 1.5]}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <Suspense fallback={null}>
        <AAAValleyScene {...props} />
      </Suspense>
    </Canvas>
  );
}
