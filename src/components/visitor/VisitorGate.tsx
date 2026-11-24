"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SitePlan } from "@/lib/site-plans";
import { PlansSheet } from "./PlansSheet";
import { useVisitor, visitorStore } from "./visitor-store";

/** Áreas que pedem assinatura: para o visitante, tocar nelas abre os planos. */
const MEMBER_PATHS = [
  "/dorama/",
  "/assistir/",
  "/minha-lista",
  "/perfil",
  "/notificacoes",
  "/solicitar",
  "/identidade",
];

function isMemberLink(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    return MEMBER_PATHS.some(
      (p) =>
        url.pathname === p.replace(/\/$/, "") || url.pathname.startsWith(p),
    );
  } catch {
    return false;
  }
}

/**
 * Só é montado para quem NÃO está logado.
 * Toque em qualquer dorama (ou botão de assinante) → abre a janela de planos.
 */
export function VisitorGate({ plans }: { plans: SitePlan[] }) {
  const { plansOpen } = useVisitor();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    visitorStore.setVisitor(true);
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const target = e.target as Element | null;
      if (!target?.closest) return;
      if (target.closest("[data-plans-sheet]")) return; // cliques dentro da própria janela
      const memberBtn = target.closest("[data-member-only]");
      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (
        memberBtn ||
        (link && isMemberLink(link.getAttribute("href") ?? ""))
      ) {
        e.preventDefault();
        e.stopPropagation();
        visitorStore.openPlans();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // Link direto para os planos: amoradramas.app/?planos
  useEffect(() => {
    if (params.has("planos")) {
      visitorStore.openPlans();
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [params, router]);

  return (
    <PlansSheet
      plans={plans}
      open={plansOpen}
      onClose={visitorStore.closePlans}
    />
  );
}
