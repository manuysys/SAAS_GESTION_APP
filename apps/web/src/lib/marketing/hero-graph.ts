/**
 * Escena isométrica compartida por el SVG de respaldo (mobile, reduced motion,
 * antes de cargar Three.js) y por la escena 3D del hero.
 * El plano XZ es el piso; Y es la altura. Unidades de escena, no píxeles.
 */

export type ScenePoint = readonly [x: number, y: number, z: number];

export type ServicePoint = {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  /** Altura del volumen. */
  readonly height: number;
  /** Lado de la base cuadrada. */
  readonly size: number;
};

/** Mitad del lado del piso visible. */
export const sceneHalfExtent = 4;

/** Índice de la oficina central dentro de servicePoints. */
export const officeIndex = 0;

/** Oficina (índice 0) y domicilios de clientes, como zonas de la ciudad. */
export const servicePoints: readonly ServicePoint[] = [
  { id: "oficina", x: 0, z: 0, height: 1.1, size: 1.3 },
  { id: "norte", x: -2.4, z: -1.6, height: 0.6, size: 0.9 },
  { id: "este", x: 1.9, z: -2.1, height: 0.9, size: 0.8 },
  { id: "sur", x: 2.6, z: 1.5, height: 0.5, size: 0.9 },
  { id: "centro", x: -1.1, z: 2.5, height: 0.8, size: 0.8 },
  { id: "oeste", x: -3, z: 0.9, height: 0.4, size: 0.7 },
];

/** Rutas de técnicos: pares de índices de servicePoints. */
export const routes: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 5],
  [2, 3],
];

/** Órdenes flotando sobre un punto: índice del punto y altura sobre el volumen. */
export const floatingOrders: readonly { readonly point: number; readonly lift: number }[] = [
  { point: 1, lift: 1.5 },
  { point: 2, lift: 1.9 },
  { point: 3, lift: 1.2 },
  { point: 4, lift: 1.6 },
];

const COS_30 = Math.cos(Math.PI / 6);

/** Proyección isométrica a píxeles de pantalla (Y hacia abajo). */
export function isoProject(
  [x, y, z]: ScenePoint,
  scale: number,
  origin: readonly [number, number],
): [number, number] {
  return [origin[0] + (x - z) * COS_30 * scale, origin[1] + (x + z) * 0.5 * scale - y * scale];
}

export type BoxFaces = {
  readonly top: readonly ScenePoint[];
  /** Cara visible con normal +X. */
  readonly faceX: readonly ScenePoint[];
  /** Cara visible con normal +Z. */
  readonly faceZ: readonly ScenePoint[];
};

/** Caras visibles de un volumen desde la cámara isométrica (+X, +Y, +Z). */
export function boxFaces({ x, z, height, size }: ServicePoint): BoxFaces {
  const h = size / 2;
  return {
    top: [
      [x - h, height, z - h],
      [x + h, height, z - h],
      [x + h, height, z + h],
      [x - h, height, z + h],
    ],
    faceX: [
      [x + h, 0, z - h],
      [x + h, 0, z + h],
      [x + h, height, z + h],
      [x + h, height, z - h],
    ],
    faceZ: [
      [x - h, 0, z + h],
      [x + h, 0, z + h],
      [x + h, height, z + h],
      [x - h, height, z + h],
    ],
  };
}

/** Rectángulo plano de una orden flotante, a `lift` sobre el volumen. */
export function orderCardCorners(point: ServicePoint, lift: number): ScenePoint[] {
  const w = 0.45;
  const d = 0.3;
  const y = point.height + lift;
  return [
    [point.x - w, y, point.z - d],
    [point.x + w, y, point.z - d],
    [point.x + w, y, point.z + d],
    [point.x - w, y, point.z + d],
  ];
}
