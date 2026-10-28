'use client';
/**
 * 求签 3D 物理场景(R3F + Rapier)。
 * 签筒居中、正对镜头,是运动学刚体,由 lotsPhysics.ShakeController 驱动前后弧线摆动;48 支签是动力学刚体。
 * 每轮开局随机预选一支签,ChosenGuide 让它在摇动中沿筒轴慢慢外窜,最后从筒顶蹦出;
 * 飞到最高点附近后自动拾起到镜头前,用户点击签身查看签文。
 * 控制逻辑在固定物理步长回调里执行,与 Node 离线模拟(同一份 lotsPhysics.ts)行为一致。
 */
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useGLTF, ContactShadows, PerformanceMonitor } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, CylinderCollider, type RapierRigidBody, useBeforePhysicsStep, useAfterPhysicsStep } from '@react-three/rapier';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as L from './lotsPhysics';

/** energy:摇动能量 0..1;pitch:拖动的前后位置 -1..1,null = 未拖动(自动摆) */
export type Motion = { energy: number; pitch: number | null };
type Props = {
  motion: Motion;
  /** 签蹦出筒口的瞬间(用于手机震动) */
  onFling?: () => void;
  sound: boolean;
  hidden: boolean;
  /** 签越过筒口,参数是签的下标(0 起,对应 LOTS[i]) */
  onEscape: (id: number) => void;
  /** 签已拾起并停在镜头前,可以点击 */
  onLand: (id: number) => void;
  onOpen: () => void;
};

const COUNT = L.LOT_COUNT;
const STEP = 1 / 180; // 实测 1/120 时偶有签被挤穿筒壁,1/180 零泄漏
const CAMERA = new THREE.Vector3(0, 0.95, 3.4);
const LOOK = new THREE.Vector3(0, 0.5, 0);
const BG = '#f3ede3'; // 纯色背景
const WALLS = L.wallSegments(); // 与离线模拟共用同一组筒壁参数
const PICK_AFTER = 0.45; // 秒:签蹦出后至少飞这么久再拾起
const PICK_TIMEOUT = 1.1; // 秒:最晚这时拾起

function useLotsParts() {
  const gltf = useGLTF('/assets/fortune-lots.glb');
  return useMemo(() => ({
    cupOuter: gltf.scene.getObjectByName('CUP_OUTER')?.clone(),
    cupInner: gltf.scene.getObjectByName('CUP_INNER')?.clone(),
    cupRim: gltf.scene.getObjectByName('CUP_RIM')?.clone(),
    stick: gltf.scene.getObjectByName('STICK') ?? null,
  }), [gltf.scene]);
}

const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function cnNumber(n: number) {
  if (n < 10) return CN[n];
  const t = Math.floor(n / 10), o = n % 10;
  return (t === 1 ? '' : CN[t]) + '十' + CN[o];
}

