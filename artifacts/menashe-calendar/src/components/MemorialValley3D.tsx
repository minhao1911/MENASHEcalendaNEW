import { useRef, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sky, Instances, Instance, Text } from "@react-three/drei";
import * as THREE from "three";
import type { CommunityYahrzeitEntry } from "../lib/userApi";

/* ─── LCG seeded random (deterministic layouts) ─────────────────────────── */
function makeLCG(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/* ─── Generate 220 background candle positions ──────────────────────────── */
function genCandlePositions(n: number): [number, number, number][] {
  const r = makeLCG(7);
  const positions: [number, number, number][] = [];
  const rings = [
    { count: 32, rMin: 7.5, rMax: 9.5 },
    { count: 55, rMin: 11,   rMax: 15  },
    { count: 65, rMin: 16,   rMax: 22  },
    { count: 48, rMin: 23,   rMax: 30  },
    { count: 20, rMin: 5.5,  rMax: 7   },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.count && positions.length < n; i++) {
      const ang  = r() * Math.PI * 2;
      const rad  = ring.rMin + r() * (ring.rMax - ring.rMin);
      const jx   = (r() - 0.5) * 1.4;
      const jz   = (r() - 0.5) * 1.4;
      const x = Math.cos(ang) * rad + jx;
      const z = Math.sin(ang) * rad + jz;
      /* skip pool area */
      if (Math.abs(x) < 5.5 && Math.abs(z) < 8.5) continue;
      positions.push([x, 0, z]);
    }
  }
  return positions;
}

const CANDLE_POSITIONS = genCandlePositions(220);

/* ─── Lantern positions ──────────────────────────────────────────────────── */
function genLanternData(n: number) {
  const r = makeLCG(99);
  return Array.from({ length: n }, () => ({
    x:     (r() - 0.5) * 44,
    startY: r() * 10 + 0.5,
    z:     (r() - 0.5) * 44,
    speed: 0.35 + r() * 0.55,
    drift: (r() - 0.5) * 0.12,
    phase: r() * Math.PI * 2,
  }));
}
const LANTERN_DATA = genLanternData(24);

/* ─── Tree positions ─────────────────────────────────────────────────────── */
function genTreePositions(n: number): [number, number][] {
  const r = makeLCG(17);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const ang = r() * Math.PI * 2;
    const rad = 18 + r() * 16;
    out.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
  }
  return out;
}
const TREE_POSITIONS = genTreePositions(55);

/* ─── TERRAIN ────────────────────────────────────────────────────────────── */
function SanctuaryTerrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(70, 70, 80, 80);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position!;
    const r = makeLCG(3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const d = Math.sqrt(x * x + z * z);
      const rim = Math.max(0, (d - 22) / 12);
      const noise = Math.sin(x * 0.14) * 0.4 + Math.cos(z * 0.19) * 0.4 +
                    Math.sin(x * 0.38 + z * 0.29) * 0.2;
      pos.setY(i, rim * 4 + noise * 0.35 + r() * 0.08);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <>
      <mesh geometry={geo} receiveShadow>
        <meshLambertMaterial color="#6b8f55" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[25, 64]} />
        <meshLambertMaterial color="#7daa60" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshLambertMaterial color="#8dc46a" />
      </mesh>
    </>
  );
}

/* ─── WHITE STONE PATHS ──────────────────────────────────────────────────── */
function WhiteStonePaths() {
  return (
    <>
      {/* Main cross paths */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[2.8, 0.1, 24]} />
        <meshLambertMaterial color="#e8e2d8" />
      </mesh>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[24, 0.1, 2.8]} />
        <meshLambertMaterial color="#e8e2d8" />
      </mesh>
      {/* Diagonal paths */}
      {[45, -45].map((deg, i) => (
        <mesh key={i} position={[0, 0.055, 0]} rotation={[0, (deg * Math.PI) / 180, 0]} receiveShadow>
          <boxGeometry args={[2.2, 0.09, 22]} />
          <meshLambertMaterial color="#ddd8cc" />
        </mesh>
      ))}
      {/* Circular path around pool */}
      {Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 9, 0.07, Math.sin(a) * 9]} receiveShadow>
            <boxGeometry args={[0.9, 0.1, 0.55]} />
            <meshLambertMaterial color="#ccc8bc" />
          </mesh>
        );
      })}
      {/* Path edge stones */}
      {Array.from({ length: 28 }, (_, i) => {
        const t = (i / 28) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(t) * 10.2, 0.1, Math.sin(t) * 10.2]} receiveShadow>
            <boxGeometry args={[0.35, 0.18, 0.35]} />
            <meshLambertMaterial color="#b8b4a8" />
          </mesh>
        );
      })}
    </>
  );
}

