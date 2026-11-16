/**
 * LOGIN DERRUBADO POR OUTRO APARELHO
 * A conta entrou em outro aparelho e passou do limite de telas do plano.
 * Apaga o login deste navegador e leva para a tela de entrar com o aviso.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured) {
    const { createSessionClient } = await import("@/lib/supabase/server");
    const supabase = await createSessionClient();
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  }
  const res = NextResponse.redirect(new URL("/entrar?motivo=outro-aparelho", request.url));
  res.cookies.delete("amora_chk");
  return res;
}
