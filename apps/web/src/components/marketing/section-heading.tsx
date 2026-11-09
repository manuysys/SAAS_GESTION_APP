import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  text?: string;
  tone?: "light" | "dark" | "teal";
  titleId?: string;
  className?: string;
};

const eyebrowTone = {
  light: "text-teal",
  dark: "text-mk-teal",
  teal: "text-white",
} as const;

const titleTone = {
  light: "text-ink",
  dark: "text-white",
  teal: "text-white",
} as const;

const textTone = {
  light: "text-ink/75",
  dark: "text-white/75",
  teal: "text-white/85",
} as const;

/** Encabezado de sección: eyebrow con filete, título display y texto opcional. */
export function SectionHeading({
  eyebrow,
  title,
  text,
  tone = "light",
  titleId,
  className,
}: SectionHeadingProps) {
  return (
    <Reveal className={cn("max-w-2xl", className)}>
      <p
        className={cn(
          "inline-flex items-center gap-3 text-xs font-semibold tracking-[0.14em] uppercase",
          eyebrowTone[tone],
        )}
      >
        <span aria-hidden="true" className="h-px w-6 bg-current" />
        {eyebrow}
      </p>
      <h2
        id={titleId}
        className={cn(
          "mt-4 font-display text-[clamp(2rem,4.6vw,3.5rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance",
          titleTone[tone],
        )}
      >
        {title}
      </h2>
      {text && <p className={cn("mt-5 text-base leading-7", textTone[tone])}>{text}</p>}
    </Reveal>
  );
}