/* ─── REFLECTION POOL ────────────────────────────────────────────────────── */
function ReflectionPool() {
  const waterRef  = useRef<THREE.Mesh>(null!);
  const shineRef  = useRef<THREE.Mesh>(null!);
  const matRef    = useRef<THREE.MeshLambertMaterial>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) {
      const wave = Math.sin(t * 0.55) * 0.06;
      matRef.current.color.setRGB(0.22 + wave, 0.50 + wave * 0.5, 0.72 + wave * 0.3);
    }
    if (shineRef.current) {
      shineRef.current.rotation.z = t * 0.08;
      const m = shineRef.current.material as THREE.MeshLambertMaterial;
      m.opacity = 0.18 + Math.sin(t * 1.2) * 0.07;
    }
  });

  return (
    <group>
      {/* Pool basin rim – oval stone border */}
      <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.0, 1.55, 1]}>
        <ringGeometry args={[4.6, 5.5, 48]} />
        <meshLambertMaterial color="#c8c0a8" />
      </mesh>
      {/* Pool interior stone – oval bed */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[4.6, 7.2, 1]} receiveShadow>
        <circleGeometry args={[1, 48]} />
        <meshLambertMaterial color="#3a6080" />
      </mesh>
      {/* Water surface */}
      <mesh ref={waterRef} position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[4.2, 6.8, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshLambertMaterial ref={matRef} color="#3a8fcc" transparent opacity={0.72} />
      </mesh>
      {/* Shimmer highlight */}
      <mesh ref={shineRef} position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.8, 6.0, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshLambertMaterial color="#aaddff" transparent opacity={0.2} />
      </mesh>
      {/* Pool edge stones */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const rx = 5.2, rz = 7.8;
        return (
          <mesh key={i} position={[Math.cos(a) * rx, 0.16, Math.sin(a) * rz]} castShadow>
            <boxGeometry args={[0.6, 0.25, 0.45]} />
            <meshLambertMaterial color="#b8b0a0" />
          </mesh>
        );
      })}
      {/* Fountain jet */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 1.0, 8]} />
        <meshLambertMaterial color="#88ccee" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshLambertMaterial color="#aaddff" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

/* ─── BACKGROUND CANDLE FIELD (instanced) ───────────────────────────────── */
function BackgroundCandleField() {
  const waxGeo   = useMemo(() => new THREE.CylinderGeometry(0.065, 0.085, 0.38, 7), []);
  const flameGeo = useMemo(() => new THREE.ConeGeometry(0.065, 0.21, 6, 1, true), []);
  const flameGrpRef = useRef<THREE.Group>(null!);
  const matRef      = useRef<THREE.MeshLambertMaterial>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (flameGrpRef.current) {
      flameGrpRef.current.rotation.x = Math.sin(t * 1.9) * 0.025;
      flameGrpRef.current.rotation.z = Math.cos(t * 1.55) * 0.025;
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.8 + Math.sin(t * 3.8) * 0.35;
    }
  });

  return (
    <>
      {/* Wax */}
      <Instances geometry={waxGeo} limit={CANDLE_POSITIONS.length}>
        <meshLambertMaterial color="#f5eedd" />
        {CANDLE_POSITIONS.map(([x, , z], i) => (
          <Instance key={i} position={[x, 0.19, z]} />
        ))}
      </Instances>
      {/* Flames */}
      <group ref={flameGrpRef}>
        <Instances geometry={flameGeo} limit={CANDLE_POSITIONS.length}>
          <meshLambertMaterial
            ref={matRef}
            color="#ff8c22"
            emissive={new THREE.Color("#ff5500")}
            emissiveIntensity={1.0}
            transparent
            opacity={0.88}
          />
          {CANDLE_POSITIONS.map(([x, , z], i) => (
            <Instance key={i} position={[x, 0.5, z]} />
          ))}
        </Instances>
      </group>
      {/* Scattered warm point lights (not per-candle — clustered) */}
      {[
        [-6, 0, -4], [6, 0, 4], [-10, 0, 8], [10, 0, -8],
        [0, 0, 12],  [0, 0, -12], [-14, 0, 0], [14, 0, 0],
        [-8, 0, 14], [8, 0, -14], [4, 0, 18], [-4, 0, -18],
        [18, 0, 4],  [-18, 0, -4],
      ].map(([x, y, z], i) => (
        <pointLight
          key={i}
          position={[x, y! + 1.2, z]}
          color="#ff9933"
          intensity={1.4}
          distance={9}
          decay={2}
        />
      ))}
    </>
  );
}

