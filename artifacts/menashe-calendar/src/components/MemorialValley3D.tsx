import { useRef, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Sky,
  Instances,
  Instance,
  Text,
} from "@react-three/drei";
import * as THREE from "three";
import type { CommunityYahrzeitEntry } from "../lib/userApi";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & WORLD CONFIG
───────────────────────────────────────────────────────────────────────────── */
const WORLD_HALF = 28;

const OLIVE_POSITIONS: [number, number][] = [
  [-18, -14], [-15, -10], [-20, -5], [-17, 2], [-19, 8], [-16, 14],
  [-22, -8], [-13, -18], [-11, -14], [-14, 6], [-20, 12], [-12, 16],
  [14, -18], [16, -12], [18, -6], [15, 2], [17, 8], [19, 14],
  [12, -14], [20, 4], [22, 10], [13, 16], [20, -2], [11, 18],
  [-6, -22], [0, -20], [6, -22], [-4, 20], [4, 22], [0, 24],
  [-8, 20], [8, 20], [-24, 0], [24, 0],
];

const STONE_PATH_SEGMENTS: { pos: [number, number, number]; size: [number, number, number] }[] = [
  { pos: [0, 0.05, 0], size: [3, 0.12, 20] },
  { pos: [0, 0.05, 0], size: [20, 0.12, 3] },
  { pos: [-8, 0.05, -4], size: [2.5, 0.12, 8] },
  { pos: [8, 0.05, 4], size: [2.5, 0.12, 8] },
  { pos: [-4, 0.05, 8], size: [8, 0.12, 2.5] },
  { pos: [4, 0.05, -8], size: [8, 0.12, 2.5] },
];

const MEMORIAL_ZONES: { pos: [number, number]; name: string; radius: number }[] = [
  { pos: [0, 0], name: "Eternal Light Court", radius: 5 },
  { pos: [-10, 0], name: "Tree of Life Grove", radius: 3.5 },
  { pos: [10, 0], name: "Valley of Peace", radius: 3.5 },
  { pos: [0, -10], name: "Memorial Garden", radius: 3.5 },
  { pos: [0, 10], name: "Jerusalem Outlook", radius: 3.5 },
];

