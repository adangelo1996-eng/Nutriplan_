/**
 * NutriPlan Casa — React Three Fiber scena 3D
 * Cucina italiana low-poly, illuminazione dinamica CET, etichetta fluttuante
 */
import React, { useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Environment, Float, ContactShadows } from '@react-three/drei';

// Colori app NutriPlan
const GOLD = '#d4a84b';
const PRIMARY = '#3d8b6f';
const DARK = '#0d2218';
const LIGHT_BG = '#e8f5f0';

/** Ora CET per illuminazione */
function getCETHour() {
  const now = new Date();
  const cet = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  return cet.getHours() + cet.getMinutes() / 60;
}

/** Profilo illuminazione in base all'ora CET */
function getLightingProfile() {
  const h = getCETHour();
  if (h >= 5 && h < 7) {
    return { phase: 'dawn', ambient: 0.3, sun: 0.4, color: '#87ceeb', intensity: 0.8, indoor: 0.2 };
  }
  if (h >= 7 && h < 17) {
    return { phase: 'day', ambient: 0.5, sun: 1, color: '#fff8dc', intensity: 1.2, indoor: 0.1 };
  }
  if (h >= 17 && h < 20) {
    return { phase: 'evening', ambient: 0.35, sun: 0.6, color: '#ffb347', intensity: 0.9, indoor: 0.4 };
  }
  return { phase: 'night', ambient: 0.15, sun: 0.05, color: '#1a1a2e', intensity: 0.2, indoor: 0.9 };
}

/** Etichetta fluttuante — stile come la card attuale */
function FloatingLabel({ label, msg, subMsg, onVaiOggi, hovered, onHover }) {
  return (
    <Html
      transform
      center
      distanceFactor={2.5}
      position={[0, 0.15, 0]}
      occlude
      style={{
        pointerEvents: 'auto',
        width: '220px',
        userSelect: 'none',
      }}
    >
      <div
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onClick={onVaiOggi}
        style={{
          background: 'rgba(232, 245, 240, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(61, 139, 111, 0.4)',
          borderRadius: '16px',
          padding: '18px 20px',
          cursor: 'pointer',
          fontFamily: "'Poppins', sans-serif",
          transform: hovered ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          boxShadow: hovered ? '0 12px 40px rgba(212, 168, 75, 0.25)' : '0 8px 32px rgba(13, 34, 24, 0.12)',
        }}
        className="casa-float-label"
      >
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: DARK, marginBottom: 8 }}>
          {label}
        </div>
        <p style={{ fontSize: '0.95rem', color: '#475c53', margin: '0 0 4px', lineHeight: 1.4 }}>
          {msg}
        </p>
        <p style={{ fontSize: '0.85rem', color: '#8aa89e', margin: '0 0 14px', lineHeight: 1.4 }}>
          {subMsg}
        </p>
        <button
          style={{
            background: PRIMARY,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Vai a Oggi →
        </button>
        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: -28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(13, 34, 24, 0.9)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: '0.75rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            Vai Oggi
          </div>
        )}
      </div>
    </Html>
  );
}

/** Tavolo in legno low-poly */
function Table() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.08, 1.4]} />
        <meshStandardMaterial color="#8b6914" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[-0.95, 0.12, 0]} castShadow>
        <boxGeometry args={[0.06, 0.24, 0.06]} />
        <meshStandardMaterial color="#5c3d0a" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0.95, 0.12, 0]} castShadow>
        <boxGeometry args={[0.06, 0.24, 0.06]} />
        <meshStandardMaterial color="#5c3d0a" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[-0.95, 0.12, 0.6]} castShadow>
        <boxGeometry args={[0.06, 0.24, 0.06]} />
        <meshStandardMaterial color="#5c3d0a" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0.95, 0.12, 0.6]} castShadow>
        <boxGeometry args={[0.06, 0.24, 0.06]} />
        <meshStandardMaterial color="#5c3d0a" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

/** Frigorifero low-poly */
function Fridge() {
  return (
    <group position={[1.8, 0.9, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.5, 1.2, 0.7]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0.15, 0.1, 0.36]} castShadow>
        <boxGeometry args={[0.1, 0.4, 0.02]} />
        <meshStandardMaterial color="#d0d0d0" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

/** Vaso con pianta — tocco cozy */
function Plant() {
  return (
    <group position={[-1.3, 0.35, 0.5]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.2, 8]} />
        <meshStandardMaterial color="#c4a35a" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}

/** Finestra con luce esterna */
function Window({ profile }) {
  const emissive = profile.phase === 'night' ? 0.1 : profile.phase === 'dawn' ? 0.4 : 0.8;
  return (
    <group position={[-1.6, 1.1, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <planeGeometry args={[1.2, 1]} />
        <meshStandardMaterial
          color={profile.color}
          emissive={profile.color}
          emissiveIntensity={emissive}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.1, 0.9]} />
        <meshStandardMaterial color="#1a1a2e" opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

/** Lampadario / luce interna (notte) */
function IndoorLight({ profile }) {
  if (profile.indoor < 0.3) return null;
  return (
    <pointLight
      position={[0, 2, 0]}
      intensity={profile.indoor * 2}
      color="#fff5e6"
      distance={6}
      decay={2}
    />
  );
}

/** Scena principale */
function Scene({ label, msg, subMsg, onVaiOggi }) {
  const [hovered, setHovered] = useState(false);
  const profile = useMemo(getLightingProfile, []);
  const meshRef = useRef();

  return (
    <>
      <color attach="background" args={[profile.phase === 'night' ? '#0a0f0d' : '#e8f5f0']} />
      <ambientLight intensity={profile.ambient} />
      <directionalLight
        position={[3, 5, 2]}
        intensity={profile.sun * profile.intensity}
        color={profile.color}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-far={15}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <IndoorLight profile={profile} />
      <Table />
      <Fridge />
      <Window profile={profile} />
      <Plant />
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={6} blur={2} far={4} />
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
        <group ref={meshRef} position={[0, 0.3, 0]}>
          <FloatingLabel
            label={label}
            msg={msg}
            subMsg={subMsg}
            onVaiOggi={onVaiOggi}
            hovered={hovered}
            onHover={setHovered}
          />
        </group>
      </Float>
    </>
  );
}

/** Componente root con Canvas */
export function CasaScene({ suggestedMeal, suggestedLabel, msg, subMsg, userName, onVaiOggi }) {
  const label = suggestedLabel || 'Riepilogo';
  const message = msg || 'Il tuo spazio personale.';
  const subMessage = subMsg || 'Scegli dove andare.';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '320px',
        position: 'relative',
        background: 'var(--bg, #f6f8f7)',
        borderRadius: 'var(--r-lg, 16px)',
        overflow: 'hidden',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 1, 3.5], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2.5}
          maxDistance={6}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
        />
        <Scene
          label={label}
          msg={message}
          subMsg={subMessage}
          onVaiOggi={onVaiOggi}
        />
      </Canvas>
    </div>
  );
}