/* ─── FLOATING LANTERNS ──────────────────────────────────────────────────── */
function FloatingLanterns() {
  const grpRefs = useRef<THREE.Group[]>([]);
  const matRefs = useRef<THREE.MeshLambertMaterial[]>([]);
  const posRef  = useRef(LANTERN_DATA.map(d => ({ x: d.x, y: d.startY, z: d.z })));

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    LANTERN_DATA.forEach((d, i) => {
      posRef.current[i].y += d.speed * delta;
      posRef.current[i].x += Math.sin(t * 0.4 + d.phase) * d.drift * delta;
      if (posRef.current[i].y > 22) {
        posRef.current[i].y = 0.5;
        posRef.current[i].x = d.x;
      }
      const grp = grpRefs.current[i];
      if (grp) {
        grp.position.set(posRef.current[i].x, posRef.current[i].y, posRef.current[i].z);
        grp.rotation.y = t * 0.25 + d.phase;
      }
      const mat = matRefs.current[i];
      if (mat) {
        const alt = posRef.current[i].y / 22;
        mat.opacity = Math.max(0.1, 0.82 - alt * 0.72);
        mat.emissiveIntensity = 0.8 + Math.sin(t * 2.5 + d.phase) * 0.3;
      }
    });
  });

  return (
    <>
      {LANTERN_DATA.map((d, i) => (
        <group
          key={i}
          ref={(el) => { if (el) grpRefs.current[i] = el; }}
          position={[d.x, d.startY, d.z]}
        >
          {/* Lantern body */}
          <mesh>
            <boxGeometry args={[0.32, 0.42, 0.32]} />
            <meshLambertMaterial
              ref={(el) => { if (el) matRefs.current[i] = el as THREE.MeshLambertMaterial; }}
              color="#ffcc66"
              emissive={new THREE.Color("#ff8800")}
              emissiveIntensity={0.9}
              transparent
              opacity={0.75}
            />
          </mesh>
          {/* Top/bottom ring */}
          <mesh position={[0, 0.23, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 8]} />
            <meshLambertMaterial color="#cc8822" />
          </mesh>
          <mesh position={[0, -0.23, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 8]} />
            <meshLambertMaterial color="#cc8822" />
          </mesh>
          {/* Inner glow */}
          <mesh>
            <sphereGeometry args={[0.1, 6, 6]} />
            <meshLambertMaterial color="#ffee88" emissive={new THREE.Color("#ffcc00")} emissiveIntensity={2.5} />
          </mesh>
          {/* Light */}
          <pointLight color="#ffaa33" intensity={0.9} distance={4.5} decay={2} />
        </group>
      ))}
    </>
  );
}

/* ─── REMEMBRANCE TREES ──────────────────────────────────────────────────── */
function RemembranceTrees() {
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.14, 0.22, 2.2, 7), []);
  const c1Geo    = useMemo(() => new THREE.SphereGeometry(1.25, 8, 7), []);
  const c2Geo    = useMemo(() => new THREE.SphereGeometry(1.0, 8, 6), []);
  const c3Geo    = useMemo(() => new THREE.SphereGeometry(0.75, 7, 6), []);

  return (
    <>
      <Instances geometry={trunkGeo} limit={TREE_POSITIONS.length}>
        <meshLambertMaterial color="#5a3a18" />
        {TREE_POSITIONS.map(([x, z], i) => (
          <Instance key={i} position={[x, 1.1, z]} />
        ))}
      </Instances>
      <Instances geometry={c1Geo} limit={TREE_POSITIONS.length}>
        <meshLambertMaterial color="#3a6030" />
        {TREE_POSITIONS.map(([x, z], i) => (
          <Instance key={i} position={[x, 3.0 + (i % 4) * 0.15, z]} />
        ))}
      </Instances>
      <Instances geometry={c2Geo} limit={TREE_POSITIONS.length}>
        <meshLambertMaterial color="#4a7838" />
        {TREE_POSITIONS.map(([x, z], i) => (
          <Instance key={i} position={[x + (i % 3 - 1) * 0.4, 3.7 + (i % 3) * 0.12, z + (i % 2 - 0.5) * 0.4]} />
        ))}
      </Instances>
      <Instances geometry={c3Geo} limit={TREE_POSITIONS.length}>
        <meshLambertMaterial color="#5a8840" />
        {TREE_POSITIONS.map(([x, z], i) => (
          <Instance key={i} position={[x + (i % 2 - 0.5) * 0.5, 4.3 + (i % 2) * 0.2, z + (i % 3 - 1) * 0.35]} />
        ))}
      </Instances>
    </>
  );
}

