import {
  ArrowRightIcon,
  AwardIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardCheckIcon,
  MapPinIcon,
  MegaphoneIcon,
  TicketIcon,
  TrophyIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { HexPattern, Meter } from "@/components/entity-kit";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  { icon: UsersIcon, label: "Clubs" },
  { icon: CalendarDaysIcon, label: "Events" },
  { icon: MegaphoneIcon, label: "Notices" },
  { icon: AwardIcon, label: "Certificates" },
];

const JOURNEY = [
  { icon: UserPlusIcon, label: "Join a club" },
  { icon: TicketIcon, label: "Register" },
  { icon: ClipboardCheckIcon, label: "Check in" },
  { icon: TrophyIcon, label: "Certified" },
];

const FACES = [
  { src: "/faces/face-1.jpg", initial: "A" },
  { src: "/faces/face-2.jpg", initial: "R" },
  { src: "/faces/face-3.jpg", initial: "K" },
  { src: "/faces/face-4.jpg", initial: "S" },
];

const TEXTURE: Array<[number, number]> = [];

for (let row = 0; row < 9; row += 1) {
  for (let col = 0; col < 22; col += 1) {
    if ((col + row) % 3 !== 0) continue;
    TEXTURE.push([9 + col * 16.4, 12 + row * 21]);
  }
}

export function AuthShowcase() {
  return (
    <div className="relative hidden overflow-hidden border-l bg-gradient-to-b from-primary/[0.07] via-background to-background lg:flex lg:flex-col lg:justify-center">
      <HexPattern className="text-foreground/[0.06]" />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-24 size-[34rem] rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[28rem] rounded-full bg-emphasis/[0.08] blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-xl flex-col gap-9 px-8 py-10">
        <TopStats />
        <Scene />
        <Journey />
      </div>
    </div>
  );
}

function TopStats() {
  return (
    <div className="flex items-stretch gap-3">
      <div className="rounded-3xl border bg-background/85 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-base font-semibold">One campus</p>
        <p className="text-sm text-muted-foreground">One Hive</p>
        <div className="mt-2.5 flex -space-x-2">
          {FACES.map((face) => (
            <span
              key={face.src}
              className="relative flex size-8 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted text-[11px] font-medium text-muted-foreground"
            >
              {face.initial}
              <img
                src={face.src}
                alt=""
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
                onError={(broken) => {
                  broken.currentTarget.style.display = "none";
                }}
              />
            </span>
          ))}
          <span className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[11px] font-medium text-muted-foreground">
            +
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-around rounded-3xl border bg-background/85 px-3 py-3 shadow-sm backdrop-blur">
        {HIGHLIGHTS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-4.5" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Scene() {
  return (
    <div className="relative px-6 pt-7 pb-10">
      <EventCard />

      <div className="absolute top-0 left-0 z-10 -translate-x-1">
        <FloatingCard
          icon={UsersIcon}
          title="Design Club"
          meta="Official club"
        />
      </div>

      <div className="absolute right-0 bottom-0 z-10 translate-x-1">
        <FloatingCard
          icon={AwardIcon}
          title="Certificate"
          meta="HIVE-2026"
          tone="success"
        />
      </div>
    </div>
  );
}

function EventCard() {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-2xl">
      <div className="relative h-28 bg-gradient-to-br from-primary/55 via-primary/25 to-primary/5">
        <HexPattern className="text-foreground/10" />

        <div className="absolute inset-x-4 top-3.5 flex items-start justify-end gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-primary shadow-sm ring-1 ring-foreground/10 backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
            Check-in open
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-5">
        <div className="-mt-7 flex items-end gap-3">
          <span className="flex size-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-background shadow-md ring-1 ring-foreground/10">
            <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Sep
            </span>
            <span className="font-heading text-xl leading-none font-semibold tabular-nums">
              14
            </span>
          </span>
          <span className="pb-1 text-xs text-muted-foreground">
            6:00 PM &middot; Coding Club
          </span>
        </div>

        <div>
          <h3 className="font-heading text-entry">Inter-College Hackathon</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPinIcon className="size-3.5" />
            Main Auditorium
          </p>
        </div>

        <Meter value={42} max={60} />

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {FACES.slice(0, 3).map((face) => (
                <span
                  key={face.src}
                  className="relative flex size-7 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground"
                >
                  {face.initial}
                  <img
                    src={face.src}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover"
                    onError={(broken) => {
                      broken.currentTarget.style.display = "none";
                    }}
                  />
                </span>
              ))}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              42 of 60 seats
            </span>
          </span>

          <span className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm">
            Register
          </span>
        </div>
      </div>
    </div>
  );
}

function Journey() {
  return (
    <div className="flex items-center justify-center gap-1">
      {JOURNEY.map(({ icon: Icon, label }, index) => (
        <div key={label} className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/85 px-3 py-2 text-xs font-medium whitespace-nowrap shadow-sm backdrop-blur">
            <Icon className="size-3.5 text-primary" />
            {label}
          </span>
          {index < JOURNEY.length - 1 ? (
            <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground/60" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FloatingCard({
  className,
  icon: Icon,
  title,
  meta,
  tone = "primary",
}: {
  className?: string;
  icon: typeof UsersIcon;
  title: string;
  meta: string;
  tone?: "primary" | "success";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border bg-background/90 px-3.5 py-2.5 shadow-md backdrop-blur",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl",
          tone === "success"
            ? "bg-success/15 text-success"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{meta}</span>
      </span>
      {tone === "success" ? (
        <CheckIcon className="size-3.5 text-success" />
      ) : null}
    </div>
  );
}

