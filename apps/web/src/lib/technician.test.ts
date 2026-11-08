import { describe, expect, it } from "vitest";

import {
  ATTACHMENT_MAX_BYTES,
  formatFileSize,
  normalizeQuantity,
  technicianActions,
  validateAttachmentFile,
} from "@/lib/technician";

describe("technicianActions", () => {
  it("offers start from scheduled and waiting", () => {
    expect(technicianActions("scheduled")).toEqual([{ to: "in_progress", label: "Iniciar" }]);
    expect(technicianActions("waiting")).toEqual([{ to: "in_progress", label: "Iniciar" }]);
  });

  it("offers waiting and finish while in progress", () => {
    expect(technicianActions("in_progress")).toEqual([
      { to: "waiting", label: "En espera" },
      { to: "finished", label: "Finalizar" },
    ]);
  });

  it("offers nothing for closed or unknown states", () => {
    expect(technicianActions("finished")).toEqual([]);
    expect(technicianActions("cancelled")).toEqual([]);
    expect(technicianActions("unknown")).toEqual([]);
  });
});

describe("normalizeQuantity", () => {
  it("accepts integers and decimals with comma or dot", () => {
    expect(normalizeQuantity("2")).toBe("2");
    expect(normalizeQuantity("1,5")).toBe("1.5");
    expect(normalizeQuantity(" 0.125 ")).toBe("0.125");
  });

  it("rejects zero, negatives, text and excess decimals", () => {
    expect(normalizeQuantity("0")).toBeNull();
    expect(normalizeQuantity("-1")).toBeNull();
    expect(normalizeQuantity("abc")).toBeNull();
    expect(normalizeQuantity("1,2345")).toBeNull();
    expect(normalizeQuantity("")).toBeNull();
  });
});

describe("validateAttachmentFile", () => {
  it("accepts images within the size limit", () => {
    expect(validateAttachmentFile({ type: "image/jpeg", size: 1024 })).toBeNull();
  });

  it("rejects non-image files", () => {
    expect(validateAttachmentFile({ type: "application/pdf", size: 1024 })).not.toBeNull();
  });

  it("rejects files above the limit and empty files", () => {
    expect(
      validateAttachmentFile({ type: "image/png", size: ATTACHMENT_MAX_BYTES + 1 }),
    ).not.toBeNull();
    expect(validateAttachmentFile({ type: "image/png", size: 0 })).not.toBeNull();
  });
});

describe("formatFileSize", () => {
  it("formats bytes, kilobytes and megabytes in es-AR style", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(1536 * 1024)).toBe("1,5 MB");
  });
});
