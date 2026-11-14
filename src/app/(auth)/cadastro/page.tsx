import type { Metadata } from "next";
import Link from "next/link";
import { DemoForm, Field, PasswordField } from "@/components/auth/fields";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Criar conta</h1>
      <p className="mt-1 text-sm text-fg-muted">Leva menos de um minuto.</p>

      <DemoForm className="mt-7 space-y-4">
        <Field label="Nome" name="name" autoComplete="name" placeholder="Como quer ser chamado" required />
        <Field label="E-mail" type="email" name="email" autoComplete="email" placeholder="voce@email.com" required />
        <PasswordField
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          minLength={8}
          required
        />
        <label className="flex items-start gap-2 text-sm text-fg-muted">
          <input type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-brand-600" />
          <span>
            Li e aceito os <span className="font-semibold text-fg">Termos de uso</span> e a{" "}
            <span className="font-semibold text-fg">Política de privacidade</span>.
          </span>
        </label>
        <Button type="submit" size="lg" className="w-full">
          Criar conta
        </Button>
      </DemoForm>

      <p className="mt-6 text-center text-sm text-fg-muted">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-bold text-fg hover:text-brand-300">
          Entrar
        </Link>
      </p>
    </>
  );
}
