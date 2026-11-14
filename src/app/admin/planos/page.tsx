import type { Metadata } from "next";
import { PlansManager } from "@/components/admin/PlansManager";
import { getPlans, getUsers } from "@/lib/admin";
import { accessStatus } from "@/lib/format";

export const metadata: Metadata = { title: "Planos" };

export default async function AdminPlansPage() {
  const [plans, users] = await Promise.all([getPlans(), getUsers()]);
  const subscribers: Record<string, number> = {};
  for (const u of users) {
    if (u.planId && accessStatus(u) === "ativo") subscribers[u.planId] = (subscribers[u.planId] ?? 0) + 1;
  }
  return <PlansManager initial={plans} subscribers={subscribers} />;
}
