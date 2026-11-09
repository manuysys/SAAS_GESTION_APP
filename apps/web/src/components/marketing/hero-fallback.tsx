import {
  boxFaces,
  floatingOrders,
  isoProject,
  officeIndex,
  orderCardCorners,
  routes,
  sceneHalfExtent,
  servicePoints,
  type ScenePoint,
} from "@/lib/marketing/hero-graph";
import { cn } from "@/lib/utils";

/* Escena isométrica en SVG: respaldo sin WebGL, en mobile y con reduced motion. */

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;
const ORIGIN = [400, 310] as const;
const SCALE = 50;
const FLOOR_Y = 0.03;

function project(point: ScenePoint): [number, number] {
  return isoProject(point, SCALE, ORIGIN);
}

function polygon(points: readonly ScenePoint[]): string {
  return points
    .map((point) =>
      project(point)
        .map((value) => value.toFixed(1))
        .join(","),
    )
    .join(" ");
}

const gridLines: [ScenePoint, ScenePoint][] = [];
for (let i = -sceneHalfExtent; i <= sceneHalfExtent; i += 1) {
  gridLines.push(
    [
      [-sceneHalfExtent, 0, i],
      [sceneHalfExtent, 0, i],
    ],
    [
      [i, 0, -sceneHalfExtent],
      [i, 0, sceneHalfExtent],
    ],
  );
}

export function HeroFallback({ className }: { className?: string }) {
  // Pintar de atrás hacia adelante: los volúmenes con mayor x+z quedan al frente.
  const drawOrder = servicePoints
    .map((point, index) => ({ point, index }))
    .sort((a, b) => a.point.x + a.point.z - (b.point.x + b.point.z));

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("absolute inset-0 size-full", className)}
    >
      <g stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="1" fill="none">
        {gridLines.map(([a, b], index) => {
          const [x1, y1] = project(a);
          const [x2, y2] = project(b);
          return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>

      <g
        stroke="#5EEAD4"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeDasharray="6 10"
        fill="none"
        className="mk-dash"
      >
        {routes.map(([from, to]) => {
          const a = servicePoints[from];
          const b = servicePoints[to];
          if (!a || !b) return null;
          const [x1, y1] = project([a.x, FLOOR_Y, a.z]);
          const [x2, y2] = project([b.x, FLOOR_Y, b.z]);
          return <line key={`${from}-${to}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>

      {drawOrder.map(({ point, index }) => {
        const faces = boxFaces(point);
        const accent = index === officeIndex;
        const [cx, cy] = project([point.x, point.height, point.z]);
        return (
          <g key={point.id}>
            <polygon
              points={polygon(faces.faceX)}
              fill="#0A1A2B"
              stroke="#5EEAD4"
              strokeOpacity="0.35"
            />
            <polygon
              points={polygon(faces.faceZ)}
              fill="#0D2238"
              stroke="#5EEAD4"
              strokeOpacity="0.35"
            />
            <polygon
              points={polygon(faces.top)}
              fill={accent ? "#F59E0B" : "#16344F"}
              stroke={accent ? "#FBBF24" : "#5EEAD4"}
              strokeWidth="1.2"
            />
            <circle
              cx={cx}
              cy={cy}
              r={accent ? 14 : 9}
              fill="none"
              stroke={accent ? "#F59E0B" : "#5EEAD4"}
              strokeWidth="1.5"
              className="mk-node-ring"
            />
          </g>
        );
      })}

      {floatingOrders.map(({ point, lift }, index) => {
        const base = servicePoints[point];
        if (!base) return null;
        const [sx, sy] = project([base.x, base.height, base.z]);
        const [ex, ey] = project([base.x, base.height + lift, base.z]);
        const corners = orderCardCorners(base, lift);
        const accent = index % 2 === 0;
        return (
          <g key={`order-${point}`}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#5EEAD4" strokeOpacity="0.4" />
            <polygon
              points={polygon(corners)}
              fill="#102A43"
              stroke={accent ? "#F59E0B" : "#5EEAD4"}
              strokeWidth="1.2"
            />
          </g>
        );
      })}
    </svg>
  );
}
