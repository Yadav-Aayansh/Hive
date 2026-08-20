import type { ReactNode } from "react";
import { AuthShowcase } from "@/components/auth-showcase";
import { HiveMark } from "@/components/hive-mark";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid h-svh w-full overflow-hidden bg-background lg:grid-cols-2">
      <FormPane title={title} description={description} footer={footer}>
        {children}
      </FormPane>
      <AuthShowcase />
    </div>
  );
}

function FormPane({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 size-[32rem] rounded-full bg-[oklch(0.52_0.1_78)] opacity-25 blur-3xl" />
        <div className="absolute top-1/3 -right-24 size-96 rounded-full bg-[oklch(0.46_0.09_28)] opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 left-0 size-[30rem] rounded-full bg-[oklch(0.44_0.08_218)] opacity-20 blur-3xl" />
      </div>

      <div className="flex h-full items-center justify-center overflow-y-auto p-6 sm:p-10">
        <div className="w-full max-w-sm rounded-4xl border bg-card/75 p-7 shadow-sm backdrop-blur-xl sm:p-9">
          <HiveMark />
          <h1 className="mt-6 font-heading text-title">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-7 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
