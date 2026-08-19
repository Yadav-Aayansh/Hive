import type { ReactNode } from "react";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import type { Accent } from "@/lib/category";
import { cn, initials } from "@/lib/utils";

const BAND: Record<Accent, string> = {
  a1: "from-chart-1/50 via-chart-1/20 to-chart-1/5",
  a2: "from-chart-2/50 via-chart-2/20 to-chart-2/5",
  a3: "from-chart-3/45 via-chart-3/18 to-chart-3/5",
  a4: "from-chart-4/45 via-chart-4/18 to-chart-4/5",
  a5: "from-chart-5/50 via-chart-5/20 to-chart-5/5",
};

const RAIL: Record<Accent, string> = {
  a1: "bg-chart-1",
  a2: "bg-chart-2",
  a3: "bg-chart-3",
  a4: "bg-chart-4",
  a5: "bg-chart-5",
};

const HEX = "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)";

export function HexPattern({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 size-full text-foreground/[0.12]",
        className,
      )}
    >
      <defs>
        <pattern
          id="hive-honeycomb"
          width="36"
          height="20.78"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 0 L6 10.39 L-6 10.39 L-12 0 L-6 -10.39 L6 -10.39 Z M30 10.39 L24 20.78 L12 20.78 L6 10.39 L12 0 L24 0 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hive-honeycomb)" />
    </svg>
  );
}

export function AccentBand({
  accent,
  className,
  children,
}: {
  accent: Accent;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br",
        BAND[accent],
        className,
      )}
    >
      <HexPattern />
      {children}
    </div>
  );
}

export function AccentRail({
  accent,
  className,
}: {
  accent: Accent;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute inset-y-0 left-0 w-1",
        RAIL[accent],
        className,
      )}
    />
  );
}

export function HexCrest({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-14 shrink-0 items-center justify-center bg-background",
        className,
      )}
      style={{ clipPath: HEX }}
    >
      <span
        className="absolute inset-[2px] flex items-center justify-center overflow-hidden bg-muted text-muted-foreground"
        style={{ clipPath: HEX }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="size-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span className="font-heading text-sm font-semibold">
            {initials(name)}
          </span>
        )}
      </span>
    </span>
  );
}

export function IconChip({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-xl bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

export function MetaChip({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Meter({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const full = percent >= 100;

  return (
    <span
      className={cn(
        "block h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full rounded-full",
          full ? "bg-destructive/70" : "bg-primary",
        )}
        style={{ width: `${Math.max(percent, 2)}%` }}
      />
    </span>
  );
}

export function DateChit({ date }: { date: Date | null }) {
  return (
    <span className="flex size-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-background/90 shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
      {date ? (
        <>
          <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {format(date, "MMM")}
          </span>
          <span className="font-heading text-xl leading-none font-semibold tabular-nums">
            {format(date, "d")}
          </span>
        </>
      ) : (
        <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          TBA
        </span>
      )}
    </span>
  );
}

export function GroupHeading({
  icon: Icon,
  title,
  hint,
  count,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <h2 className="font-heading text-section">{title}</h2>
        {hint ? (
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {count === undefined ? null : (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
      <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-border" />
      {action}
    </div>
  );
}
