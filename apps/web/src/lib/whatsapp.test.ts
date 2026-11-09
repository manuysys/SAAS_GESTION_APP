import { describe, expect, it } from "vitest";

import {
  buildWhatsAppConfigInput,
  whatsappConfigFormSchema,
  whatsappSendSchema,
  type WhatsAppConfigFormValues,
} from "@/lib/whatsapp";

function baseValues(overrides: Partial<WhatsAppConfigFormValues> = {}): WhatsAppConfigFormValues {
  return {
    phone_number_id: "1234567890",
    business_account_id: "9876543210",
    access_token: "",
    verify_token: "",
    app_secret: "",
    active: true,
    ...overrides,
  };
}

describe("whatsappConfigFormSchema", () => {
  it("exige IDs numéricos", () => {
    const result = whatsappConfigFormSchema.safeParse(baseValues({ phone_number_id: "abc" }));
    expect(result.success).toBe(false);
  });

  it("acepta secretos vacíos (conservar los existentes)", () => {
    expect(whatsappConfigFormSchema.safeParse(baseValues()).success).toBe(true);
  });
});

describe("buildWhatsAppConfigInput", () => {
  it("omite secretos vacíos para no reemplazar los guardados", () => {
    const input = buildWhatsAppConfigInput(baseValues({ access_token: "token-nuevo" }));
    expect(input).toEqual({
      phone_number_id: "1234567890",
      business_account_id: "9876543210",
      active: true,
      access_token: "token-nuevo",
      verify_token: undefined,
      app_secret: undefined,
    });
  });
});

describe("whatsappSendSchema", () => {
  it("valida teléfono internacional y cuerpo no vacío", () => {
    expect(whatsappSendSchema.safeParse({ to_phone: "+5491155550000", body: "Hola" }).success).toBe(
      true,
    );
    expect(whatsappSendSchema.safeParse({ to_phone: "11-5555", body: "Hola" }).success).toBe(false);
    expect(whatsappSendSchema.safeParse({ to_phone: "+5491155550000", body: "   " }).success).toBe(
      false,
    );
  });
});
