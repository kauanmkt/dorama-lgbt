import type { Metadata } from "next";
import { getPublicSetting } from "@/lib/settings";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

/** LOGIN DO CLIENTE — só o e-mail usado na compra. */
export default async function LoginPage() {
  const purchaseUrl = await getPublicSetting<string>("purchase_url");
  return (
    <>
      <h1 className="text-2xl font-extrabold">Entrar</h1>
      <p className="mt-1 text-sm text-fg-muted">Digite o e-mail que você usou na compra.</p>
      <LoginForm purchaseUrl={purchaseUrl || undefined} />
    </>
  );
}