/** 竖排「第某签」贴片,只给拾起展示的那支签用。 */
function useLabelTexture(id: number | null) {
  return useMemo(() => {
    if (id === null || typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 96; canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const chars = `第${cnNumber(id + 1)}签`.split('');
    ctx.fillStyle = '#7a1a10';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.min(84, 600 / chars.length);
    ctx.font = `700 ${size}px "Songti SC","STSong","SimSun",serif`;
    chars.forEach((ch, i) => ctx.fillText(ch, 48, 20 + size * (i + 0.5)));
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [id]);
}

type Phase = 'shake' | 'flung' | 'pickup' | 'shown';

function Scene({ motion, sound, hidden, onEscape, onLand, onOpen, onFling }: Props) {
  const { camera } = useThree();
  const parts = useLotsParts();
  const chosen = useMemo(() => Math.floor(Math.random() * COUNT), []);
  const cup = useRef<RapierRigidBody>(null);
  const sticks = useRef<(RapierRigidBody | null)[]>([]);
  const ctl = useRef(new L.ShakeController());
  const guide = useRef(new L.ChosenGuide());
  const frame = useRef(ctl.current.step(0, { speed: 0, pitch: null }));
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const cb = useRef({ onEscape, onLand, onOpen, onFling });
  cb.current = { onEscape, onLand, onOpen, onFling };

  const phase = useRef<Phase>('shake');
  const [winner, setWinner] = useState<number | null>(null);
  const [showing, setShowing] = useState(false);
  const flungAt = useRef(0);
  const simTime = useRef(0);
  const display = useRef<THREE.Group>(null);
  const pick = useRef({ t: 0, from: new THREE.Vector3(), fromQ: new THREE.Quaternion() });
  const label = useLabelTexture(winner);

  const audio = useRef<AudioContext | null>(null);
  const lastClick = useRef(0);
  const click = (gain: number, low = false) => {
    if (!sound || hidden) return;
    try {
      audio.current ||= new AudioContext();
      const ctx = audio.current, osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime((low ? 180 : 420) + Math.random() * 260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(low ? 70 : 160, ctx.currentTime + .05);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.0008, ctx.currentTime + (low ? .12 : .06));
      osc.connect(g).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + .13);
    } catch { /* 声音是可选的 */ }
  };

  useEffect(() => { camera.position.copy(CAMERA); camera.lookAt(LOOK); }, [camera]);
  useEffect(() => () => { void audio.current?.close(); }, []);

  // 固定步长:驱动签筒、引导选中签
  useBeforePhysicsStep(() => {
    simTime.current += STEP;
    const m = motionRef.current;
    const shaking = phase.current === 'shake' && !hidden;
    const r = ctl.current.step(STEP, shaking ? { speed: m.energy, pitch: m.pitch } : { speed: 0, pitch: null });
    frame.current = r;
    cup.current?.setNextKinematicTranslation(r.pos);
    cup.current?.setNextKinematicRotation(r.quat);
    if (phase.current !== 'shake') return;
    const b = sticks.current[chosen];
    if (!b) return;
    const v = b.linvel(), ax = r.axis;
    const local = L.toCupLocal(b.translation(), r.pos, r.quat);
    const va = v.x * ax.x + v.y * ax.y + v.z * ax.z;
    if (r.engage > .3 && !guide.current.flung) b.collider(0).setCollisionGroups(L.GROUPS.chosen);
    const want = guide.current.step(STEP, ctl.current.energy, r.engage, local, va);
    if (!want) return;
    const radial = L.rotate(r.quat, { x: want.x, y: 0, z: want.z }), d = want.y - va, k = STEP * 20;
    const up = guide.current.flung ? L.TUNING.flingUp : 0; // 蹦出时额外向上,签从筒顶往上飞
    b.setLinvel({ x: v.x + ax.x * d + radial.x * k, y: v.y + ax.y * d + radial.y * k + up, z: v.z + ax.z * d + radial.z * k }, true);
    if (guide.current.flung) { b.collider(0).setCollisionGroups(L.GROUPS.flung); cb.current.onFling?.(); }
    if (!guide.current.flung) {
      const a = L.alignAngVel(b.rotation(), ax), w = b.angvel();
      b.setAngvel({ x: w.x * .9 + a.x * .1, y: w.y * .9 + a.y * .1, z: w.z * .9 + a.z * .1 }, true);
    }
  });

  // 判定甩出、落桌
  useAfterPhysicsStep(() => {
    const r = frame.current;
    if (phase.current === 'shake') {
      for (let i = 0; i < COUNT; i++) {
        const b = sticks.current[i];
        if (!b) continue;
        const l = L.toCupLocal(b.translation(), r.pos, r.quat);
        if (l.y > L.CUP.height + L.TUNING.escapeMargin) {
          phase.current = 'flung';
          ctl.current.locked = true;
          flungAt.current = simTime.current;
          b.collider(0).setCollisionGroups(L.GROUPS.flung);
          setWinner(i);
          cb.current.onEscape(i);
          return;
        }
      }
    } else if (phase.current === 'flung' && winner !== null) {
      const b = sticks.current[winner];
      if (!b) return;
      const v = b.linvel(), p = b.translation(), t = simTime.current - flungAt.current;
      if ((t > PICK_AFTER && v.y < .3) || t > PICK_TIMEOUT) {
        phase.current = 'pickup';
        const q = b.rotation();
        pick.current = { t: 0, from: new THREE.Vector3(p.x, p.y, p.z), fromQ: new THREE.Quaternion(q.x, q.y, q.z, q.w) };
        b.setEnabled(false);
        click(.05, true);
        setShowing(true);
      }
    }
  });

  // 摇动时的竹签碰撞声 + 拾起动画
  useFrame((state, dt) => {
    const e = ctl.current.energy * frame.current.engage;
    const now = state.clock.elapsedTime;
    if (phase.current === 'shake' && e > .3 && now - lastClick.current > .07 + Math.random() * .1) {
      lastClick.current = now;
      click(.012 + .02 * e);
    }
    const g = display.current;
    if (!g || !showing) return;
    const p = pick.current;
    p.t = Math.min(1, p.t + dt / .8);
    const s = p.t * p.t * (3 - 2 * p.t);
    const dir = LOOK.clone().sub(CAMERA).normalize();
    const to = CAMERA.clone().addScaledVector(dir, 1.75);
    // 展示在签筒右侧,避免挡住「灵签」和底部按钮;窄屏时往中间收
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    to.addScaledVector(right, Math.min(.32, .2 * (camera as THREE.PerspectiveCamera).aspect));
    to.y += .03 + Math.sin(now * 1.6) * .01 * s;
    g.scale.setScalar(1 - .22 * s);
    const toQ = camera.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.sin(now * .9) * .08 * s, -.08)));
    g.position.lerpVectors(p.from, to, s);
    g.quaternion.slerpQuaternions(p.fromQ, toQ, s);
    if (p.t >= 1 && phase.current === 'pickup' && winner !== null) {
      phase.current = 'shown';
      cb.current.onLand(winner);
    }
  });

  const stickMesh = parts.stick;
  const W = L.CUP.wall, rIn = L.CUP.rIn;
  const openLot = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (phase.current === 'shown') cb.current.onOpen(); };

  return <>
    <ambientLight intensity={.7} />
    <hemisphereLight args={['#fff4e4', '#8a6a50', .7]} />
    <directionalLight position={[1.8, 3.2, 3.4]} intensity={2.6} color="#fff0dc" />
    <pointLight position={[-2, 1.4, 1.2]} intensity={2.2} color="#ffd2a0" distance={6} />
    <pointLight position={[0, 1.6, -2]} intensity={2} color="#ffe0b8" distance={6} />
    <>
      <RigidBody ref={cup} type="kinematicPosition" colliders={false}>
        {parts.cupOuter && <primitive object={parts.cupOuter} />}
        {parts.cupInner && <primitive object={parts.cupInner} />}
        {parts.cupRim && <primitive object={parts.cupRim} />}
        <CylinderCollider args={[L.CUP.floor / 2, rIn + 2 * W]} position={[0, L.CUP.floor / 2, 0]} friction={.45} collisionGroups={L.GROUPS.cup} />
        {WALLS.map((w, i) => <CuboidCollider key={i} args={[w.half.x, w.half.y, w.half.z]} position={[w.pos.x, w.pos.y, w.pos.z]}
          rotation={[0, w.yaw, 0]} friction={.45} restitution={.05} collisionGroups={L.GROUPS.cup} />)}
      </RigidBody>
      {Array.from({ length: COUNT }, (_, i) => {
        const s = L.stickStart(i);
        return <RigidBody key={i} ref={b => { sticks.current[i] = b; }} colliders={false} ccd
          position={[s.x, s.y, s.z]} rotation={[0, s.yaw, 0]} angularDamping={.4}>
          {stickMesh && !(showing && winner === i) && <primitive object={stickMesh.clone()} />}
          <CuboidCollider args={[L.STICK.width / 2, L.STICK.length / 2, L.STICK.colliderThick / 2]} density={L.STICK.density}
            friction={.3} restitution={.05} collisionGroups={L.GROUPS.stick} />
        </RigidBody>;
      })}
    </>
    {showing && stickMesh && <group ref={display} onClick={openLot}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <primitive object={stickMesh.clone()} />
      {label && <mesh position={[0, .12, L.STICK.thick / 2 + .0006]}>
        <planeGeometry args={[L.STICK.width * .85, L.STICK.width * .85 * 10]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>}
      {/* 加大点击热区,手机上更容易点中 */}
      <mesh><boxGeometry args={[.2, 1.05, .1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    </group>}
    <ContactShadows position={[0, -.06, 0]} opacity={.22} scale={2.4} blur={2.8} far={1.2} />
    <color attach="background" args={[BG]} />
  </>;
}

export default function FortuneScene(props: Props) {
  const [dpr, setDpr] = useState<[number, number]>([1, 1.75]);
  return <Canvas dpr={dpr} camera={{ position: CAMERA.toArray(), fov: 40 }} gl={{ antialias: true }}>
    <PerformanceMonitor onIncline={() => setDpr([1, 2])} onDecline={() => setDpr([1, 1.2])} />
    {/* Physics 必须包在 Scene 外面:Scene 里的 useBeforePhysicsStep/useAfterPhysicsStep 需要 Physics 上下文 */}
    <Physics gravity={[0, -L.GRAVITY, 0]} timeStep={STEP} paused={props.hidden}>
      <Scene {...props} />
    </Physics>
  </Canvas>;
}

useGLTF.preload('/assets/fortune-lots.glb');
