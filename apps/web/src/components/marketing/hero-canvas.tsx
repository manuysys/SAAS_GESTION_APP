"use client";

import { useEffect, useRef } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from "three";

import {
  floatingOrders,
  officeIndex,
  routes,
  sceneHalfExtent,
  servicePoints,
  type ScenePoint,
} from "@/lib/marketing/hero-graph";

type Disposable = { dispose: () => void };

type HeroCanvasProps = {
  /** Se llama una vez, después del primer frame renderizado. */
  onReady?: () => void;
};

const COLOR = {
  teal: 0x5eead4,
  amber: 0xf59e0b,
  card: 0x102a43,
  faceTop: 0x1e4466,
  faceSide: 0x14304d,
  faceFront: 0x0f263d,
  faceBase: 0x0a1a2b,
} as const;

/** Mitad de la altura visible del frustum ortográfico. */
const HALF_VIEW = 4.6;
const CAMERA_DISTANCE = 12;
/** Velocidad de los pulsos sobre las rutas, en recorridos por segundo. */
const PULSE_SPEED = 0.12;
const FLOOR_Y = 0.03;

function lineGeometry(values: readonly number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(values, 3));
  return geometry;
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

/*
 * Escena isométrica con Three.js: piso, volúmenes de puntos de servicio, rutas
 * con pulsos en movimiento y órdenes flotando. Ortográfica, fondo transparente
 * y un solo draw por frame. Se pausa fuera de pantalla y libera recursos al
 * desmontar. El SVG de respaldo muestra la misma geometría sin WebGL.
 */
export default function HeroCanvas({ onReady }: HeroCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      // Sin WebGL se queda el SVG de respaldo.
      return;
    }

    const disposables: Disposable[] = [];
    const track = <T extends Disposable>(item: T): T => {
      disposables.push(item);
      return item;
    };

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(CAMERA_DISTANCE, CAMERA_DISTANCE, CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);

    const world = new Group();
    scene.add(world);

    // Piso: grilla técnica.
    const floorPoints: number[] = [];
    for (let i = -sceneHalfExtent; i <= sceneHalfExtent; i += 1) {
      floorPoints.push(
        -sceneHalfExtent,
        0,
        i,
        sceneHalfExtent,
        0,
        i,
        i,
        0,
        -sceneHalfExtent,
        i,
        0,
        sceneHalfExtent,
      );
    }
    world.add(
      new LineSegments(
        track(lineGeometry(floorPoints)),
        track(new LineBasicMaterial({ color: COLOR.teal, transparent: true, opacity: 0.12 })),
      ),
    );

    // Volúmenes: un BoxGeometry unitario escalado por punto. Materiales por cara
    // (orden de BoxGeometry: +X, -X, +Y, -Y, +Z, -Z) para dar sensación de luz.
    const unitBox = track(new BoxGeometry(1, 1, 1));
    const unitEdges = track(new EdgesGeometry(unitBox));

    servicePoints.forEach((point, index) => {
      const accent = index === officeIndex;
      const faces = [
        COLOR.faceSide,
        COLOR.faceSide,
        accent ? COLOR.amber : COLOR.faceTop,
        COLOR.faceBase,
        COLOR.faceFront,
        COLOR.faceBase,
      ].map((color) => track(new MeshBasicMaterial({ color })));

      const mesh = new Mesh(unitBox, faces);
      mesh.scale.set(point.size, point.height, point.size);
      mesh.position.set(point.x, point.height / 2, point.z);

      const edges = new LineSegments(
        unitEdges,
        track(
          new LineBasicMaterial({
            color: accent ? COLOR.amber : COLOR.teal,
            transparent: true,
            opacity: 0.85,
          }),
        ),
      );
      edges.scale.copy(mesh.scale);
      edges.position.copy(mesh.position);

      world.add(mesh, edges);
    });

    // Rutas y pulsos que recorren cada ruta.
    const routePoints: number[] = [];
    const pulseGeometry = track(new SphereGeometry(0.07, 12, 10));
    const pulseMaterial = track(new MeshBasicMaterial({ color: COLOR.teal }));
    const pulses: { start: ScenePoint; end: ScenePoint; offset: number; mesh: Mesh }[] = [];

    routes.forEach(([fromIndex, toIndex], index) => {
      const from = servicePoints[fromIndex];
      const to = servicePoints[toIndex];
      if (!from || !to) return;
      const start: ScenePoint = [from.x, FLOOR_Y, from.z];
      const end: ScenePoint = [to.x, FLOOR_Y, to.z];
      routePoints.push(...start, ...end);

      const mesh = new Mesh(pulseGeometry, pulseMaterial);
      world.add(mesh);
      pulses.push({ start, end, offset: index * 0.37, mesh });
    });

    world.add(
      new LineSegments(
        track(lineGeometry(routePoints)),
        track(new LineBasicMaterial({ color: COLOR.teal, transparent: true, opacity: 0.45 })),
      ),
    );

    // Órdenes flotando sobre los puntos, unidas por un tramo vertical.
    floatingOrders.forEach(({ point, lift }, index) => {
      const base = servicePoints[point];
      if (!base) return;
      const y = base.height + lift;
      const accent = index % 2 === 0;

      const card = new Mesh(unitBox, track(new MeshBasicMaterial({ color: COLOR.card })));
      card.scale.set(0.9, 0.05, 0.6);
      card.position.set(base.x, y, base.z);

      const cardEdges = new LineSegments(
        unitEdges,
        track(
          new LineBasicMaterial({
            color: accent ? COLOR.amber : COLOR.teal,
            transparent: true,
            opacity: 0.9,
          }),
        ),
      );
      cardEdges.scale.copy(card.scale);
      cardEdges.position.copy(card.position);

      const stem = new LineSegments(
        track(lineGeometry([base.x, base.height, base.z, base.x, y, base.z])),
        track(new LineBasicMaterial({ color: COLOR.teal, transparent: true, opacity: 0.4 })),
      );

      world.add(card, cardEdges, stem);
    });

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      const aspect = width / height;
      camera.left = -HALF_VIEW * aspect;
      camera.right = HALF_VIEW * aspect;
      camera.top = HALF_VIEW;
      camera.bottom = -HALF_VIEW;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const pointerTarget = { x: 0 };
    const pointerCurrent = { x: 0 };
    const onPointerMove = (event: PointerEvent) => {
      pointerTarget.x = event.clientX / window.innerWidth - 0.5;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const startTime = performance.now();
    let frame = 0;
    let running = false;
    let ready = false;
    let visible = true;

    const render = (now: number) => {
      const t = (now - startTime) / 1000;

      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.05;
      world.rotation.y = pointerCurrent.x * 0.35;

      for (const pulse of pulses) {
        const progress = (t * PULSE_SPEED + pulse.offset) % 1;
        pulse.mesh.position.set(
          lerp(pulse.start[0], pulse.end[0], progress),
          FLOOR_Y,
          lerp(pulse.start[2], pulse.end[2], progress),
        );
      }

      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        onReadyRef.current?.();
      }
      frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(render);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible && !document.hidden) start();
      else stop();
    });
    intersection.observe(container);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    start();

    return () => {
      stop();
      intersection.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const item of disposables) item.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
  );
}
