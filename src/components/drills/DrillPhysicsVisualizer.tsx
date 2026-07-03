import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { Drill } from '../../types/models';

interface DrillPhysicsVisualizerProps {
  drill: Drill;
  height?: number;
}

const TABLE_LENGTH = 100;
const TABLE_WIDTH = 50;
const BALL_RADIUS = 1.125;
const BALL_MASS = 0.17;
const RAIL_THICKNESS = 2;
const RAIL_HEIGHT = 1.8;
const POCKET_RADIUS = 2.45;
const OPENING_HALF_WIDTH = 4;
const CORNER_OPENING_DEPTH = 8;
const SIDE_OPENING_DEPTH = 8;
const MIN_MOVING_SPEED = 0.08;
const DEFAULT_SHOT_SPEED = 52;
const MAX_TIP_OFFSET = 0.82;
const SAFE_TIP_RADIUS = 0.55;
const WARNING_TIP_RADIUS = 0.7;

interface ShotControls {
  speed: number;
}

interface TipOffset {
  x: number;
  y: number;
}

type ClothPresetId = 'pro-fast' | 'medium-house' | 'worn-slow';

interface ClothPreset {
  id: ClothPresetId;
  label: string;
  railRestitution: number;
  railFriction: number;
  clothFriction: number;
  dragPerSecond: number;
  sideSpinDecayPerSecond: number;
  topSpinDecayPerSecond: number;
  railEnglishTransfer: number;
  followDrawTransfer: number;
}

const CLOTH_PRESETS: Record<ClothPresetId, ClothPreset> = {
  'pro-fast': {
    id: 'pro-fast',
    label: 'Pro Fast (Simonis-style)',
    railRestitution: 0.92,
    railFriction: 0.03,
    clothFriction: 0.11,
    dragPerSecond: 0.66,
    sideSpinDecayPerSecond: 1.25,
    topSpinDecayPerSecond: 1.0,
    railEnglishTransfer: 1.25,
    followDrawTransfer: 2.5,
  },
  'medium-house': {
    id: 'medium-house',
    label: 'Medium House Cloth',
    railRestitution: 0.9,
    railFriction: 0.04,
    clothFriction: 0.16,
    dragPerSecond: 0.92,
    sideSpinDecayPerSecond: 1.8,
    topSpinDecayPerSecond: 1.4,
    railEnglishTransfer: 1.15,
    followDrawTransfer: 2.2,
  },
  'worn-slow': {
    id: 'worn-slow',
    label: 'Worn Slow Cloth',
    railRestitution: 0.86,
    railFriction: 0.06,
    clothFriction: 0.24,
    dragPerSecond: 1.28,
    sideSpinDecayPerSecond: 2.55,
    topSpinDecayPerSecond: 2.15,
    railEnglishTransfer: 0.95,
    followDrawTransfer: 1.7,
  },
};

type Pocket = { x: number; z: number; r: number };

type BallRuntime = {
  id: string;
  body: CANNON.Body;
  mesh: THREE.Mesh;
  startPosition: CANNON.Vec3;
  role: 'cue' | 'object' | 'target' | 'marker';
};

function toWorldX(diagramX: number): number {
  return diagramX - TABLE_LENGTH / 2;
}

function toWorldZ(diagramY: number): number {
  return diagramY - TABLE_WIDTH / 2;
}

function ballColor(role: BallRuntime['role']): string {
  if (role === 'cue') return '#f4f6fa';
  if (role === 'object') return '#f4d35e';
  if (role === 'target') return '#57d3ff';
  return '#9aa4b2';
}

function createRailSegment(
  world: CANNON.World,
  scene: THREE.Scene,
  width: number,
  depth: number,
  x: number,
  z: number,
  material: CANNON.Material,
): void {
  const body = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(width / 2, RAIL_HEIGHT / 2, depth / 2)),
    material,
  });
  body.position.set(x, BALL_RADIUS, z);
  world.addBody(body);

  const railMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, RAIL_HEIGHT, depth),
    new THREE.MeshStandardMaterial({ color: '#2a3344', roughness: 0.7, metalness: 0.1 }),
  );
  railMesh.position.set(x, BALL_RADIUS, z);
  railMesh.castShadow = true;
  railMesh.receiveShadow = true;
  scene.add(railMesh);
}

