import type { Metadata } from "next";
import { UsersManager } from "@/components/admin/UsersManager";
import { getPlans, getUsers } from "@/lib/admin";

export const metadata: Metadata = { title: "Usuários" };

export default async function AdminUsersPage() {
  const [users, plans] = await Promise.all([getUsers(), getPlans()]);
  return <UsersManager initial={users} plans={plans} />;
}
