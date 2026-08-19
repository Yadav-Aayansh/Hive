import { Link, useRouter } from "@tanstack/react-router";
import { RefreshCwIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { HiveMark } from "@/components/hive-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isApiError } from "@/lib/errors";

function Frame({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md gap-0 py-0">
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            {icon}
          </span>
          <h1 className="font-heading text-section">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {children}
            <Button variant="outline" render={<Link to="/dashboard" />}>
              Go to dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function RouteErrorPage({ error }: { error: Error }) {
  const router = useRouter();

  if (isApiError(error) && error.status === 404) {
    return (
      <Frame
        icon={<SearchXIcon className="size-6" />}
        title="Not found"
        description={error.message}
      />
    );
  }

  const description = isApiError(error)
    ? error.message
    : "Something broke on the way here. Try again in a moment.";

  return (
    <Frame
      icon={<TriangleAlertIcon className="size-6" />}
      title="Something went wrong"
      description={description}
    >
      <Button onClick={() => void router.invalidate()}>
        <RefreshCwIcon />
        Try again
      </Button>
    </Frame>
  );
}

export function RouteNotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/40 p-6 text-center">
      <HiveMark className="size-12" />
      <div>
        <h1 className="font-heading text-title">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The link may be broken, or the page may have moved.
        </p>
      </div>
      <div className="flex gap-2">
        <Button render={<Link to="/dashboard" />}>Go to dashboard</Button>
        <Button variant="outline" render={<Link to="/" />}>
          Home
        </Button>
      </div>
    </div>
  );
}
