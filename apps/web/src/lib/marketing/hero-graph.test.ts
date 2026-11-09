import { describe, expect, it } from "vitest";

import {
  boxFaces,
  floatingOrders,
  isoProject,
  orderCardCorners,
  routes,
  sceneHalfExtent,
  servicePoints,
} from "./hero-graph";

describe("hero-graph", () => {
  it("only references existing service points in routes and orders", () => {
    for (const [from, to] of routes) {
      expect(servicePoints[from]).toBeDefined();
      expect(servicePoints[to]).toBeDefined();
      expect(from).not.toBe(to);
    }
    for (const order of floatingOrders) {
      expect(servicePoints[order.point]).toBeDefined();
    }
  });

  it("keeps every volume inside the visible floor", () => {
    for (const point of servicePoints) {
      expect(Math.abs(point.x) + point.size / 2).toBeLessThanOrEqual(sceneHalfExtent);
      expect(Math.abs(point.z) + point.size / 2).toBeLessThanOrEqual(sceneHalfExtent);
    }
  });

  it("projects the scene origin to the screen origin", () => {
    expect(isoProject([0, 0, 0], 50, [400, 300])).toEqual([400, 300]);
  });

  it("returns the top face at the volume height", () => {
    const point = servicePoints[0];
    if (!point) throw new Error("missing office point");
    const faces = boxFaces(point);
    expect(faces.top).toHaveLength(4);
    for (const corner of faces.top) {
      expect(corner[1]).toBeCloseTo(point.height);
    }
  });

  it("places order cards above their volume", () => {
    const point = servicePoints[1];
    if (!point) throw new Error("missing point");
    for (const corner of orderCardCorners(point, 1.5)) {
      expect(corner[1]).toBeCloseTo(point.height + 1.5);
    }
  });
});
