"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { Field, PasswordField } from "@/components/auth/fields";
import { Button } from "@/components/ui/Button";
import { entrarComoAdmin, type AdminLoginState } from "./actions";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(entrarComoAdmin, {});
  const error = state.error;

  return (
    <form action={action} className="mt-7 space-y-4">
      <Field label="E-mail" type="email" name="email" autoComplete="username" defaultValue={state.email} required />
      <PasswordField name="password" autoComplete="current-password" required />
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger ring-1 ring-danger/25">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
        {pending ? "Entrando…" : "Entrar no painel"}
      </Button>
    </form>
  );
}
