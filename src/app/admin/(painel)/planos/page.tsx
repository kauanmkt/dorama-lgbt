import type { Metadata } from "next";
import { PlansManager } from "@/components/admin/PlansManager";
import { getPlans, getUsers } from "@/lib/admin";
import { accessStatus, hashString, NOW } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Planos" };

export default async function AdminPlansPage() {
  const [plans, users] = await Promise.all([getPlans(), getUsers()]);
  const now = isSupabaseConfigured ? new Date() : NOW;
  const subscribers: Record<string, number> = {};
  for (const u of users) {
    if (u.planId && accessStatus(u, now) === "ativo") subscribers[u.planId] = (subscribers[u.planId] ?? 0) + 1;
  }
  return <PlansManager key={hashString(JSON.stringify(plans))} initial={plans} subscribers={subscribers} />;
}
