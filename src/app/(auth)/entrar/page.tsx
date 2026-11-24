import type { Metadata } from "next";
import { getPublicSetting } from "@/lib/settings";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

/** LOGIN DO CLIENTE — só o e-mail usado na compra. */
export default async function LoginPage() {
  const purchaseUrl = await getPublicSetting<string>("purchase_url");
  return (
    <>
      <div className="text-center">
        <h1 className="text-[30px] leading-tight font-extrabold">Entrar</h1>
        <p className="mt-2 text-sm text-fg-muted">Faça login para continuar assistindo</p>
      </div>
      <LoginForm purchaseUrl={purchaseUrl || "/?planos"} />
    </>
  );
}