/* ─── FLOWER CLUSTERS ────────────────────────────────────────────────────── */
function FlowerClusters() {
  const flowerPositions = useMemo(() => {
    const r = makeLCG(55);
    return Array.from({ length: 80 }, () => {
      const ang = r() * Math.PI * 2;
      const rad = 4 + r() * 28;
      return [Math.cos(ang) * rad, Math.sin(ang) * rad] as [number, number];
    });
  }, []);
  const petalGeo = useMemo(() => new THREE.SphereGeometry(0.1, 5, 4), []);
  const colors   = ["#ffb3c6", "#ffd6e0", "#fff0f5", "#ffe4e1", "#ffc0cb"];

  return (
    <>
      {[0, 1, 2].map(ci => (
        <Instances key={ci} geometry={petalGeo} limit={80}>
          <meshLambertMaterial color={colors[ci % colors.length]} />
          {flowerPositions.map(([x, z], i) => {
            const ang = (ci / 3) * Math.PI * 2 + i;
            return (
              <Instance
                key={i}
                position={[x + Math.cos(ang) * 0.12, 0.14, z + Math.sin(ang) * 0.12]}
              />
            );
          })}
        </Instances>
      ))}
    </>
  );
}

/* ─── STONE BENCHES ──────────────────────────────────────────────────────── */
function StoneBenches() {
  const benchAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <>
      {benchAngles.map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        const r = 11.5;
        return (
          <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0, -a, 0]}>
            {/* Seat */}
            <mesh position={[0, 0.38, 0]} castShadow>
              <boxGeometry args={[1.4, 0.12, 0.45]} />
              <meshLambertMaterial color="#d0c8b8" />
            </mesh>
            {/* Legs */}
            <mesh position={[-0.5, 0.18, 0]} castShadow>
              <boxGeometry args={[0.14, 0.36, 0.4]} />
              <meshLambertMaterial color="#b8b0a0" />
            </mesh>
            <mesh position={[0.5, 0.18, 0]} castShadow>
              <boxGeometry args={[0.14, 0.36, 0.4]} />
              <meshLambertMaterial color="#b8b0a0" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/* ─── JERUSALEM SANCTUARY ────────────────────────────────────────────────── */
function JerusalemSanctuary() {
  return (
    <group position={[0, 0, -22]}>
      {/* Platform */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 1.0, 12]} />
        <meshLambertMaterial color="#d4c8a8" />
      </mesh>
      {/* Main hall */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 4.0, 9]} />
        <meshLambertMaterial color="#e0d4b4" />
      </mesh>
      {/* Dome drum */}
      <mesh position={[0, 5.8, 0]} castShadow>
        <cylinderGeometry args={[2.5, 3.0, 1.4, 16]} />
        <meshLambertMaterial color="#cec4a0" />
      </mesh>
      {/* Golden dome */}
      <mesh position={[0, 7.4, 0]} castShadow>
        <sphereGeometry args={[2.45, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshLambertMaterial
          color="#D4AF37"
          emissive={new THREE.Color("#8a6800")}
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* Finial */}
      <mesh position={[0, 9.85, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.15, 1.4, 8]} />
        <meshLambertMaterial color="#D4AF37" emissive={new THREE.Color("#8a6800")} emissiveIntensity={0.6} />
      </mesh>
      {/* 4 Corner towers */}
      {([-3.5, 3.5] as number[]).flatMap(x =>
        ([-3.5, 3.5] as number[]).map(z => ({ x, z }))
      ).map(({ x, z }, i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.62, 5.0, 10]} />
            <meshLambertMaterial color="#c8b888" />
          </mesh>
          <mesh position={[0, 5.35, 0]} castShadow>
            <sphereGeometry args={[0.4, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color="#D4AF37" emissive={new THREE.Color("#8a6800")} emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
      {/* Arched entrance */}
      <group position={[0, 2.0, 4.6]}>
        <mesh castShadow>
          <boxGeometry args={[2.8, 4.0, 0.55]} />
          <meshLambertMaterial color="#e8dcc0" />
        </mesh>
        <mesh position={[0, -0.5, 0.1]}>
          <boxGeometry args={[1.6, 2.8, 0.6]} />
          <meshLambertMaterial color="#1e140a" />
        </mesh>
        <mesh position={[0, 0.95, 0.1]}>
          <cylinderGeometry args={[0.8, 0.8, 0.6, 12, 1, false, 0, Math.PI]} />
          <meshLambertMaterial color="#1e140a" />
        </mesh>
      </group>
      {/* Flanking walls */}
      {([-6.5, 6.5] as number[]).map((x, i) => (
        <group key={i}>
          <mesh position={[x, 2, 0]} castShadow>
            <boxGeometry args={[3.5, 4.0, 9]} />
            <meshLambertMaterial color="#d0c4a0" />
          </mesh>
          {/* Merlons */}
          {[-1.2, -0.4, 0.4, 1.2].map((dz, j) => (
            <mesh key={j} position={[x, 4.35, dz]} castShadow>
              <boxGeometry args={[3.5, 0.7, 0.5]} />
              <meshLambertMaterial color="#c4b894" />
            </mesh>
          ))}
        </group>
      ))}
      {/* Point light from dome */}
      <pointLight position={[0, 8, 0]} color="#D4AF37" intensity={1.2} distance={16} decay={2} />
    </group>
  );
}

/* ─── ETERNAL ALTAR (island in pool center) ──────────────────────────────── */
function EternalAltar() {
  const flameRef  = useRef<THREE.Mesh>(null!);
  const lightRef  = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (flameRef.current) {
      flameRef.current.scale.x = 0.82 + Math.sin(t * 3.2) * 0.22;
      flameRef.current.scale.z = 0.82 + Math.cos(t * 2.8) * 0.22;
      flameRef.current.scale.y = 0.88 + Math.sin(t * 2.1) * 0.14;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 2.8 + Math.sin(t * 3.6) * 1.0;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Island */}
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 16]} />
        <meshLambertMaterial color="#c8c0a8" />
      </mesh>
      {/* Altar column */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.62, 1.3, 12]} />
        <meshLambertMaterial color="#c8b888" />
      </mesh>
      <mesh position={[0, 1.58, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.48, 0.3, 12]} />
        <meshLambertMaterial color="#d4c494" />
      </mesh>
      {/* Candle */}
      <mesh position={[0, 2.05, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.9, 10]} />
        <meshLambertMaterial color="#fdf8ee" />
      </mesh>
      {/* Flame */}
      <mesh ref={flameRef} position={[0, 2.65, 0]}>
        <coneGeometry args={[0.2, 0.6, 8, 1, true]} />
        <meshLambertMaterial
          color="#ff8c22"
          emissive={new THREE.Color("#ff5500")}
          emissiveIntensity={1.8}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position={[0, 2.7, 0]}>
        <coneGeometry args={[0.1, 0.38, 6, 1, true]} />
        <meshLambertMaterial
          color="#ffee44"
          emissive={new THREE.Color("#ffcc00")}
          emissiveIntensity={2.5}
          transparent
          opacity={0.95}
        />
      </mesh>
      <pointLight ref={lightRef} position={[0, 3.0, 0]} color="#ff9922" intensity={3.0} distance={14} decay={2} castShadow />
      <Text position={[0, 0.3, 1.7]} fontSize={0.2} color="#D4AF37" anchorX="center">
        נֵר תָּמִיד
      </Text>
    </group>
  );
}

