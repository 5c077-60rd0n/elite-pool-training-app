import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { Drill } from '../../types/models';

interface DrillPhysicsVisualizerProps {
  drill: Drill;
  width?: number;
  height?: number;
}

export const DrillPhysicsVisualizer: React.FC<DrillPhysicsVisualizerProps> = ({
  drill,
  width = 640,
  height = 400,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<CANNON.World | null>(null);
  const ballBodiesRef = useRef<Map<string, CANNON.Body>>(new Map());
  const ballMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // === SCENE SETUP ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a4d2e); // Pool felt green
    sceneRef.current = scene;

    // === CAMERA ===
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(50, 60, 60);
    camera.lookAt(50, 0, 25);

    // === RENDERER ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // === LIGHTING ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(40, 50, 40);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // === PHYSICS WORLD ===
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.defaultContactMaterial.friction = 0.3;
    worldRef.current = world;

    // === CREATE POOL TABLE ===
    // Table dimensions: 100 x 50 (in inches, representing 9ft table)
    const tableLength = 100;
    const tableWidth = 50;
    const tableHeight = 2.8;
    const railHeight = 1.25;

    // Table surface
    const tableGeometry = new THREE.BoxGeometry(tableLength, tableHeight, tableWidth);
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a3d, roughness: 0.8 });
    const tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
    tableMesh.position.y = tableHeight / 2;
    tableMesh.castShadow = true;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    // Playing surface (felt)
    const feltGeometry = new THREE.PlaneGeometry(tableLength, tableWidth);
    const feltMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4d2e,
      roughness: 0.9,
      metalness: 0,
    });
    const feltMesh = new THREE.Mesh(feltGeometry, feltMaterial);
    feltMesh.position.y = tableHeight + 0.01;
    feltMesh.rotation.x = -Math.PI / 2;
    feltMesh.receiveShadow = true;
    scene.add(feltMesh);

    // Rails (simplified as walls around the table)
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0x3d3d3d });
    
    // Long rails (x-direction)
    const longRailGeometry = new THREE.BoxGeometry(tableLength + 4, railHeight, 2);
    const longRail1 = new THREE.Mesh(longRailGeometry, railMaterial);
    longRail1.position.set(50, tableHeight + railHeight / 2, -tableWidth / 2 - 1);
    scene.add(longRail1);

    const longRail2 = new THREE.Mesh(longRailGeometry, railMaterial);
    longRail2.position.set(50, tableHeight + railHeight / 2, tableWidth / 2 + 1);
    scene.add(longRail2);

    // Short rails (z-direction)
    const shortRailGeometry = new THREE.BoxGeometry(2, railHeight, tableWidth + 4);
    const shortRail1 = new THREE.Mesh(shortRailGeometry, railMaterial);
    shortRail1.position.set(-tableLength / 2 - 1, tableHeight + railHeight / 2, 25);
    scene.add(shortRail1);

    const shortRail2 = new THREE.Mesh(shortRailGeometry, railMaterial);
    shortRail2.position.set(tableLength / 2 + 1, tableHeight + railHeight / 2, 25);
    scene.add(shortRail2);

    // Physics bodies for rails
    const railPhysicsMaterial = new CANNON.Material('rail');
    
    const railBodies = [
      new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3((tableLength + 4) / 2, railHeight / 2, 1)),
      }),
      new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3((tableLength + 4) / 2, railHeight / 2, 1)),
      }),
      new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1, railHeight / 2, (tableWidth + 4) / 2)),
      }),
      new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1, railHeight / 2, (tableWidth + 4) / 2)),
      }),
    ];

    railBodies[0].position.set(50, tableHeight + railHeight / 2, -tableWidth / 2 - 1);
    railBodies[1].position.set(50, tableHeight + railHeight / 2, tableWidth / 2 + 1);
    railBodies[2].position.set(-tableLength / 2 - 1, tableHeight + railHeight / 2, 25);
    railBodies[3].position.set(tableLength / 2 + 1, tableHeight + railHeight / 2, 25);

    railBodies.forEach((body) => {
      world.addBody(body);
      body.material = railPhysicsMaterial;
    });

    // === BALL PHYSICS ===
    const ballRadius = 0.9375; // 1.5 inches
    const ballMass = 0.16; // Pool ball mass in kg

    // Create ball meshes and physics bodies from drill diagram
    const createBall = (id: string, x: number, z: number, color: string) => {
      // Mesh
      const geometry = new THREE.SphereGeometry(ballRadius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, tableHeight + ballRadius + 0.5, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      ballMeshesRef.current.set(id, mesh);

      // Physics body
      const shape = new CANNON.Sphere(ballRadius);
      const body = new CANNON.Body({
        mass: ballMass,
        shape,
        linearDamping: 0.3,
        angularDamping: 0.3,
      });
      body.position.set(x, tableHeight + ballRadius + 0.5, z);
      world.addBody(body);
      ballBodiesRef.current.set(id, body);

      return { mesh, body };
    };

    // Add balls from drill (convert from drill diagram coordinates)
    if (drill.diagram?.balls) {
      drill.diagram.balls.forEach((ball) => {
        const color = ball.role === 'cue' ? '#f3f5f8' : ball.role === 'object' ? '#ffffff' : '#ffcc00';
        // Convert from 100x50 diagram space to table space (scale to ~9ft)
        const x = (ball.x / 100) * tableLength - tableLength / 2;
        const z = (ball.y / 50) * tableWidth - tableWidth / 2;
        createBall(ball.id, x, z, color);
      });
    }

    // === ANIMATION LOOP ===
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Step physics simulation
      world.step(1 / 60);

      // Update ball positions from physics
      ballBodiesRef.current.forEach((body, id) => {
        const mesh = ballMeshesRef.current.get(id);
        if (mesh) {
          mesh.position.copy(body.position as any);
          mesh.quaternion.copy(body.quaternion as any);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // === CLEANUP ===
    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [width, height, drill]);

  const handleSimulate = () => {
    // Apply initial velocity to cue ball
    const cbBody = ballBodiesRef.current.get('cb');
    if (cbBody) {
      cbBody.velocity.set(20, 0, 0); // Give it a push
      setIsRunning(true);
      setTimeout(() => setIsRunning(false), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        className="border border-gray-400 rounded-lg overflow-hidden bg-gray-900"
        style={{ width, height }}
      />
      <button
        onClick={handleSimulate}
        disabled={isRunning}
        className="px-4 py-2 bg-cue-400 text-white rounded hover:bg-opacity-80 disabled:opacity-50"
      >
        {isRunning ? 'Simulating...' : 'Simulate Shot'}
      </button>
    </div>
  );
};
