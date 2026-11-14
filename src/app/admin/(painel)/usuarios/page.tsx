import type { Metadata } from "next";
import { UsersManager } from "@/components/admin/UsersManager";
import { getPlans, getUsers } from "@/lib/admin";
import { NOW, hashString } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Usuários" };

export default async function AdminUsersPage() {
  const [users, plans] = await Promise.all([getUsers(), getPlans()]);
  // Data de referência: a real (com banco) ou a fixa da demonstração
  const now = isSupabaseConfigured ? new Date() : NOW;
  // A "chave" muda quando os dados mudam no servidor, recarregando a lista
  const version = hashString(JSON.stringify(users));
  return <UsersManager key={version} initial={users} plans={plans} now={now.toISOString()} />;
}
