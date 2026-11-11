import { describe, expect, it } from "vitest";

import { emailDeliveryFeedback } from "@/lib/email-delivery";

describe("emailDeliveryFeedback", () => {
  it("says the provider accepted the email, never that it was delivered", () => {
    const feedback = emailDeliveryFeedback("sent", "ana@example.com");
    expect(feedback.tone).toBe("success");
    expect(feedback.message).toContain("aceptó");
    expect(feedback.message).toContain("ana@example.com");
    expect(feedback.message.toLowerCase()).not.toContain("entregado");
    expect(feedback.message).toContain("No podemos confirmar");
  });

  it("warns on failure and keeps the manual link as alternative", () => {
    const feedback = emailDeliveryFeedback("failed", "ana@example.com");
    expect(feedback.tone).toBe("warning");
    expect(feedback.message).toContain("No pudimos enviar");
    expect(feedback.message).toContain("copiálo");
  });

  it("explains that console mode sends nothing", () => {
    const feedback = emailDeliveryFeedback("console", "ana@example.com");
    expect(feedback.tone).toBe("info");
    expect(feedback.message).toContain("no salió ningún correo");
  });

  it("is honest with unknown statuses", () => {
    const feedback = emailDeliveryFeedback("queued", "ana@example.com");
    expect(feedback.tone).toBe("info");
    expect(feedback.message).toContain("No sabemos");
  });
});