export function DrillPhysicsVisualizer({ drill, height = 380 }: DrillPhysicsVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<CANNON.World | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballsRef = useRef<Map<string, BallRuntime>>(new Map());
  const pocketsRef = useRef<Pocket[]>([]);
  const cueBallIdRef = useRef<string | null>(null);
  const sideSpinRef = useRef(0);
  const topSpinRef = useRef(0);
  const followDrawPendingRef = useRef(false);
  const isRunningRef = useRef(false);
  const tipPadRef = useRef<HTMLDivElement | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [clothPresetId, setClothPresetId] = useState<ClothPresetId>('medium-house');
  const [tipOffset, setTipOffset] = useState<TipOffset>({ x: 0, y: 0 });
  const [shotControls, setShotControls] = useState<ShotControls>({
    speed: DEFAULT_SHOT_SPEED,
  });

  const clothPreset = useMemo(() => CLOTH_PRESETS[clothPresetId], [clothPresetId]);
  const derivedSideSpin = tipOffset.x * 1.2;
  const derivedTopSpin = tipOffset.y * 1.2;
  const tipRadius = Math.hypot(tipOffset.x, tipOffset.y);
  const transferEfficiency = useMemo(() => {
    if (tipRadius <= SAFE_TIP_RADIUS) return 1;
    if (tipRadius >= MAX_TIP_OFFSET) return 0.72;
    const t = (tipRadius - SAFE_TIP_RADIUS) / (MAX_TIP_OFFSET - SAFE_TIP_RADIUS);
    return 1 - t * 0.28;
  }, [tipRadius]);
  const edgeInstability = useMemo(() => {
    if (tipRadius <= WARNING_TIP_RADIUS) return 0;
    const t = (tipRadius - WARNING_TIP_RADIUS) / (MAX_TIP_OFFSET - WARNING_TIP_RADIUS);
    return Math.min(0.38, Math.max(0, t) * 0.38);
  }, [tipRadius]);

  const updateTipOffsetFromEvent = (clientX: number, clientY: number) => {
    const pad = tipPadRef.current;
    if (!pad) return;

    const rect = pad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normalizedX = (clientX - centerX) / (rect.width / 2);
    const normalizedY = (centerY - clientY) / (rect.height / 2);
    const radius = Math.hypot(normalizedX, normalizedY);

    if (radius <= MAX_TIP_OFFSET) {
      setTipOffset({ x: normalizedX, y: normalizedY });
      return;
    }

    const scale = MAX_TIP_OFFSET / radius;
    setTipOffset({ x: normalizedX * scale, y: normalizedY * scale });
  };

  const shotVector = useMemo(() => {
    if (!drill.diagram) return null;

    const cueBall = drill.diagram.balls.find((ball) => ball.role === 'cue');
    if (!cueBall) return null;

    const aimPath = drill.diagram.paths.find((path) => {
      if (path.role !== 'aim') return false;
      const dx = path.from.x - cueBall.x;
      const dz = path.from.y - cueBall.y;
      return Math.hypot(dx, dz) < 4;
    });

    if (aimPath) {
      return {
        x: toWorldX(aimPath.to.x) - toWorldX(cueBall.x),
        z: toWorldZ(aimPath.to.y) - toWorldZ(cueBall.y),
      };
    }

    const fallbackPath = drill.diagram.paths.find((path) => path.role === 'cue-path' || path.role === 'route');
    if (!fallbackPath) return null;

    return {
      x: toWorldX(fallbackPath.to.x) - toWorldX(cueBall.x),
      z: toWorldZ(fallbackPath.to.y) - toWorldZ(cueBall.y),
    };
  }, [drill.diagram]);

  useEffect(() => {
    if (!containerRef.current || !drill.diagram) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#06111d');

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
    camera.position.set(0, 90, 58);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const resize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const hemiLight = new THREE.HemisphereLight('#7dd3fc', '#0f172a', 0.5);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight('#f8fafc', 0.95);
    keyLight.position.set(20, 80, 20);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const tableBase = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE_LENGTH + 6, 2.4, TABLE_WIDTH + 6),
      new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.8, metalness: 0.1 }),
    );
    tableBase.position.set(0, -0.7, 0);
    tableBase.receiveShadow = true;
    scene.add(tableBase);

    const felt = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE_LENGTH, TABLE_WIDTH),
      new THREE.MeshStandardMaterial({ color: '#0b7a53', roughness: 0.95, metalness: 0 }),
    );
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = 0;
    felt.receiveShadow = true;
    scene.add(felt);

    const world = new CANNON.World();
    world.gravity.set(0, 0, 0);
    (world.solver as CANNON.GSSolver).iterations = 12;
    world.allowSleep = true;
    worldRef.current = world;

    const ballMaterial = new CANNON.Material('ball');
    const railMaterial = new CANNON.Material('rail');
    const feltMaterial = new CANNON.Material('felt');

    world.addContactMaterial(
      new CANNON.ContactMaterial(ballMaterial, railMaterial, {
        restitution: clothPreset.railRestitution,
        friction: clothPreset.railFriction,
      }),
    );

    world.addContactMaterial(
      new CANNON.ContactMaterial(ballMaterial, feltMaterial, {
        restitution: 0,
        friction: clothPreset.clothFriction,
      }),
    );

    const floor = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: feltMaterial });
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floor);

    createRailSegment(world, scene, 38, RAIL_THICKNESS, -23, -TABLE_WIDTH / 2 - RAIL_THICKNESS / 2, railMaterial);
    createRailSegment(world, scene, 38, RAIL_THICKNESS, 23, -TABLE_WIDTH / 2 - RAIL_THICKNESS / 2, railMaterial);
    createRailSegment(world, scene, 38, RAIL_THICKNESS, -23, TABLE_WIDTH / 2 + RAIL_THICKNESS / 2, railMaterial);
    createRailSegment(world, scene, 38, RAIL_THICKNESS, 23, TABLE_WIDTH / 2 + RAIL_THICKNESS / 2, railMaterial);
    createRailSegment(world, scene, RAIL_THICKNESS, 13, -TABLE_LENGTH / 2 - RAIL_THICKNESS / 2, -10.5, railMaterial);
    createRailSegment(world, scene, RAIL_THICKNESS, 13, -TABLE_LENGTH / 2 - RAIL_THICKNESS / 2, 10.5, railMaterial);
    createRailSegment(world, scene, RAIL_THICKNESS, 13, TABLE_LENGTH / 2 + RAIL_THICKNESS / 2, -10.5, railMaterial);
    createRailSegment(world, scene, RAIL_THICKNESS, 13, TABLE_LENGTH / 2 + RAIL_THICKNESS / 2, 10.5, railMaterial);

    const pocketOpenings = [
      { x: -TABLE_LENGTH / 2 + OPENING_HALF_WIDTH, z: -TABLE_WIDTH / 2 + CORNER_OPENING_DEPTH / 2 },
      { x: 0, z: -TABLE_WIDTH / 2 + SIDE_OPENING_DEPTH / 2 },
      { x: TABLE_LENGTH / 2 - OPENING_HALF_WIDTH, z: -TABLE_WIDTH / 2 + CORNER_OPENING_DEPTH / 2 },
      { x: -TABLE_LENGTH / 2 + OPENING_HALF_WIDTH, z: TABLE_WIDTH / 2 - CORNER_OPENING_DEPTH / 2 },
      { x: 0, z: TABLE_WIDTH / 2 - SIDE_OPENING_DEPTH / 2 },
      { x: TABLE_LENGTH / 2 - OPENING_HALF_WIDTH, z: TABLE_WIDTH / 2 - CORNER_OPENING_DEPTH / 2 },
    ];

    pocketsRef.current = pocketOpenings.map((pocket) => ({ ...pocket, r: POCKET_RADIUS }));

    pocketOpenings.forEach((pocket) => {
      const pocketMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(POCKET_RADIUS, POCKET_RADIUS * 1.1, 0.8, 24),
        new THREE.MeshStandardMaterial({ color: '#020617', roughness: 0.9, metalness: 0 }),
      );
      pocketMesh.position.set(pocket.x, -0.25, pocket.z);
      scene.add(pocketMesh);
    });

    const balls = new Map<string, BallRuntime>();
    const cueBall = drill.diagram.balls.find((ball) => ball.role === 'cue');
    cueBallIdRef.current = cueBall?.id ?? null;

    drill.diagram.balls.forEach((ball) => {
      const x = toWorldX(ball.x);
      const z = toWorldZ(ball.y);
      const body = new CANNON.Body({
        mass: BALL_MASS,
        shape: new CANNON.Sphere(BALL_RADIUS),
        material: ballMaterial,
        linearDamping: 0,
        angularDamping: 0,
        allowSleep: true,
        sleepTimeLimit: 0.6,
        sleepSpeedLimit: 0.06,
      });
      body.position.set(x, BALL_RADIUS, z);
      world.addBody(body);

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(BALL_RADIUS, 36, 36),
        new THREE.MeshStandardMaterial({ color: ballColor(ball.role), roughness: 0.28, metalness: 0.18 }),
      );
      mesh.position.set(x, BALL_RADIUS, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      balls.set(ball.id, {
        id: ball.id,
        body,
        mesh,
        startPosition: new CANNON.Vec3(x, BALL_RADIUS, z),
        role: ball.role,
      });
    });

    const cueRuntime = cueBallIdRef.current ? balls.get(cueBallIdRef.current) : undefined;
    if (cueRuntime) {
      cueRuntime.body.addEventListener('collide', (event: any) => {
        const other = event.body;
        const contact = event.contact;
        if (!contact) return;

        const normal = new CANNON.Vec3();
        if (contact.bi.id === cueRuntime.body.id) {
          contact.ni.scale(-1, normal);
        } else {
          normal.copy(contact.ni);
        }

        const isRailHit = other.mass === 0;
        if (isRailHit && Math.abs(sideSpinRef.current) > 0.04) {
          const tangent = new CANNON.Vec3(-normal.z, 0, normal.x);
          const englishKick = sideSpinRef.current * clothPreset.railEnglishTransfer;
          cueRuntime.body.velocity.x += tangent.x * englishKick;
          cueRuntime.body.velocity.z += tangent.z * englishKick;
          sideSpinRef.current *= 0.82;
        }

        const isBallHit = other.mass > 0;
        if (isBallHit && followDrawPendingRef.current && Math.abs(topSpinRef.current) > 0.03) {
          const speed = cueRuntime.body.velocity.length();
          if (speed > 0.001) {
            const dirX = cueRuntime.body.velocity.x / speed;
            const dirZ = cueRuntime.body.velocity.z / speed;
            const followDrawKick = topSpinRef.current * clothPreset.followDrawTransfer;
            cueRuntime.body.velocity.x += dirX * followDrawKick;
            cueRuntime.body.velocity.z += dirZ * followDrawKick;
          }
          followDrawPendingRef.current = false;
        }
      });
    }

    ballsRef.current = balls;

    let animationId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 1 / 30);

      world.step(1 / 120, dt, 4);

      let movingBalls = 0;
      balls.forEach((runtime) => {
        runtime.body.position.y = BALL_RADIUS;
        runtime.body.velocity.y = 0;

        const speed = runtime.body.velocity.length();
        if (speed > 0) {
          const dragScale = Math.max(0, 1 - dt * clothPreset.dragPerSecond);
          runtime.body.velocity.scale(dragScale, runtime.body.velocity);
        }

        if (speed > MIN_MOVING_SPEED) {
          movingBalls += 1;
          const isCueBall = cueBallIdRef.current === runtime.id;
          if (isCueBall) {
            const rollX = -runtime.body.velocity.z / BALL_RADIUS;
            const rollZ = runtime.body.velocity.x / BALL_RADIUS;
            runtime.body.angularVelocity.set(rollX, sideSpinRef.current * 8, rollZ);
            sideSpinRef.current *= Math.max(0.955, 1 - dt * clothPreset.sideSpinDecayPerSecond);
            topSpinRef.current *= Math.max(0.96, 1 - dt * clothPreset.topSpinDecayPerSecond);
          } else {
            runtime.body.angularVelocity.set(-runtime.body.velocity.z / BALL_RADIUS, 0, runtime.body.velocity.x / BALL_RADIUS);
          }
        } else {
          runtime.body.velocity.set(0, 0, 0);
          runtime.body.angularVelocity.set(0, 0, 0);
        }

        if (runtime.mesh.visible) {
          for (const pocket of pocketsRef.current) {
            const dx = runtime.body.position.x - pocket.x;
            const dz = runtime.body.position.z - pocket.z;
            if (Math.hypot(dx, dz) <= pocket.r) {
              runtime.mesh.visible = false;
              runtime.body.sleep();
              runtime.body.velocity.set(0, 0, 0);
              runtime.body.angularVelocity.set(0, 0, 0);
              runtime.body.position.set(999, BALL_RADIUS, 999);
              break;
            }
          }
        }

        runtime.mesh.position.set(runtime.body.position.x, runtime.body.position.y, runtime.body.position.z);
        runtime.mesh.quaternion.set(
          runtime.body.quaternion.x,
          runtime.body.quaternion.y,
          runtime.body.quaternion.z,
          runtime.body.quaternion.w,
        );
      });

      if (isRunningRef.current && movingBalls === 0) {
        isRunningRef.current = false;
        setIsRunning(false);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      ballsRef.current.clear();
      pocketsRef.current = [];
      worldRef.current = null;
    };
  }, [drill.diagram, height, clothPreset]);

  const resetBalls = () => {
    const balls = ballsRef.current;
    balls.forEach((runtime) => {
      runtime.mesh.visible = true;
      runtime.body.wakeUp();
      runtime.body.velocity.set(0, 0, 0);
      runtime.body.angularVelocity.set(0, 0, 0);
      runtime.body.position.copy(runtime.startPosition);
      runtime.body.quaternion.set(0, 0, 0, 1);
      runtime.mesh.position.set(runtime.startPosition.x, runtime.startPosition.y, runtime.startPosition.z);
      runtime.mesh.quaternion.set(0, 0, 0, 1);
    });
    sideSpinRef.current = 0;
    topSpinRef.current = 0;
    followDrawPendingRef.current = false;
    isRunningRef.current = false;
    setIsRunning(false);
  };

  const simulateShot = () => {
    if (!drill.diagram) return;
    resetBalls();

    const cueBall = drill.diagram.balls.find((ball) => ball.role === 'cue');
    if (!cueBall || !shotVector) return;

    const cueBody = ballsRef.current.get(cueBall.id)?.body;
    if (!cueBody) return;

    const length = Math.hypot(shotVector.x, shotVector.z);
    if (length < 0.001) return;

    const efficiency = transferEfficiency;
    const speed = shotControls.speed * efficiency;
    const spinSide = derivedSideSpin * efficiency;
    const spinTop = derivedTopSpin * efficiency;

    const shotDirX = shotVector.x / length;
    const shotDirZ = shotVector.z / length;

    cueBody.velocity.set(shotDirX * speed, 0, shotDirZ * speed);
    sideSpinRef.current = spinSide;
    topSpinRef.current = spinTop;
    followDrawPendingRef.current = true;

    cueBody.angularVelocity.set(
      -shotDirZ * speed / BALL_RADIUS,
      spinSide * 8,
      shotDirX * speed / BALL_RADIUS + spinTop * 5,
    );
    cueBody.wakeUp();
    isRunningRef.current = true;
    setIsRunning(true);
  };

  if (!drill.diagram) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="w-full overflow-hidden rounded-xl border border-felt-600 bg-[#06111d]" style={{ height }} />
      <div className="rounded-xl border border-felt-600 bg-felt-900/60 p-3">
        <label className="block text-xs text-ivory-100">
          Table Preset
          <select
            value={clothPresetId}
            onChange={(event) => setClothPresetId(event.target.value as ClothPresetId)}
            className="mt-1 min-h-11 w-full rounded-lg border border-felt-500 bg-felt-800 px-3 text-sm text-ivory-100"
          >
            <option value="pro-fast">{CLOTH_PRESETS['pro-fast'].label}</option>
            <option value="medium-house">{CLOTH_PRESETS['medium-house'].label}</option>
            <option value="worn-slow">{CLOTH_PRESETS['worn-slow'].label}</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-felt-600 bg-felt-900/60 p-3 sm:grid-cols-2">
        <label className="text-xs text-ivory-100">
          Speed: {shotControls.speed.toFixed(0)}
          <input
            type="range"
            min={30}
            max={70}
            step={1}
            value={shotControls.speed}
            onChange={(event) => setShotControls((prev) => ({ ...prev, speed: Number(event.target.value) }))}
            className="mt-1 w-full"
          />
        </label>
        <div className="text-xs text-ivory-100">
          Cue Tip Offset
          <div className="mt-2 flex items-center gap-3">
            <div
              ref={tipPadRef}
              className="relative h-28 w-28 rounded-full border border-felt-500 bg-felt-800"
              onPointerDown={(event) => updateTipOffsetFromEvent(event.clientX, event.clientY)}
              onPointerMove={(event) => {
                if (event.buttons === 1) {
                  updateTipOffsetFromEvent(event.clientX, event.clientY);
                }
              }}
            >
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-emerald-400/70"
                style={{
                  width: `${SAFE_TIP_RADIUS * 100}%`,
                  height: `${SAFE_TIP_RADIUS * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-amber-300/70"
                style={{
                  width: `${WARNING_TIP_RADIUS * 100}%`,
                  height: `${WARNING_TIP_RADIUS * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-rose-400/75"
                style={{
                  width: `${MAX_TIP_OFFSET * 100}%`,
                  height: `${MAX_TIP_OFFSET * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ivory-100" />
              <div
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-900 bg-cue-300"
                style={{
                  left: `${50 + tipOffset.x * 50}%`,
                  top: `${50 - tipOffset.y * 50}%`,
                }}
              />
            </div>
            <div className="space-y-1">
              <p>Side Spin: {derivedSideSpin.toFixed(2)}</p>
              <p>Draw/Follow: {derivedTopSpin.toFixed(2)}</p>
              <p>Transfer: {(transferEfficiency * 100).toFixed(0)}%</p>
              <p>Edge Instability: {(edgeInstability * 100).toFixed(0)}%</p>
              <button
                type="button"
                onClick={() => setTipOffset({ x: 0, y: 0 })}
                className="min-h-11 rounded-lg border border-felt-500 bg-felt-800 px-3 py-1 text-xs text-ivory-100 hover:bg-felt-700"
              >
                Center Tip
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={simulateShot}
          disabled={isRunning}
          className="min-h-11 flex-1 rounded-xl bg-cue-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? 'Simulation Running...' : 'Run Physics Shot'}
        </button>
        <button
          onClick={resetBalls}
          className="min-h-11 rounded-xl border border-felt-500 bg-felt-800 px-4 py-2 text-sm font-semibold text-ivory-100 transition hover:bg-felt-700"
        >
          Reset
        </button>
      </div>
      <p className="text-xs text-chalk-300">
        Simulation is deterministic for drill demonstration: rigid-body collisions, live pocketing, calibrated table presets, and strike-point transfer scaling.
      </p>
    </div>
  );
}
