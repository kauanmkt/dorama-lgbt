import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/**
 * Cliente com PODER TOTAL sobre o banco (ignora o RLS).
 * Usado só no servidor, em operações específicas e já verificadas:
 *  - entrar com e-mail (localizar a conta e abrir a sessão)
 *  - liberar acesso (criar a conta do comprador)
 *  - webhooks de pagamento
 * A chave secreta vem de SUPABASE_SECRET_KEY e nunca vai para o navegador.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY não configurada. Adicione a Secret key do Supabase no .env.local / Vercel.",
    );
  }
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
