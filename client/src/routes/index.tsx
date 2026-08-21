import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { HeroBoy } from "@/components/hero-boy";
import { HiveMark } from "@/components/hive-mark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Hive — every club, event and certificate on your campus" }] }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-10 sm:py-7">
        <Link to="/" className="flex items-center gap-2.5 rounded-xl">
          <HiveMark className="size-9" />
          <span className="font-heading text-lg font-semibold tracking-tight">
            Hive
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link to="/login" />}>
            Sign in
          </Button>
          <Button render={<Link to="/signup" />}>
            Sign up
            <ArrowRightIcon />
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center px-5 text-center sm:px-10">
        <h1 className="mt-4 max-w-4xl font-heading text-display text-balance sm:mt-8">
          Every club, event and certificate on your campus.{" "}
          <span className="text-primary">One hive.</span>
        </h1>

        <div className="mt-4 flex min-h-0 w-full flex-1 justify-center pt-2">
          <HeroBoy className="translate-y-[1px]" />
        </div>
      </main>
    </div>
  );
}
