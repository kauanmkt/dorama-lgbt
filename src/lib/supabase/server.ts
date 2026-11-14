import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./config";

/**
 * Cliente do Supabase "em nome do usuário logado", para o servidor.
 * Lê a sessão dos cookies; o RLS do banco decide o que essa pessoa pode ver.
 * Usar dentro de <Suspense>, pois depende de dados da requisição (cookies).
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Em páginas (Server Components) não dá para gravar cookies;
          // a renovação da sessão é feita pelo proxy (Etapa 5).
        }
      },
    },
  });
}
