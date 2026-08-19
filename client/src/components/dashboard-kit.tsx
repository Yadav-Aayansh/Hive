import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  SearchIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/lib/errors";
import { labelOf, toneOf } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Tone = "t1" | "t2" | "t3" | "t4" | "t5";

const BADGE: Record<Tone, string> = {
  t1: "bg-chart-1 text-chart-foreground",
  t2: "bg-chart-2 text-chart-foreground",
  t3: "bg-chart-3 text-chart-foreground",
  t4: "bg-chart-4 text-chart-foreground",
  t5: "bg-chart-5 text-chart-foreground",
};

const GLOW: Record<Tone, string> = {
  t1: "bg-chart-1/35",
  t2: "bg-chart-2/30",
  t3: "bg-chart-3/30",
  t4: "bg-chart-4/30",
  t5: "bg-chart-5/30",
};

export function PageShell({
  children,
  size = "wide",
}: {
  children: ReactNode;
  size?: "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 p-4 sm:p-6",
        size === "wide" ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-heading text-title">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "t4",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card className="relative gap-3 py-5">
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-12 -right-10 size-32 rounded-full blur-3xl",
          GLOW[tone],
        )}
      />
      <div className="flex items-start justify-between gap-3 px-5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full shadow-sm",
            BADGE[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="px-5 font-heading text-title tabular-nums">
        {value}
      </p>
      <p className="px-5 text-xs text-muted-foreground">{hint ?? " "}</p>
    </Card>
  );
}

export function SectionCard({
  title,
  description,
  action,
  bare,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  bare?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-heading text-entry">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex items-center gap-2">{action}</div>
        ) : null}
      </div>
      <div className={bare ? undefined : "p-2"}>{children}</div>
    </Card>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Card className="gap-0 py-4">
      <div className="flex flex-wrap items-end gap-3 px-4">{children}</div>
    </Card>
  );
}

export function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function SearchField({
  placeholder,
  defaultValue,
  onSearch,
  className,
}: {
  placeholder: string;
  defaultValue?: string;
  onSearch: (value: string | undefined) => void;
  className?: string;
}) {
  const [term, setTerm] = useState(defaultValue ?? "");
  const committed = useRef(defaultValue ?? "");
  const latest = useRef(onSearch);

  useEffect(() => {
    latest.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const value = term.trim();
    if (value === committed.current) return;

    const timer = window.setTimeout(() => {
      committed.current = value;
      latest.current(value === "" ? undefined : value);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [term]);

  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder={placeholder}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
    </div>
  );
}


export function Pagination({
  page,
  lastPage,
  onChange,
  flat,
}: {
  page: number;
  lastPage: number;
  onChange: (next: number) => void;
  flat?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-5 py-3",
        !flat && "border-t",
      )}
    >
      <p className="text-xs text-muted-foreground">
        Page {page} of {lastPage}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => {
            onChange(page - 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <ChevronLeftIcon />
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= lastPage}
          onClick={() => {
            onChange(page + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

export function DataRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/60",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatusBadge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const tone = toneOf(value);

  return (
    <Badge
      variant={tone === "negative" ? "destructive" : "outline"}
      className={cn(
        tone === "positive" && "border-transparent bg-success/12 text-success",
        tone === "pending" && "border-transparent bg-muted text-muted-foreground",
        className,
      )}
    >
      {labelOf(value)}
    </Badge>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-1 text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlertIcon className="size-5" />
        </span>
        <p className="mt-1 text-sm font-medium">Could not load this</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {isApiError(error)
            ? error.message
            : "Check your connection and try again"}
        </p>
        <div className="mt-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function RowGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-0.5">{children}</div>;
}
