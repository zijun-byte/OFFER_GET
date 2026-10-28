/**
 * 摇签控制器:纯数学逻辑,不依赖 React,方便在 Node 中用同一份代码离线调参。
 *
 * 模型:签筒是运动学刚体,正对镜头,绕筒底下方的支点前后摆(筒口朝用户俯下、再抬起)。
 * 用户输入(鼠标拖动或手机晃动)转成 energy 和倾角。
 * 真实求签时签是靠颠动的惯性一点点"窜"出来的;为让每次只出一支、时长可控,
 * 预选的那支签由 ChosenGuide 沿筒轴慢慢推出筒顶(相当于它恰好被挤到最外侧)。
 */
// 碰撞体比可视模型厚:实测薄壁/薄签在倾斜时会被签堆挤穿筒壁(32 段、壁厚 .04、签厚 .02 时 12 秒内零泄漏)
export const CUP = { rIn: 0.22, wall: 0.04, height: 0.72, floor: 0.06, segments: 32 } as const;
export const STICK = { length: 1.0, width: 0.045, thick: 0.01, colliderThick: 0.02, density: 400 } as const;
export const LOT_COUNT = 48;

/** Rapier 碰撞分组(高 16 位 membership,低 16 位 filter)。 */
export const GROUPS = {
  cup: 0x0001ffff, // 签筒:与所有物体碰撞
  stick: 0x00020003, // 普通签:与签筒、其它签碰撞
  chosen: 0x00040001, // 正在外窜的签:只与签筒碰撞,避免被签堆压住
  flung: 0x00040000, // 已甩出的签:不再碰撞任何物体(没有桌子,飞出后直接被拾起)
} as const;
export const GRAVITY = 30;

const DEG = Math.PI / 180;
export const TUNING = {
  // 签筒始终正对镜头(不绕竖轴转),只绕底部下方的"手腕"支点前后摆:筒口朝用户俯下再抬起,走一段上下弧线
  baseTilt: 27 * DEG, // 摇动时的平均前倾角
  swingAmp: 8.6 * DEG, // 自动摇动(手机晃动/帮我摇签)时的弧线摆幅
  dragTilt: 32 * DEG, // 拖动满幅对应的额外倾角
  tiltRange: [-12 * DEG, 52 * DEG] as const, // 倾角上下限(52° 以内签不会自己滑出)
  pivotDepth: 0.32, // 支点在筒底下方的距离(m),越大弧线越明显
  lift: 0.1, // 投入时整体抬高
  tiltFollow: 14, // 倾角跟随速度
  strokeAmp: 0.025, // 沿筒轴的颠动振幅(m),让签在筒里磕碰
  strokeHz: 4.2, // 摆动频率
  engageUp: 2.6,
  engageDown: 1.4,
  energyDecay: 2.2,
  escapeMargin: 0.03, // 签中心越过筒口这么多即判定甩出
  creepPerSec: 0.16, // 满能量时选中签沿筒轴外窜的速度(m/s),约 2~3 秒出筒
  creepGain: 14, // 速度跟踪增益
  flingSpeed: 1.6, // 越过筒口后沿筒轴的甩出速度
  flingUp: 2.2, // 甩出时额外的向上速度:签从筒顶往上蹦出
};

/**
 * 选中签的引导:每帧根据摇动能量推进"外窜进度",
 * 返回该签沿筒轴应有的速度。签仍是动力学刚体,会和其它签、筒壁正常碰撞。
 */
export class ChosenGuide {
  progress = 0; // 目标:签中心在筒局部坐标中的 y
  started = false;
  flung = false;

  /**
   * @param local 签中心在签筒局部坐标中的位置
   * @param axialVel 签沿筒轴的当前速度
   * @returns 期望的局部速度(x/z 把签拉回筒心,y 沿筒轴外窜),不需要干预时返回 null
   */
  step(dt: number, energy: number, engage: number, local: Vec3, axialVel: number): Vec3 | null {
    if (this.flung) return null;
    if (!this.started) { this.progress = local.y; this.started = true; }
    const drive = energy * engage;
    const active = drive > 0.1;
    // 摇得越猛窜得越快,但慢摇也有下限,保证最终能出签
    if (active) this.progress += dt * TUNING.creepPerSec * (0.45 + 0.55 * Math.min(1, drive));
    else this.progress = Math.max(local.y, this.progress - dt * 0.05);
    if (local.y > CUP.height + TUNING.escapeMargin - 0.02) {
      this.flung = true;
      return { x: 0, y: TUNING.flingSpeed, z: 0 };
    }
    if (!active) return null;
    const want = Math.max(-0.3, Math.min(1.2, (this.progress - local.y) * TUNING.creepGain));
    const r = Math.hypot(local.x, local.z);
    const pull = r > 0.12 ? (r - 0.12) * 6 : 0; // 只在贴壁/斜搭时往中心拉
    return { x: r > 0 ? (-local.x / r) * pull : 0, y: Math.max(axialVel, want), z: r > 0 ? (-local.z / r) * pull : 0 };
  }
}

