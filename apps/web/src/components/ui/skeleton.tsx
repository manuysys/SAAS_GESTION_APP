import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-mist/70 animate-pulse rounded-lg", className)} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={index === lines - 1 ? "h-3 w-2/3" : "h-3 w-full"} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="border-mist rounded-2xl border bg-white p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}
