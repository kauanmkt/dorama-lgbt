import { getSessionUser } from "@/lib/auth";
import { getSitePlans } from "@/lib/site-plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SessionResolved } from "./SessionResolved";
import { VisitorGate } from "./VisitorGate";

/** Liga o "modo visitante" só para quem não está logado. Use dentro de <Suspense>. */
export async function VisitorMode() {
  if (!isSupabaseConfigured)
    return process.env.DEMO_VISITOR ? (
      <VisitorGate plans={await getSitePlans()} />
    ) : (
      <SessionResolved />
    );
  const [user, plans] = await Promise.all([getSessionUser(), getSitePlans()]);
  if (user) return <SessionResolved />;
  return <VisitorGate plans={plans} />;
}
