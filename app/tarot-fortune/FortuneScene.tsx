'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, CylinderCollider, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

type Motion = { x: number; z: number; px: number; pz: number; energy: number };
type Props = { motion: Motion; sound: boolean; onDraw: (index: number) => void; onOpen: () => void };
const COUNT = 22;

function Part({ name }: { name: string }) {
  const { scene } = useGLTF('/assets/fortune-stick-props.glb');
  const part = useMemo(() => scene.getObjectByName(name)?.clone(), [scene, name]);
  return part ? <primitive object={part} /> : null;
}

type CupFrame = { x: number; z: number; rotation: THREE.Quaternion };

function Cup({ motion, frozen, offset }: { motion: Motion; frozen: boolean; offset: React.MutableRefObject<CupFrame> }) {
  const body = useRef<RapierRigidBody>(null);
  const tilt = useRef({ x: 0, z: 0 });
  const location = useRef({ x: 0, z: 0 });
  useFrame((_, delta) => {
    const aimX = frozen ? 0 : THREE.MathUtils.clamp(motion.x * .26 + motion.pz * .08, -.32, .32);
    const aimZ = frozen ? 0 : THREE.MathUtils.clamp(motion.z * .26 - motion.px * .08, -.32, .32);
    tilt.current.x = THREE.MathUtils.damp(tilt.current.x, aimX, 3.5, delta);
    tilt.current.z = THREE.MathUtils.damp(tilt.current.z, aimZ, 3.5, delta);
    location.current.x = THREE.MathUtils.damp(location.current.x, motion.px, 5, delta);
    location.current.z = THREE.MathUtils.damp(location.current.z, motion.pz, 5, delta);
    offset.current.x = location.current.x;
    offset.current.z = location.current.z;
    body.current?.setNextKinematicTranslation({ x: location.current.x, y: 0, z: location.current.z });
    offset.current.rotation.setFromEuler(new THREE.Euler(tilt.current.x, 0, tilt.current.z));
    body.current?.setNextKinematicRotation(offset.current.rotation);
  });
  return <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, 0, 0]}>
    <group><Part name="FORTUNE_CUP" /><Part name="CUP_INNER" /><Part name="RIM_END_GRAIN" /><Part name="INNER_RIM_HIGHLIGHT" /><Part name="TOP_TURNED_GROOVE" /><Part name="TOP_TURNED_GROOVE_2" /><Part name="BOTTOM_TURNED_GROOVE" /><Part name="BOTTOM_TURNED_GROOVE_2" /></group>
    <CylinderCollider args={[.065, .33]} position={[0, .065, 0]} />
    {Array.from({ length: 24 }, (_, i) => {
      const angle = i * Math.PI * 2 / 24;
      return <CuboidCollider key={i} args={[.062, .655, .046]} position={[Math.sin(angle) * .372, .73, Math.cos(angle) * .372]} rotation={[0, angle, 0]} friction={.65} restitution={.04} />;
    })}
  </RigidBody>;
}