/* ─────────────────────────────────────────────────────────────────────────────
   TERRAIN
───────────────────────────────────────────────────────────────────────────── */
function ValleyTerrain() {
  const mesh = useRef<THREE.Mesh>(null!);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WORLD_HALF * 2, WORLD_HALF * 2, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const edge = Math.max(0, (dist - 18) / 10);
      const noise =
        Math.sin(x * 0.18) * 0.5 +
        Math.cos(z * 0.22) * 0.5 +
        Math.sin(x * 0.45 + z * 0.33) * 0.25;
      const height = edge * 3.5 + noise * 0.3;
      pos.setY(i, height);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={mesh} geometry={geometry} receiveShadow>
      <meshLambertMaterial color="#5a7a42" />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GRASS PATCHES (detail layer)
───────────────────────────────────────────────────────────────────────────── */
function GrassPatches() {
  return (
    <>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <meshLambertMaterial color="#6a8f4a" />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 48]} />
        <meshLambertMaterial color="#7aaa55" />
      </mesh>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STONE PATHS
───────────────────────────────────────────────────────────────────────────── */
function StonePaths() {
  return (
    <>
      {STONE_PATH_SEGMENTS.map((seg, i) => (
        <mesh key={i} position={seg.pos} receiveShadow castShadow>
          <boxGeometry args={seg.size} />
          <meshLambertMaterial color="#b0a080" />
        </mesh>
      ))}
      {/* Path stones (individual) */}
      {Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        const r = 6 + (i % 3) * 0.3;
        return (
          <mesh key={`ps-${i}`} position={[Math.cos(angle) * r, 0.06, Math.sin(angle) * r]} receiveShadow>
            <boxGeometry args={[0.8, 0.1, 0.8]} />
            <meshLambertMaterial color="#998870" />
          </mesh>
        );
      })}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   OLIVE TREES (instanced for performance)
───────────────────────────────────────────────────────────────────────────── */
function OliveTrees() {
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.18, 1.8, 6), []);
  const canopy1Geo = useMemo(() => new THREE.SphereGeometry(1.1, 7, 6), []);
  const canopy2Geo = useMemo(() => new THREE.SphereGeometry(0.85, 6, 5), []);
  const canopy3Geo = useMemo(() => new THREE.SphereGeometry(0.65, 6, 5), []);

  return (
    <>
      <Instances geometry={trunkGeo} limit={OLIVE_POSITIONS.length}>
        <meshLambertMaterial color="#5a3a1a" />
        {OLIVE_POSITIONS.map(([x, z], i) => (
          <Instance key={i} position={[x, 0.9, z]} />
        ))}
      </Instances>
      <Instances geometry={canopy1Geo} limit={OLIVE_POSITIONS.length}>
        <meshLambertMaterial color="#3a6030" />
        {OLIVE_POSITIONS.map(([x, z], i) => (
          <Instance key={i} position={[x + (i % 3 - 1) * 0.1, 2.5 + (i % 4) * 0.15, z + (i % 2 - 0.5) * 0.1]} />
        ))}
      </Instances>
      <Instances geometry={canopy2Geo} limit={OLIVE_POSITIONS.length}>
        <meshLambertMaterial color="#4a7838" />
        {OLIVE_POSITIONS.map(([x, z], i) => (
          <Instance key={i} position={[x + (i % 2 - 0.5) * 0.5, 3.1 + (i % 3) * 0.12, z + (i % 3 - 1) * 0.4]} />
        ))}
      </Instances>
      <Instances geometry={canopy3Geo} limit={OLIVE_POSITIONS.length}>
        <meshLambertMaterial color="#5a8840" />
        {OLIVE_POSITIONS.map(([x, z], i) => (
          <Instance key={i} position={[x + (i % 3 - 1) * 0.3, 3.6 + (i % 2) * 0.2, z + (i % 2 - 0.5) * 0.3]} />
        ))}
      </Instances>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RIVER
───────────────────────────────────────────────────────────────────────────── */
function River() {
  const waterRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshLambertMaterial>(null!);

  useFrame(({ clock }) => {
    if (matRef.current) {
      const t = clock.getElapsedTime();
      matRef.current.color.setRGB(
        0.2 + Math.sin(t * 0.5) * 0.03,
        0.55 + Math.sin(t * 0.4) * 0.04,
        0.75 + Math.cos(t * 0.3) * 0.05
      );
    }
  });

  return (
    <group>
      {/* River bed */}
      <mesh position={[-13, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0.2]} receiveShadow>
        <planeGeometry args={[3.5, 38, 1, 1]} />
        <meshLambertMaterial color="#206080" opacity={0.85} transparent />
      </mesh>

      {/* Water surface shimmer */}
      <mesh ref={waterRef} position={[-13, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <planeGeometry args={[2.8, 36, 1, 1]} />
        <meshLambertMaterial ref={matRef} color="#3388bb" opacity={0.65} transparent />
      </mesh>

      {/* Riverbank stones */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-14.5 + (i % 3) * 0.5, 0.06, -16 + i * 2.5]} castShadow>
          <sphereGeometry args={[0.25 + (i % 3) * 0.1, 5, 4]} />
          <meshLambertMaterial color="#888070" />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   WATERFALL
───────────────────────────────────────────────────────────────────────────── */
function Waterfall() {
  const fallRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (fallRef.current) {
      const t = clock.getElapsedTime();
      const mat = fallRef.current.material as THREE.MeshLambertMaterial;
      mat.opacity = 0.55 + Math.sin(t * 2.5) * 0.15;
    }
  });

  return (
    <group position={[-13, 0, -24]}>
      {/* Rock face */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[4, 5, 2]} />
        <meshLambertMaterial color="#707060" />
      </mesh>
      <mesh position={[-1.5, 1.5, 0.5]} castShadow>
        <boxGeometry args={[2, 3, 1.5]} />
        <meshLambertMaterial color="#606050" />
      </mesh>
      {/* Falling water */}
      <mesh ref={fallRef} position={[0, 2.2, 0.9]}>
        <planeGeometry args={[2.5, 4.5, 1, 8]} />
        <meshLambertMaterial color="#88ccee" opacity={0.65} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* Splash pool */}
      <mesh position={[0, 0.12, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.2, 20]} />
        <meshLambertMaterial color="#4499cc" opacity={0.75} transparent />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   JERUSALEM DOME BUILDING
───────────────────────────────────────────────────────────────────────────── */
function JerusalemBuilding() {
  return (
    <group position={[0, 0, -16]}>
      {/* Main base platform */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 0.8, 10]} />
        <meshLambertMaterial color="#c8b888" />
      </mesh>

      {/* Main walls */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 3.6, 8]} />
        <meshLambertMaterial color="#d4c4a0" />
      </mesh>

      {/* Dome base cylinder */}
      <mesh position={[0, 4.8, 0]} castShadow>
        <cylinderGeometry args={[2.8, 3.2, 1.2, 16]} />
        <meshLambertMaterial color="#c8b480" />
      </mesh>

      {/* Golden dome */}
      <mesh position={[0, 6.2, 0]} castShadow>
        <sphereGeometry args={[2.6, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#D4AF37" emissive="#8a6800" emissiveIntensity={0.3} />
      </mesh>

      {/* Dome finial */}
      <mesh position={[0, 8.7, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.15, 1.2, 8]} />
        <meshLambertMaterial color="#D4AF37" emissive="#8a6800" emissiveIntensity={0.5} />
      </mesh>

      {/* Corner towers */}
      {[[-3, -3], [3, -3], [-3, 3], [3, 3]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.55, 0.65, 4, 10]} />
            <meshLambertMaterial color="#c0aa80" />
          </mesh>
          <mesh position={[0, 4.4, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.55, 0.8, 10]} />
            <meshLambertMaterial color="#b89a70" />
          </mesh>
          <mesh position={[0, 5.1, 0]}>
            <sphereGeometry args={[0.35, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color="#D4AF37" emissive="#8a6800" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* Arched entrance */}
      <group position={[0, 1.6, 4.1]}>
        <mesh castShadow>
          <boxGeometry args={[2.2, 3.2, 0.5]} />
          <meshLambertMaterial color="#e0d0b0" />
        </mesh>
        {/* Arch cutout (dark opening) */}
        <mesh position={[0, -0.3, 0.1]}>
          <boxGeometry args={[1.4, 2.2, 0.6]} />
          <meshLambertMaterial color="#2a1e0e" />
        </mesh>
        {/* Arch top (semi-circle approximated) */}
        <mesh position={[0, 0.85, 0.1]}>
          <cylinderGeometry args={[0.7, 0.7, 0.6, 12, 1, false, 0, Math.PI]} />
          <meshLambertMaterial color="#2a1e0e" />
        </mesh>
      </group>

      {/* Stone wall extensions */}
      {[-6, 6].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.5, 2.4, 6]} />
            <meshLambertMaterial color="#c8b888" />
          </mesh>
          <mesh position={[x, 2.5, 0]} castShadow>
            <boxGeometry args={[3.5, 0.4, 6.2]} />
            <meshLambertMaterial color="#b8a878" />
          </mesh>
          {/* Merlons */}
          {[-1.2, -0.4, 0.4, 1.2].map((dz, j) => (
            <mesh key={j} position={[x, 3, dz]} castShadow>
              <boxGeometry args={[3.5, 0.6, 0.45]} />
              <meshLambertMaterial color="#c0b080" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MEMORIAL ZONE CIRCLES
───────────────────────────────────────────────────────────────────────────── */
function MemorialZones() {
  return (
    <>
      {MEMORIAL_ZONES.map((zone, i) => (
        <group key={i} position={[zone.pos[0], 0, zone.pos[1]]}>
          {/* Stone floor circle */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
            <circleGeometry args={[zone.radius, 32]} />
            <meshLambertMaterial color={i === 0 ? "#c4b080" : "#a89870"} />
          </mesh>
          {/* Stone border ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[zone.radius - 0.15, zone.radius + 0.2, 32]} />
            <meshLambertMaterial color="#888060" />
          </mesh>
          {/* Small border stones */}
          {Array.from({ length: Math.round(zone.radius * 6) }, (_, j) => {
            const angle = (j / Math.round(zone.radius * 6)) * Math.PI * 2;
            return (
              <mesh key={j} position={[Math.cos(angle) * zone.radius, 0.1, Math.sin(angle) * zone.radius]} castShadow>
                <boxGeometry args={[0.3, 0.2, 0.3]} />
                <meshLambertMaterial color="#706850" />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ETERNAL FLAME (center altar)
───────────────────────────────────────────────────────────────────────────── */
function EternalAltar() {
  const flameRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (flameRef.current) {
      flameRef.current.scale.x = 0.85 + Math.sin(t * 3.1) * 0.18;
      flameRef.current.scale.z = 0.85 + Math.cos(t * 2.7) * 0.18;
      flameRef.current.scale.y = 0.9 + Math.sin(t * 2.2) * 0.12;
      flameRef.current.position.y = 2.05 + Math.sin(t * 4.5) * 0.06;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 2.2 + Math.sin(t * 3.5) * 0.8;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Altar base */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.8, 1.2, 12]} />
        <meshLambertMaterial color="#b8a878" />
      </mesh>
      {/* Altar top */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.3, 12]} />
        <meshLambertMaterial color="#c8b880" />
      </mesh>
      {/* Candle body */}
      <mesh position={[0, 1.75, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.9, 10]} />
        <meshLambertMaterial color="#f8f0e0" />
      </mesh>
      {/* Flame */}
      <mesh ref={flameRef} position={[0, 2.35, 0]}>
        <coneGeometry args={[0.18, 0.55, 8, 1, true]} />
        <meshLambertMaterial color="#ff8820" emissive="#ff5500" emissiveIntensity={1.5} transparent opacity={0.9} />
      </mesh>
      {/* Inner flame */}
      <mesh position={[0, 2.4, 0]}>
        <coneGeometry args={[0.1, 0.35, 6, 1, true]} />
        <meshLambertMaterial color="#ffdd44" emissive="#ffcc00" emissiveIntensity={2} transparent opacity={0.95} />
      </mesh>
      {/* Point light */}
      <pointLight ref={glowRef} position={[0, 2.5, 0]} color="#ff9922" intensity={2.5} distance={12} decay={2} castShadow />

      {/* Hebrew text plaque */}
      <Text
        position={[0, 0.25, 0.85]}
        fontSize={0.18}
        color="#D4AF37"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        נֵר תָּמִיד
      </Text>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MEMORIAL CANDLE
───────────────────────────────────────────────────────────────────────────── */
interface MemorialCandleProps {
  position: [number, number, number];
  name: string;
  onClick: () => void;
  animOffset: number;
}

function MemorialCandle({ position, name, onClick, animOffset }: MemorialCandleProps) {
  const flameRef = useRef<THREE.Mesh>(null!);
  const innerFlameRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + animOffset;
    if (flameRef.current) {
      flameRef.current.scale.x = 0.8 + Math.sin(t * 4.1) * 0.25;
      flameRef.current.scale.z = 0.8 + Math.cos(t * 3.7) * 0.25;
      flameRef.current.scale.y = 0.85 + Math.sin(t * 3.2) * 0.18;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 0.8 + Math.sin(t * 5.2) * 0.35;
    }
  });

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Invisible large hit area */}
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 1.5, 6]} />
        <meshLambertMaterial transparent opacity={0} />
      </mesh>
      {/* Wax body */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.44, 8]} />
        <meshLambertMaterial color="#f5eed5" />
      </mesh>
      {/* Flame */}
      <mesh ref={flameRef} position={[0, 0.55, 0]}>
        <coneGeometry args={[0.08, 0.22, 7, 1, true]} />
        <meshLambertMaterial color="#ff7722" emissive="#ff4400" emissiveIntensity={1.2} transparent opacity={0.88} />
      </mesh>
      <mesh ref={innerFlameRef} position={[0, 0.58, 0]}>
        <coneGeometry args={[0.045, 0.14, 6, 1, true]} />
        <meshLambertMaterial color="#ffee44" emissive="#ffcc00" emissiveIntensity={1.8} transparent opacity={0.92} />
      </mesh>
      {/* Point light */}
      <pointLight ref={lightRef} color="#ff9933" intensity={0.9} distance={4} decay={2} />
      {/* Name label */}
      <Text
        position={[0, 0.9, 0]}
        fontSize={0.13}
        color="#ffd977"
        anchorX="center"
        anchorY="bottom"
        maxWidth={1.8}
      >
        {name.length > 14 ? name.slice(0, 13) + "…" : name}
      </Text>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MEMORIAL STONES (scattered)
───────────────────────────────────────────────────────────────────────────── */
function MemorialStones() {
  const positions: [number, number, number][] = [
    [-2.5, 0.12, -2], [2, 0.12, -3], [-1.5, 0.12, 3], [3, 0.12, 2.5],
    [-3, 0.12, 0.5], [0.5, 0.12, -4], [-9, 0.12, -1.5], [9, 0.12, 1.5],
    [-0.5, 0.12, 9], [0.5, 0.12, -9],
  ];

  return (
    <>
      {positions.map((pos, i) => (
        <group key={i} position={pos} rotation={[0, (i * 0.9) % (Math.PI * 2), 0]}>
          {/* Stone base */}
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.7, 0.2]} />
            <meshLambertMaterial color="#9a8a70" />
          </mesh>
          {/* Stone top rounded */}
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 0.15, 8, 1, false, 0, Math.PI]} />
            <meshLambertMaterial color="#8a7a60" />
          </mesh>
          {/* Gold star */}
          <Text position={[0, 0.05, 0.11]} fontSize={0.18} color="#D4AF37" anchorX="center">
            ✦
          </Text>
        </group>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CLOUDS
───────────────────────────────────────────────────────────────────────────── */
function MovingClouds() {
  const cloud1 = useRef<THREE.Group>(null!);
  const cloud2 = useRef<THREE.Group>(null!);
  const cloud3 = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (cloud1.current) cloud1.current.position.x = -30 + ((t * 1.2) % 80);
    if (cloud2.current) cloud2.current.position.x = -30 + ((t * 0.8 + 30) % 80);
    if (cloud3.current) cloud3.current.position.x = -30 + ((t * 1.5 + 55) % 80);
  });

  const CloudMesh = ({ scale, opacity }: { scale: number; opacity: number }) => (
    <group>
      <mesh>
        <sphereGeometry args={[1.8 * scale, 10, 8]} />
        <meshLambertMaterial color="white" transparent opacity={opacity} />
      </mesh>
      <mesh position={[1.5 * scale, -0.3 * scale, 0]}>
        <sphereGeometry args={[1.4 * scale, 10, 8]} />
        <meshLambertMaterial color="white" transparent opacity={opacity} />
      </mesh>
      <mesh position={[-1.5 * scale, -0.2 * scale, 0]}>
        <sphereGeometry args={[1.2 * scale, 10, 8]} />
        <meshLambertMaterial color="white" transparent opacity={opacity} />
      </mesh>
      <mesh position={[0.7 * scale, 0.8 * scale, 0]}>
        <sphereGeometry args={[1.1 * scale, 10, 8]} />
        <meshLambertMaterial color="white" transparent opacity={opacity} />
      </mesh>
    </group>
  );

  return (
    <>
      <group ref={cloud1} position={[-30, 16, -10]}>
        <CloudMesh scale={1.2} opacity={0.82} />
      </group>
      <group ref={cloud2} position={[-30, 18, 5]}>
        <CloudMesh scale={0.9} opacity={0.65} />
      </group>
      <group ref={cloud3} position={[-30, 14, -20]}>
        <CloudMesh scale={1.5} opacity={0.72} />
      </group>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DYNAMIC SUN LIGHTING
───────────────────────────────────────────────────────────────────────────── */
function DynamicLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.04;
    if (sunRef.current) {
      sunRef.current.position.x = Math.cos(t) * 30;
      sunRef.current.position.y = 20 + Math.sin(t) * 8;
      sunRef.current.position.z = Math.sin(t) * 15;
      const warmth = 0.85 + Math.sin(t) * 0.15;
      sunRef.current.color.setRGB(1.0, warmth * 0.88, warmth * 0.7);
    }
  });

  return (
    <>
      <ambientLight color="#f5e0a0" intensity={0.65} />
      <directionalLight
        ref={sunRef}
        color="#ffe8a0"
        intensity={1.8}
        position={[20, 28, 10]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {/* Golden fill light from below for warm atmosphere */}
      <pointLight color="#D4AF37" intensity={0.4} position={[0, -2, 0]} distance={40} />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GOLDEN PARTICLE DUST
───────────────────────────────────────────────────────────────────────────── */
function GoldenDust() {
  const count = 80;
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 40,
      y: Math.random() * 8 + 0.5,
      z: (Math.random() - 0.5) * 40,
      speed: 0.2 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    })), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * 0.3 + p.phase) * 0.5,
        p.y + Math.sin(t * p.speed + p.phase) * 0.6,
        p.z + Math.cos(t * 0.25 + p.phase) * 0.5
      );
      dummy.scale.setScalar(0.04 + Math.sin(t * p.speed + p.phase) * 0.015);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshLambertMaterial color="#D4AF37" emissive="#aa8800" emissiveIntensity={1.2} transparent opacity={0.65} />
    </instancedMesh>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GROUND CLICK HANDLER
───────────────────────────────────────────────────────────────────────────── */
interface GroundClickPlaneProps {
  onGroundClick: (pos: [number, number, number]) => void;
}

function GroundClickPlane({ onGroundClick }: GroundClickPlaneProps) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.03, 0]}
      onClick={(e) => {
        e.stopPropagation();
        const { x, y, z } = e.point;
        onGroundClick([x, y + 0.12, z]);
      }}
    >
      <planeGeometry args={[WORLD_HALF * 2, WORLD_HALF * 2]} />
      <meshLambertMaterial transparent opacity={0} />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CAMERA SETUP (isometric-style)
───────────────────────────────────────────────────────────────────────────── */
function IsometricCamera() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(22, 22, 22);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SCENE WRAPPER
───────────────────────────────────────────────────────────────────────────── */
interface SceneProps {
  entries: CommunityYahrzeitEntry[];
  placedCandles: { pos: [number, number, number]; name: string }[];
  onGroundClick: (pos: [number, number, number]) => void;
  onCandleClick: (entry: CommunityYahrzeitEntry) => void;
}

function ValleyScene({ entries, placedCandles, onGroundClick, onCandleClick }: SceneProps) {
  const CANDLE_SPREAD_POSITIONS = useMemo(() => {
    const positions: [number, number, number][] = [];
    MEMORIAL_ZONES.forEach((zone, zi) => {
      const count = zi === 0 ? 12 : 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + zi * 0.4;
        const r = zone.radius * (0.35 + (i % 3) * 0.2);
        positions.push([
          zone.pos[0] + Math.cos(angle) * r,
          0.15,
          zone.pos[1] + Math.sin(angle) * r,
        ]);
      }
    });
    return positions;
  }, []);

  const litCandles = useMemo(() => {
    return entries.slice(0, CANDLE_SPREAD_POSITIONS.length).map((entry, i) => ({
      entry,
      pos: CANDLE_SPREAD_POSITIONS[i],
    }));
  }, [entries, CANDLE_SPREAD_POSITIONS]);

  return (
    <>
      <IsometricCamera />
      <DynamicLighting />
      <fog attach="fog" args={["#e8d8b0", 45, 90]} />

      {/* Sky */}
      <Sky
        distance={450}
        sunPosition={[1, 0.4, 0.2]}
        inclination={0.5}
        azimuth={0.25}
        turbidity={6}
        rayleigh={0.8}
        mieCoefficient={0.005}
        mieDirectionalG={0.85}
      />

      {/* World */}
      <ValleyTerrain />
      <GrassPatches />
      <StonePaths />
      <OliveTrees />
      <MemorialZones />
      <MemorialStones />
      <River />
      <Waterfall />
      <JerusalemBuilding />
      <EternalAltar />
      <MovingClouds />
      <GoldenDust />

      {/* Candles from database entries */}
      {litCandles.map(({ entry, pos }, i) => (
        <MemorialCandle
          key={entry.id}
          position={pos}
          name={entry.deceasedName.split("·")[0].trim()}
          animOffset={i * 0.37}
          onClick={() => onCandleClick(entry)}
        />
      ))}

      {/* User-placed candles */}
      {placedCandles.map((c, i) => (
        <MemorialCandle
          key={`placed-${i}`}
          position={c.pos}
          name={c.name}
          animOffset={i * 0.55 + 1.1}
          onClick={() => {}}
        />
      ))}

      {/* Ground click handler */}
      <GroundClickPlane onGroundClick={onGroundClick} />

      {/* Isometric orbit controls */}
      <OrbitControls
        enableRotate={false}
        enablePan={true}
        enableZoom={true}
        panSpeed={1.2}
        zoomSpeed={0.9}
        minDistance={8}
        maxDistance={55}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.PAN,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        maxPolarAngle={Math.PI / 2.8}
        minPolarAngle={Math.PI / 5}
        target={[0, 0, 0]}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
interface MemorialValley3DProps {
  entries: CommunityYahrzeitEntry[];
  onCandleClick: (entry: CommunityYahrzeitEntry) => void;
  onGroundClick: (pos: [number, number, number]) => void;
  placedCandles: { pos: [number, number, number]; name: string }[];
}

export default function MemorialValley3D({
  entries,
  onCandleClick,
  onGroundClick,
  placedCandles,
}: MemorialValley3DProps) {
  return (
    <Canvas
      shadows
      camera={{ fov: 45, near: 0.5, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <Suspense fallback={null}>
        <ValleyScene
          entries={entries}
          placedCandles={placedCandles}
          onGroundClick={onGroundClick}
          onCandleClick={onCandleClick}
        />
      </Suspense>
    </Canvas>
  );
}
