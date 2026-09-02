/**
 * ReviveOS — Revenue Core
 * WebGL particle system using Three.js / R3F.
 * Represents payment transactions flowing through the recovery system.
 * Gracefully falls back to a CSS animation if WebGL is unavailable.
 */
import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// ─── Particle geometry ───────────────────────────────────────────────────────

function ParticleCore({ count = 2000 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Spherical distribution with a flowing tube effect
      const t = (i / count) * Math.PI * 2 * 8;
      const r = 1.2 + Math.random() * 0.8;
      const noise = (Math.random() - 0.5) * 0.5;

      pos[i * 3]     = Math.cos(t) * r + noise;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2.5;
      pos[i * 3 + 2] = Math.sin(t) * r + noise;

      // Color: mostly blue accent, some at-risk orange, some recovery green
      const rand = Math.random();
      if (rand > 0.95) {
        // At-risk — orange
        col[i * 3]     = 0.98;
        col[i * 3 + 1] = 0.45;
        col[i * 3 + 2] = 0.09;
      } else if (rand > 0.88) {
        // Recovered — green
        col[i * 3]     = 0.13;
        col[i * 3 + 1] = 0.77;
        col[i * 3 + 2] = 0.51;
      } else {
        // Normal flow — blue
        const brightness = 0.3 + Math.random() * 0.4;
        col[i * 3]     = 0.10 * brightness;
        col[i * 3 + 1] = 0.35 * brightness;
        col[i * 3 + 2] = brightness;
      }
    }
    return [pos, col];
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.06;
    ref.current.rotation.x += delta * 0.015;
  });

  return (
    <Points ref={ref} positions={positions} colors={colors}>
      <PointMaterial
        size={0.018}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  );
}

// ─── CSS Fallback ────────────────────────────────────────────────────────────

function FallbackCore() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative w-64 h-64">
        {/* Concentric rings */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border border-blue-500/20"
            style={{
              transform: `scale(${0.4 + i * 0.2})`,
              animationDelay: `${i * 0.3}s`,
              animation: "glow-pulse 3s ease-in-out infinite",
            }}
          />
        ))}
        {/* Center core */}
        <div
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-blue-500/10 border border-blue-400/40"
          style={{ margin: "auto", top: 0, left: 0, right: 0, bottom: 0, position: "absolute" }}
        />
      </div>
    </div>
  );
}

// ─── WebGL Guard ─────────────────────────────────────────────────────────────

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// ─── RevenueCore ─────────────────────────────────────────────────────────────

export function RevenueCore({ className = "" }: { className?: string }) {
  const hasWebGL = checkWebGL();

  if (!hasWebGL) return <FallbackCore />;

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <Suspense fallback={null}>
          <ParticleCore count={2000} />
        </Suspense>
      </Canvas>
    </div>
  );
}
