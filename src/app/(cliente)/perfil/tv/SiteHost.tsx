"use client";

import { useSyncExternalStore } from "react";

/** Endereço do site como a pessoa está vendo (continua certo quando o domínio mudar). */
export function SiteHost() {
  const host = useSyncExternalStore(
    () => () => {},
    () => window.location.host,
    () => "",
  );
  return <strong className="break-all text-fg">{host || "o endereço da Amora"}</strong>;
}
