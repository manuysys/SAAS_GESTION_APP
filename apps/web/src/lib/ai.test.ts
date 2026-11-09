import { describe, expect, it } from "vitest";

import type { AIStatus } from "@/lib/api";
import {
  DETERMINISTIC_PROVIDER,
  MAX_SUGGESTED_PROMPTS,
  capabilityToPrompt,
  isAiBlocked,
  suggestedPrompts,
} from "@/lib/ai";

function status(overrides: Partial<AIStatus>): AIStatus {
  return {
    provider: DETERMINISTIC_PROVIDER,
    model: "deterministic",
    configured: true,
    available: true,
    deterministic_available: true,
    monthly_token_limit: 200000,
    tokens_used: 0,
    capabilities: [],
    ...overrides,
  };
}

describe("isAiBlocked", () => {
  it("el proveedor determinista nunca se bloquea", () => {
    expect(isAiBlocked(status({ configured: false }))).toBe(false);
  });

  it("un proveedor externo sin configurar bloquea el envío", () => {
    expect(isAiBlocked(status({ provider: "openai_compatible", configured: false }))).toBe(true);
  });

  it("un proveedor externo configurado no bloquea", () => {
    expect(isAiBlocked(status({ provider: "ollama", configured: true }))).toBe(false);
  });
});

describe("suggestedPrompts", () => {
  it("limita a 5 preguntas y descarta vacías", () => {
    const capabilities = ["a", " ", "b", "c", "d", "e", "f"];
    expect(suggestedPrompts(capabilities)).toEqual(["a", "b", "c", "d", "e"]);
    expect(suggestedPrompts(capabilities)).toHaveLength(MAX_SUGGESTED_PROMPTS);
  });
});

describe("capabilityToPrompt", () => {
  it("capitaliza la primera letra", () => {
    expect(capabilityToPrompt("agenda de hoy")).toBe("Agenda de hoy");
    expect(capabilityToPrompt("   ")).toBe("");
  });
});
