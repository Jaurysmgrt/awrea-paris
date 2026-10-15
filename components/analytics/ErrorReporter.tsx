"use client";
/** Erreurs du navigateur : les cinq premières de la page sont transmises au suivi des erreurs. */
import { useEffect } from "react";

export function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const send = (message: string, stack?: string) => {
      if (sent++ >= 5 || !message) return;
      const body = JSON.stringify({ message: message.slice(0, 500), stack: stack?.slice(0, 2000), path: window.location.pathname });
      if (!navigator.sendBeacon?.("/api/erreurs", new Blob([body], { type: "application/json" }))) void fetch("/api/erreurs", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    };
    const onError = (e: ErrorEvent) => send(e.message, e.error instanceof Error ? e.error.stack : undefined);
    const onRejection = (e: PromiseRejectionEvent) => send(e.reason instanceof Error ? e.reason.message : String(e.reason), e.reason instanceof Error ? e.reason.stack : undefined);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
