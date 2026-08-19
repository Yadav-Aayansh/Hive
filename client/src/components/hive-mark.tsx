import { cn } from "@/lib/utils";

export function HiveMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      className={cn("size-10 shrink-0 object-contain", className)}
    />
  );
}
