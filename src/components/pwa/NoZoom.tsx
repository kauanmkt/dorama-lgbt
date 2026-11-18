"use client";

import { useEffect } from "react";

/**
 * O iPhone ignora o "sem zoom" da página e deixa dar zoom com a pinça.
 * Aqui bloqueamos o gesto de pinça (o toque duplo já é bloqueado no CSS), para o app ficar
 * fixo como um app nativo. (O player continua com tela cheia normal.)
 */
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const pinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("touchmove", pinch, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", pinch);
    };
  }, []);
  return null;
}
