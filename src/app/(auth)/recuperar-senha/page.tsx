import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DemoForm, Field } from "@/components/auth/fields";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <>
      <Link
        href="/entrar"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-extrabold">Recuperar senha</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </p>

      <DemoForm className="mt-7 space-y-4">
        <Field label="E-mail" type="email" name="email" autoComplete="email" placeholder="voce@email.com" required />
        <Button type="submit" size="lg" className="w-full">
          Enviar link
        </Button>
      </DemoForm>
    </>
  );
}
