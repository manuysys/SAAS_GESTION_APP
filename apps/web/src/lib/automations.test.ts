import { describe, expect, it } from "vitest";

import {
  automationFormSchema,
  buildAutomationRuleInput,
  isUuid,
  parseOptionalJsonObject,
  type AutomationFormValues,
} from "@/lib/automations";

const USER_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

function baseValues(overrides: Partial<AutomationFormValues> = {}): AutomationFormValues {
  return {
    name: "Avisar al aprobar",
    event_type: "quote_approved",
    action_type: "notify",
    conditions: "",
    action_config: "",
    user_id: "",
    active: true,
    ...overrides,
  };
}

describe("parseOptionalJsonObject", () => {
  it("devuelve undefined para texto vacío o solo espacios", () => {
    expect(parseOptionalJsonObject("")).toEqual({ ok: true, value: undefined });
    expect(parseOptionalJsonObject("   \n ")).toEqual({ ok: true, value: undefined });
  });

  it("acepta objetos JSON", () => {
    expect(parseOptionalJsonObject('{"min_total": 1000}')).toEqual({
      ok: true,
      value: { min_total: 1000 },
    });
  });

  it("rechaza arreglos, escalares y JSON inválido", () => {
    expect(parseOptionalJsonObject("[1, 2]").ok).toBe(false);
    expect(parseOptionalJsonObject("42").ok).toBe(false);
    expect(parseOptionalJsonObject('"texto"').ok).toBe(false);
    expect(parseOptionalJsonObject("{no es json").ok).toBe(false);
    expect(parseOptionalJsonObject("null").ok).toBe(false);
  });
});

describe("isUuid", () => {
  it("valida UUID con formato estándar", () => {
    expect(isUuid(USER_ID)).toBe(true);
    expect(isUuid("no-es-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});

describe("automationFormSchema", () => {
  it("acepta una regla mínima válida", () => {
    expect(automationFormSchema.safeParse(baseValues()).success).toBe(true);
  });

  it("rechaza nombres demasiado cortos", () => {
    expect(automationFormSchema.safeParse(baseValues({ name: "a" })).success).toBe(false);
  });

  it("rechaza condiciones y configuración con JSON inválido", () => {
    expect(automationFormSchema.safeParse(baseValues({ conditions: "{" })).success).toBe(false);
    expect(automationFormSchema.safeParse(baseValues({ action_config: "[]" })).success).toBe(false);
  });

  it("exige destinatario para notify_user", () => {
    const result = automationFormSchema.safeParse(baseValues({ action_type: "notify_user" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["user_id"]);
    }
  });

  it("acepta notify_user con user_id en el campo dedicado o en el JSON", () => {
    expect(
      automationFormSchema.safeParse(baseValues({ action_type: "notify_user", user_id: USER_ID }))
        .success,
    ).toBe(true);
    expect(
      automationFormSchema.safeParse(
        baseValues({ action_type: "notify_user", action_config: `{"user_id": "${USER_ID}"}` }),
      ).success,
    ).toBe(true);
  });

  it("rechaza un UUID de destinatario mal formado", () => {
    const result = automationFormSchema.safeParse(
      baseValues({ action_type: "notify_user", user_id: "123" }),
    );
    expect(result.success).toBe(false);
  });
});

describe("buildAutomationRuleInput", () => {
  it("omite condiciones y configuración vacías", () => {
    const input = buildAutomationRuleInput(baseValues());
    expect(input).toEqual({
      name: "Avisar al aprobar",
      event_type: "quote_approved",
      action_type: "notify",
      conditions: undefined,
      action_config: undefined,
      active: true,
    });
  });

  it("parsea el JSON de condiciones y configuración", () => {
    const input = buildAutomationRuleInput(
      baseValues({ conditions: '{"min_total": 5000}', action_config: '{"channel": "app"}' }),
    );
    expect(input.conditions).toEqual({ min_total: 5000 });
    expect(input.action_config).toEqual({ channel: "app" });
  });

  it("incorpora user_id en action_config para notify_user", () => {
    const input = buildAutomationRuleInput(
      baseValues({
        action_type: "notify_user",
        user_id: USER_ID,
        action_config: '{"channel": "app"}',
      }),
    );
    expect(input.action_config).toEqual({ channel: "app", user_id: USER_ID });
  });
});