/* ─── INTERACTIVE ENTRY CANDLES ──────────────────────────────────────────── */
interface EntryPositions {
  pos: [number, number, number];
  entry: CommunityYahrzeitEntry;
  animOffset: number;
}

function EntryCandle({ pos, entry, animOffset, onCandleClick, highlighted }: EntryPositions & {
  onCandleClick: (e: CommunityYahrzeitEntry) => void;
  highlighted: boolean;
}) {
  const flameRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const grpRef   = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + animOffset;
    if (flameRef.current) {
      flameRef.current.scale.x = 0.78 + Math.sin(t * 4.2) * 0.28;
      flameRef.current.scale.z = 0.78 + Math.cos(t * 3.8) * 0.28;
      flameRef.current.scale.y = 0.84 + Math.sin(t * 3.1) * 0.2;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.0 + Math.sin(t * 5.4) * 0.4;
    }
    if (grpRef.current && highlighted) {
      grpRef.current.position.y = pos[1] + Math.sin(clock.getElapsedTime() * 2) * 0.04;
    }
  });

  const shortName = entry.deceasedName.split("·")[0].trim();

  return (
    <group
      ref={grpRef}
      position={pos}
      onClick={(e) => { e.stopPropagation(); onCandleClick(entry); }}
    >
      {/* Hit area */}
      <mesh>
        <cylinderGeometry args={[0.65, 0.65, 1.8, 8]} />
        <meshLambertMaterial transparent opacity={0} />
      </mesh>
      {/* Highlight ring */}
      {highlighted && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.55, 20]} />
          <meshLambertMaterial color="#D4AF37" emissive={new THREE.Color("#D4AF37")} emissiveIntensity={1.2} transparent opacity={0.7} />
        </mesh>
      )}
      {/* Wax */}
      <mesh position={[0, 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.14, 0.52, 10]} />
        <meshLambertMaterial color="#f5edd4" />
      </mesh>
      {/* Flame */}
      <mesh ref={flameRef} position={[0, 0.64, 0]}>
        <coneGeometry args={[0.1, 0.26, 8, 1, true]} />
        <meshLambertMaterial
          color="#ff7722"
          emissive={new THREE.Color("#ff4400")}
          emissiveIntensity={1.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <coneGeometry args={[0.055, 0.16, 6, 1, true]} />
        <meshLambertMaterial
          color="#ffee44"
          emissive={new THREE.Color("#ffcc00")}
          emissiveIntensity={2.0}
          transparent
          opacity={0.94}
        />
      </mesh>
      <pointLight ref={lightRef} color="#ff9933" intensity={1.1} distance={4.5} decay={2} />
      <Text position={[0, 1.05, 0]} fontSize={0.14} color="#ffd977" anchorX="center" maxWidth={2.0}>
        {shortName.length > 16 ? shortName.slice(0, 15) + "…" : shortName}
      </Text>
    </group>
  );
}

