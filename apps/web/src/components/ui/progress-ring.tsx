import { cn } from "@/lib/utils";

type ProgressRingProps = {
  value: number;
  max: number;
  label: string;
  detail?: string;
  color?: "teal" | "amber" | "ink";
  className?: string;
};

const colorClasses = {
  teal: "stroke-teal",
  amber: "stroke-amber",
  ink: "stroke-ink",
} as const;

export function ProgressRing({
  value,
  max,
  label,
  detail,
  color = "teal",
  className,
}: ProgressRingProps) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={radius} className="stroke-mist fill-none" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            className={cn("fill-none transition-[stroke-dashoffset] duration-700", colorClasses[color])}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="text-ink absolute inset-0 flex items-center justify-center text-sm font-semibold">
          {Math.round(percent)}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-ink text-sm font-semibold">{label}</p>
        {detail && <p className="text-slate mt-0.5 text-xs">{detail}</p>}
      </div>
    </div>
  );
}
