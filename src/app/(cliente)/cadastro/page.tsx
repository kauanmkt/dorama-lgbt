import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Doramas LGBT+ dublados e legendados. Escolha seu plano e comece a assistir agora.",
};

/** Quem já é assinante não precisa da vitrine: vai direto para o início. */
async function MemberRedirect() {
  if (isSupabaseConfigured && (await getSessionUser())) redirect("/");
  return null;
}

/**
 * CATÁLOGO ABERTO (vitrine para quem ainda não assina).
 * Mostra o mesmo início do app; tocar em qualquer dorama abre a janela de planos.
 */
export default function CadastroPage() {
  return (
    <>
      <Suspense fallback={null}>
        <MemberRedirect />
      </Suspense>
      <HomePage />
    </>
  );
}
