import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./config";

/**
 * Cliente "visitante" (sem login) para ler o catálogo público no servidor.
 * Não usa cookies, por isso o resultado pode ser guardado em cache e servido
 * rapidamente para todo mundo. O RLS garante que só conteúdo publicado aparece.
 */
export function createPublicClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
