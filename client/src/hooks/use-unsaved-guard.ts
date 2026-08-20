import { useEffect } from "react";
import { useBlocker } from "@tanstack/react-router";

const MESSAGE = "You have unsaved changes. Leave without saving?";

export function useUnsavedGuard(dirty: boolean): void {
  useBlocker({
    shouldBlockFn: () => (dirty ? !window.confirm(MESSAGE) : false),
    enableBeforeUnload: dirty,
  });

  useEffect(() => {
    if (!dirty) return;

    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);
}