/* ─── PLACED CANDLES (user-placed) ──────────────────────────────────────── */
function PlacedCandle({ pos, name, animOffset }: {
  pos: [number, number, number]; name: string; animOffset: number;
}) {
  const flameRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + animOffset;
    if (flameRef.current) {
      flameRef.current.scale.x = 0.8 + Math.sin(t * 4.1) * 0.25;
      flameRef.current.scale.z = 0.8 + Math.cos(t * 3.7) * 0.25;
    }
  });

  return (
    <group position={pos}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.44, 8]} />
        <meshLambertMaterial color="#fdf8f0" />
      </mesh>
      <mesh ref={flameRef} position={[0, 0.56, 0]}>
        <coneGeometry args={[0.09, 0.22, 7, 1, true]} />
        <meshLambertMaterial color="#ff7722" emissive={new THREE.Color("#ff4400")} emissiveIntensity={1.3} transparent opacity={0.88} />
      </mesh>
      <pointLight color="#ff9933" intensity={0.85} distance={3.5} decay={2} />
      <Text position={[0, 0.92, 0]} fontSize={0.12} color="#ffd977" anchorX="center">
        {name.length > 14 ? name.slice(0, 13) + "…" : name}
      </Text>
    </group>
  );
}

/* ─── GOLDEN DUST ────────────────────────────────────────────────────────── */
function GoldenDust() {
  const n   = 100;
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dum = useMemo(() => new THREE.Object3D(), []);
  const pts = useMemo(() => {
    const r = makeLCG(77);
    return Array.from({ length: n }, () => ({
      x: (r() - 0.5) * 50,
      y: r() * 10 + 0.5,
      z: (r() - 0.5) * 50,
      sp: 0.18 + r() * 0.36,
      ph: r() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    pts.forEach((p, i) => {
      dum.position.set(
        p.x + Math.sin(t * 0.28 + p.ph) * 0.55,
        p.y + Math.sin(t * p.sp + p.ph) * 0.65,
        p.z + Math.cos(t * 0.22 + p.ph) * 0.55
      );
      dum.scale.setScalar(0.035 + Math.sin(t * p.sp + p.ph) * 0.014);
      dum.updateMatrix();
      ref.current.setMatrixAt(i, dum.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshLambertMaterial
        color="#D4AF37"
        emissive={new THREE.Color("#aa8800")}
        emissiveIntensity={1.3}
        transparent
        opacity={0.6}
      />
    </instancedMesh>
  );
}

/* ─── MOVING CLOUDS ──────────────────────────────────────────────────────── */
function MovingClouds() {
  const refs = [useRef<THREE.Group>(null!), useRef<THREE.Group>(null!), useRef<THREE.Group>(null!)];
  const data = [
    { startX: -35, y: 18, z: -15, speed: 1.1, scale: 1.3, opacity: 0.78 },
    { startX: -35, y: 20, z: 8,   speed: 0.75, scale: 1.0, opacity: 0.60 },
    { startX: -35, y: 16, z: -28, speed: 1.45, scale: 1.6, opacity: 0.70 },
  ];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      if (refs[i].current) {
        refs[i].current.position.x = -35 + ((t * d.speed * 0.8) % 90);
      }
    });
  });

  function CloudGroup({ scale, opacity }: { scale: number; opacity: number }) {
    const mat = <meshLambertMaterial color="white" transparent opacity={opacity} />;
    return (
      <group>
        <mesh scale={scale}><sphereGeometry args={[2.2, 10, 8]} />{mat}</mesh>
        <mesh position={[2.0 * scale, -0.4 * scale, 0]} scale={scale}><sphereGeometry args={[1.7, 10, 8]} />{mat}</mesh>
        <mesh position={[-2.0 * scale, -0.3 * scale, 0]} scale={scale}><sphereGeometry args={[1.4, 9, 7]} />{mat}</mesh>
        <mesh position={[0.8 * scale, 1.0 * scale, 0]} scale={scale}><sphereGeometry args={[1.3, 9, 7]} />{mat}</mesh>
      </group>
    );
  }

  return (
    <>
      {data.map((d, i) => (
        <group key={i} ref={refs[i]} position={[d.startX, d.y, d.z]}>
          <CloudGroup scale={d.scale} opacity={d.opacity} />
        </group>
      ))}
    </>
  );
}

/* ─── DYNAMIC SUNSET LIGHTING ────────────────────────────────────────────── */
function SunsetLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.035;
    if (sunRef.current) {
      sunRef.current.position.x = Math.cos(t) * 32;
      sunRef.current.position.y = 16 + Math.sin(t) * 6;
      sunRef.current.position.z = Math.sin(t) * 18;
      const w = 0.82 + Math.sin(t) * 0.18;
      sunRef.current.color.setRGB(1.0, w * 0.82, w * 0.62);
    }
  });

  return (
    <>
      <ambientLight color="#f5dca0" intensity={0.72} />
      <directionalLight
        ref={sunRef}
        color="#ffcc80"
        intensity={2.0}
        position={[18, 22, 10]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={80}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
      />
      <pointLight color="#D4AF37" intensity={0.5} position={[0, -1, 0]} distance={50} />
    </>
  );
}

/* ─── GROUND CLICK PLANE ─────────────────────────────────────────────────── */
function GroundClickPlane({ onGroundClick }: { onGroundClick: (pos: [number, number, number]) => void }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.04, 0]}
      onClick={e => { e.stopPropagation(); const { x, y, z } = e.point; onGroundClick([x, y + 0.15, z]); }}
    >
      <planeGeometry args={[70, 70]} />
      <meshLambertMaterial transparent opacity={0} />
    </mesh>
  );
}

