import { Plus } from "lucide-react";

import { faqItems } from "@/lib/marketing/content";

import { SectionHeading } from "./section-heading";
import { focusLight } from "./ui";

/* Acordeón nativo con <details>: accesible por teclado sin JavaScript. */
export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-16 bg-mk-tint py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            eyebrow="Preguntas frecuentes"
            title="Lo que suele preguntarse antes de empezar."
            titleId="faq-title"
          />
        </div>
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {faqItems.map((item) => (
            <details key={item.question} className="group px-5 py-1 sm:px-6">
              <summary
                className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-left text-base font-semibold text-ink [&::-webkit-details-marker]:hidden ${focusLight}`}
              >
                {item.question}
                <Plus
                  aria-hidden="true"
                  className="size-5 shrink-0 text-teal transition-transform duration-200 group-open:rotate-45"
                />
              </summary>
              <p className="pr-8 pb-5 text-sm leading-6 text-ink/75">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
