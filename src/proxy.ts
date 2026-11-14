import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * PORTEIRO DO SITE (roda antes de cada página).
 * 1. Renova a sessão de login quando necessário (mantém a pessoa conectada).
 * 2. Quem não está logado vai para o login — do cliente ou do painel.
 *
 * Esta é a primeira barreira. As permissões de verdade (é admin? tem plano?)
 * são conferidas de novo no servidor e no banco (RLS).
 */
const PUBLIC_PATHS = ["/entrar", "/admin/entrar", "/api/webhooks"];

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next(); // modo demonstração

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  const redirectTo = (target: string) => {
    const r = NextResponse.redirect(new URL(target, request.url));
    // Mantém os cookies de sessão atualizados no redirecionamento
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!loggedIn && !isPublic) {
    if (path.startsWith("/admin")) return redirectTo("/admin/entrar");
    const next = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirectTo(`/entrar${next}`);
  }

  if (loggedIn && path === "/entrar") return redirectTo("/");

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos, ícones e o manifesto do app
    "/((?!_next/static|_next/image|icons/|icon\\.|apple-icon|manifest\\.webmanifest|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