/* ─── CAMERA SETUP ───────────────────────────────────────────────────────── */
function IsometricCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(20, 26, 20);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

/* ─── ENTRY CANDLE POSITIONS ─────────────────────────────────────────────── */
function buildEntryPositions(): [number, number, number][] {
  const zones = [
    { cx: 0,   cz: 0,   r: 4.5, count: 12 },
    { cx: -10, cz: 0,   r: 3.0, count: 8  },
    { cx: 10,  cz: 0,   r: 3.0, count: 8  },
    { cx: 0,   cz: -10, r: 3.0, count: 8  },
    { cx: 0,   cz: 10,  r: 3.0, count: 8  },
    { cx: -10, cz: -10, r: 2.5, count: 6  },
    { cx: 10,  cz: 10,  r: 2.5, count: 6  },
    { cx: -10, cz: 10,  r: 2.5, count: 6  },
    { cx: 10,  cz: -10, r: 2.5, count: 6  },
  ];
  const positions: [number, number, number][] = [];
  zones.forEach(z => {
    for (let i = 0; i < z.count; i++) {
      const a = (i / z.count) * Math.PI * 2;
      const r = z.r * (0.35 + (i % 4) * 0.18);
      positions.push([z.cx + Math.cos(a) * r, 0.16, z.cz + Math.sin(a) * r]);
    }
  });
  return positions;
}
const ENTRY_POSITIONS = buildEntryPositions();