function Stick({ index, motion, offset, onEscape, onOpen, selected }: { index: number; motion: Motion; offset: React.MutableRefObject<CupFrame>; onEscape: (index: number) => boolean; onOpen: () => void; selected: boolean }) {
  const body = useRef<RapierRigidBody>(null);
  const lastImpulse = useRef(0);
  const escaped = useRef(false);
  const carried = useRef({ x: 0, z: 0 });
  const position = useMemo(() => {
    const angle = index * 2.39996;
    const radius = Math.sqrt((index + .5) / COUNT) * .265;
    return [Math.cos(angle) * radius, .13 + (index % 4) * .012, Math.sin(angle) * radius] as [number, number, number];
  }, [index]);
  useFrame(() => {
    const rigid = body.current;
    if (!rigid) return;
    const dx = offset.current.x - carried.current.x;
    const dz = offset.current.z - carried.current.z;
    if (!selected && (dx || dz)) {
      const current = rigid.translation();
      rigid.setTranslation({ x: current.x + dx, y: current.y, z: current.z + dz }, true);
      carried.current = { ...offset.current };
    }
    let p = rigid.translation();
    if (!selected) {
      const local = new THREE.Vector3(p.x - offset.current.x, p.y, p.z - offset.current.z)
        .applyQuaternion(offset.current.rotation.clone().invert());
      const radius = Math.hypot(local.x, local.z);
      if (local.y > .12 && local.y < 1.28 && radius > .41) {
        local.x *= .29 / radius;
        local.z *= .29 / radius;
        local.applyQuaternion(offset.current.rotation);
        rigid.setTranslation({ x: local.x + offset.current.x, y: local.y, z: local.z + offset.current.z }, true);
        const velocity = rigid.linvel();
        rigid.setLinvel({ x: 0, y: Math.min(velocity.y, 0), z: 0 }, true);
        p = rigid.translation();
      }
    }
    if (!escaped.current && p.y > 1.38 && Math.hypot(p.x - offset.current.x, p.z - offset.current.z) > .46) {
      escaped.current = true;
      console.log('fortune-stick-escape', index, p.x, p.y, p.z);
      if (onEscape(index)) {
        rigid.applyImpulse({ x: .018, y: .004, z: .055 }, true);
        rigid.setLinearDamping(1.2);
      }
    }
    const now = performance.now();
    if (!selected && index === 0 && motion.energy > .55 && now - lastImpulse.current > 180) {
      lastImpulse.current = now;
      body.current?.applyImpulse({ x: -motion.z * .013, y: .075 * motion.energy, z: motion.x * .013 }, true);
    }
  });
  return <RigidBody ref={body} colliders={false} position={position} rotation={[((index % 5) - 2) * .012, index * .54, ((index % 7) - 3) * .012]} mass={.08} linearDamping={.8} angularDamping={1.1} ccd>
    <group onClick={event => { event.stopPropagation(); if (selected) onOpen(); }}><Part name="STICK_BODY" /></group>
    <CuboidCollider args={[.023, .78, .012]} position={[0, .78, 0]} friction={.62} restitution={.04} />
  </RigidBody>;
}

function Scene({ motion, sound, onDraw, onOpen }: Props) {
  const { camera } = useThree();
  const chosen = useRef<number | null>(null);
  const offset = useRef<CupFrame>({ x: 0, z: 0, rotation: new THREE.Quaternion() });
  const audio = useRef<AudioContext | null>(null);
  const lastSound = useRef(0);
  useEffect(() => { camera.lookAt(0, .68, 0); }, [camera]);
  useFrame(() => {
    if (!sound || motion.energy < .35 || chosen.current !== null) return;
    const now = performance.now();
    if (now - lastSound.current < 135) return;
    lastSound.current = now;
    try {
      audio.current ||= new AudioContext();
      const ctx = audio.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 + Math.random() * 250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + .045);
      gain.gain.setValueAtTime(.025 * motion.energy, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .055);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + .055);
    } catch { /* Audio is optional. */ }
  });
  useEffect(() => () => { void audio.current?.close(); }, []);
  return <>
    <ambientLight intensity={.8} />
    <directionalLight position={[3, 5, 4]} intensity={2} castShadow />
    <pointLight position={[-3, 2, -2]} intensity={4} color="#eac9a0" />
    <Physics gravity={[0, -9.81, 0]} timeStep={1 / 120} maxCcdSubsteps={4} numSolverIterations={8} interpolate>
      <Cup motion={motion} frozen={chosen.current !== null} offset={offset} />
      {Array.from({ length: COUNT }, (_, i) => <Stick key={i} index={i} motion={motion} offset={offset} selected={chosen.current === i} onOpen={onOpen} onEscape={id => { if (chosen.current !== null) return false; chosen.current = id; onDraw(id); return true; }} />)}
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[5, .05, 5]} position={[0, -.06, 0]} friction={.7} /></RigidBody>
    </Physics>
    <ContactShadows position={[0, -.005, 0]} opacity={.4} scale={4} blur={2.5} far={3} />
    <Environment preset="warehouse" environmentIntensity={.45} />
  </>;
}

export default function FortuneScene(props: Props) {
  return <Canvas shadows dpr={[1, 1.7]} camera={{ position: [0, 1.9, 3.15], fov: 37 }} gl={{ alpha: true, antialias: true }}><Scene {...props} /></Canvas>;
}