/** 让签的长轴(局部 y)转向签筒轴,返回角速度修正量。 */
export function alignAngVel(stickQuat: Quat, cupAxis: Vec3, gain = 5): Vec3 {
  const up = rotate(stickQuat, { x: 0, y: 1, z: 0 });
  const s = up.x * cupAxis.x + up.y * cupAxis.y + up.z * cupAxis.z >= 0 ? 1 : -1; // 签两头对称,取近的方向
  return {
    x: (up.y * cupAxis.z - up.z * cupAxis.y) * gain * s,
    y: (up.z * cupAxis.x - up.x * cupAxis.z) * gain * s,
    z: (up.x * cupAxis.y - up.y * cupAxis.x) * gain * s,
  };
}

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };

/**
 * speed:摇动能量 0..1。
 * pitch:拖动给出的前后位置 -1..1(正值 = 筒口朝用户俯下);null 表示没有拖动,由控制器自动走弧线。
 */
export type ShakeInput = { speed: number; pitch: number | null };

export class ShakeController {
  energy = 0;
  engage = 0;
  phase = 0;
  tilt = 0;
  locked = false;

  /** 推进一帧,返回签筒位姿。签筒只绕 x 轴转,"灵签"面始终朝向镜头。 */
  step(dt: number, input: ShakeInput) {
    const target = this.locked ? 0 : Math.min(1, input.speed);
    // energy 快升慢降
    this.energy = target > this.energy ? this.energy + (target - this.energy) * Math.min(1, dt * 10) : this.energy * Math.exp(-dt * TUNING.energyDecay);
    const dragging = !this.locked && input.pitch !== null;
    const want = !this.locked && (this.energy > 0.12 || dragging) ? 1 : 0;
    this.engage += (want - this.engage) * Math.min(1, dt * (want ? TUNING.engageUp : TUNING.engageDown));
    const e = this.engage * this.engage * (3 - 2 * this.engage);

    this.phase += dt * TUNING.strokeHz * Math.PI * 2 * (0.6 + 0.4 * this.energy);
    // 倾角:拖动时跟手;否则以 baseTilt 为中心按 phase 前后摆
    const goal = dragging
      ? TUNING.baseTilt * e + TUNING.dragTilt * (input.pitch as number)
      : (TUNING.baseTilt + TUNING.swingAmp * this.energy * Math.sin(this.phase)) * e;
    const clamped = Math.max(TUNING.tiltRange[0], Math.min(TUNING.tiltRange[1], goal));
    this.tilt += (clamped - this.tilt) * Math.min(1, dt * TUNING.tiltFollow);

    // 绕 x 轴正转 → 筒轴 (0,1,0) 变为 (0,cos,sin),筒口朝 +z(镜头)
    const q = quatFromEulerXZ(this.tilt, 0);
    const axis = rotate(q, { x: 0, y: 1, z: 0 });
    // 支点在筒底正下方 pivotDepth 处:筒绕它转,筒身走上下弧线
    const d = TUNING.pivotDepth;
    const stroke = TUNING.strokeAmp * this.energy * e * Math.sin(this.phase * 2);
    const pos: Vec3 = {
      x: 0,
      y: TUNING.lift * e - d + axis.y * (d + stroke),
      z: axis.z * (d + stroke),
    };
    return { pos, quat: q, axis, engage: e };
  }
}

export function quatFromEulerXZ(x: number, z: number): Quat {
  // 先 z 后 x(XYZ 顺序,y=0)
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2), cz = Math.cos(z / 2), sz = Math.sin(z / 2);
  return { x: sx * cz, y: -sx * sz, z: cx * sz, w: cx * cz };
}

export function rotate(q: Quat, v: Vec3): Vec3 {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y;
  const iy = q.w * v.y + q.z * v.x - q.x * v.z;
  const iz = q.w * v.z + q.x * v.y - q.y * v.x;
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

/** 世界坐标点转到签筒局部坐标(用于判断签是否越过筒口)。 */
export function toCupLocal(p: Vec3, cupPos: Vec3, cupQuat: Quat): Vec3 {
  const inv = { x: -cupQuat.x, y: -cupQuat.y, z: -cupQuat.z, w: cupQuat.w };
  return rotate(inv, { x: p.x - cupPos.x, y: p.y - cupPos.y, z: p.z - cupPos.z });
}

/** 签在筒内的初始摆放(黄金角螺旋,避免重叠)。 */
export function stickStart(i: number) {
  const a = i * 2.39996, r = Math.sqrt((i + 0.5) / LOT_COUNT) * 0.17;
  return { x: Math.cos(a) * r, y: CUP.floor + STICK.length / 2 + 0.004 + (i % 6) * 0.012, z: Math.sin(a) * r, yaw: a + Math.PI / 2 };
}

/** 签筒壁碰撞体参数(多边形拼成圆筒)。 */
export function wallSegments() {
  const out: { pos: Vec3; yaw: number; half: Vec3 }[] = [];
  const n = CUP.segments, r = CUP.rIn + CUP.wall, hw = (CUP.rIn + 2 * CUP.wall) * Math.tan(Math.PI / n) + 0.006;
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n;
    out.push({ pos: { x: Math.sin(a) * r, y: (CUP.height + CUP.floor) / 2, z: Math.cos(a) * r }, yaw: a, half: { x: hw, y: (CUP.height - CUP.floor) / 2, z: CUP.wall } });
  }
  return out;
}