/* ─── FULL 3D SCENE ──────────────────────────────────────────────────────── */
interface SceneProps {
  entries:        CommunityYahrzeitEntry[];
  placedCandles:  { pos: [number, number, number]; name: string }[];
  onGroundClick:  (pos: [number, number, number]) => void;
  onCandleClick:  (entry: CommunityYahrzeitEntry) => void;
  selectedId:     string | null;
}

function ValleyScene({ entries, placedCandles, onGroundClick, onCandleClick, selectedId }: SceneProps) {
  const litEntries = useMemo(
    () => entries.slice(0, ENTRY_POSITIONS.length),
    [entries]
  );

  return (
    <>
      <IsometricCamera />
      <SunsetLighting />
      <fog attach="fog" args={["#e8d4a0", 42, 88]} />

      <Sky
        distance={450}
        sunPosition={[0.8, 0.35, 0.15]}
        inclination={0.52}
        azimuth={0.22}
        turbidity={7}
        rayleigh={1.0}
        mieCoefficient={0.006}
        mieDirectionalG={0.82}
      />

      <SanctuaryTerrain />
      <WhiteStonePaths />
      <ReflectionPool />
      <BackgroundCandleField />
      <FloatingLanterns />
      <RemembranceTrees />
      <FlowerClusters />
      <StoneBenches />
      <JerusalemSanctuary />
      <EternalAltar />
      <MovingClouds />
      <GoldenDust />

      {litEntries.map((entry, i) => (
        <EntryCandle
          key={entry.id}
          pos={ENTRY_POSITIONS[i]}
          entry={entry}
          animOffset={i * 0.37}
          onCandleClick={onCandleClick}
          highlighted={entry.id === selectedId}
        />
      ))}

      {placedCandles.map((c, i) => (
        <PlacedCandle
          key={`placed-${i}`}
          pos={c.pos}
          name={c.name}
          animOffset={i * 0.55 + 1.1}
        />
      ))}

      <GroundClickPlane onGroundClick={onGroundClick} />

      <OrbitControls
        enableRotate={false}
        enablePan={true}
        enableZoom={true}
        panSpeed={1.3}
        zoomSpeed={0.85}
        minDistance={7}
        maxDistance={58}
        mouseButtons={{
          LEFT:   THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT:  THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.PAN,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        maxPolarAngle={Math.PI / 2.6}
        minPolarAngle={Math.PI / 5.5}
        target={[0, 0, 0]}
      />
    </>
  );
}

/* ─── PUBLIC EXPORT ──────────────────────────────────────────────────────── */
export interface MemorialValley3DProps {
  entries:        CommunityYahrzeitEntry[];
  placedCandles:  { pos: [number, number, number]; name: string }[];
  onGroundClick:  (pos: [number, number, number]) => void;
  onCandleClick:  (entry: CommunityYahrzeitEntry) => void;
  selectedId:     string | null;
}

export default function MemorialValley3D(props: MemorialValley3DProps) {
  return (
    <Canvas
      shadows
      camera={{ fov: 46, near: 0.4, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <Suspense fallback={null}>
        <ValleyScene {...props} />
      </Suspense>
    </Canvas>
  );
}
