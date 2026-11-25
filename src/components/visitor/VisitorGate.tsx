"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SitePlan } from "@/lib/site-plans";
import { LoginModal } from "./LoginModal";
import { PlansSheet } from "./PlansSheet";
import { captureUtm } from "./utm";
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
  const { plansOpen, loginOpen } = useVisitor();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    captureUtm();
    visitorStore.setVisitor(true);
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const target = e.target as Element | null;
      if (!target?.closest) return;
      if (target.closest("[data-plans-sheet]")) return; // cliques dentro das janelas
      const memberBtn = target.closest("[data-member-only]");
      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      const href = link?.getAttribute("href") ?? "";
      // "Entrar" abre o login em janela (não sai do /cadastro)
      if (link && /^\/entrar(\?|$)/.test(href)) {
        e.preventDefault();
        e.stopPropagation();
        visitorStore.openLogin();
        return;
      }
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
      // tira só o "planos" do endereço — as UTMs do anúncio continuam
      const rest = new URLSearchParams(window.location.search);
      rest.delete("planos");
      const qs = rest.toString();
      router.replace(window.location.pathname + (qs ? `?${qs}` : ""), {
        scroll: false,
      });
    }
  }, [params, router]);

  return (
    <>
      <PlansSheet
        plans={plans}
        open={plansOpen}
        onClose={visitorStore.closePlans}
      />
      <LoginModal open={loginOpen} onClose={visitorStore.closeLogin} />
    </>
  );
}
