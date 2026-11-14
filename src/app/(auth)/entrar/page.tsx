import type { Metadata } from "next";
import Link from "next/link";
import { DemoForm, Field, PasswordField } from "@/components/auth/fields";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Bem-vindo de volta</h1>
      <p className="mt-1 text-sm text-fg-muted">Entre para continuar assistindo.</p>

      <DemoForm className="mt-7 space-y-4">
        <Field label="E-mail" type="email" name="email" autoComplete="email" placeholder="voce@email.com" required />
        <PasswordField name="password" autoComplete="current-password" placeholder="Sua senha" required />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-fg-muted">
            <input type="checkbox" defaultChecked className="size-4 accent-brand-600" /> Manter conectado
          </label>
          <Link href="/recuperar-senha" className="font-semibold text-brand-300 hover:text-brand-200">
            Esqueci a senha
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full">
          Entrar
        </Button>
      </DemoForm>

      <p className="mt-6 text-center text-sm text-fg-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-bold text-fg hover:text-brand-300">
          Criar conta
        </Link>
      </p>
    </>
  );
}
