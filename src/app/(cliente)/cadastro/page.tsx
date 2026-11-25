import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ExitDownsell } from "@/components/visitor/ExitDownsell";
import { getSessionUser } from "@/lib/auth";
import { getSitePlans } from "@/lib/site-plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Doramas LGBT+ dublados e legendados. Escolha seu plano e comece a assistir agora.",
};

/** Pixel da LowTrack (rastreia a visita e o clique para o checkout). */
const LOWTRACK_PIXEL_ID = "lt_px_338a972c8c09";
/** Downsell de saída: Mensal com desconto. */
const DOWNSELL_URL = "https://pay.lowify.com.br/go.php?offer=f1f63220";
const DOWNSELL_CENTS = 1000;

/** Quem já é assinante não precisa da vitrine: vai direto para o início. */
async function MemberRedirect() {
  if (isSupabaseConfigured && (await getSessionUser())) redirect("/");
  return null;
}

async function Downsell() {
  const plans = await getSitePlans();
  const mensal = plans.find((p) => p.durationDays && p.durationDays <= 31);
  return (
    <ExitDownsell
      offerUrl={DOWNSELL_URL}
      offerCents={DOWNSELL_CENTS}
      fromCents={mensal?.priceCents}
    />
  );
}

/**
 * CATÁLOGO ABERTO (vitrine para quem ainda não assina).
 * Mostra o mesmo início do app; tocar em qualquer dorama abre a janela de planos.
 * Os links do checkout levam as UTMs do anúncio.
 */
export default function CadastroPage() {
  return (
    <>
      <Script id="lowtrack-pixel" strategy="afterInteractive">
        {`window.pixelId = "${LOWTRACK_PIXEL_ID}";
var a = document.createElement("script");
a.setAttribute("async", "");
a.setAttribute("defer", "");
a.setAttribute("src", "https://lowtrack.com.br/pixel.js");
document.head.appendChild(a);`}
      </Script>
      <Suspense fallback={null}>
        <MemberRedirect />
      </Suspense>
      <Suspense fallback={null}>
        <Downsell />
      </Suspense>
      <HomePage />
    </>
  );
}
