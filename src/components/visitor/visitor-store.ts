"use client";

import { useSyncExternalStore } from "react";

/**
 * Estado do VISITANTE (quem abriu o site sem estar logado).
 * O servidor decide se é visitante e liga isto; cabeçalho, menu e
 * cards só leem. Não é segurança — as páginas fechadas continuam
 * protegidas no servidor; isto só muda o que aparece na tela.
 */
/** resolved: o servidor já disse se é visitante ou assinante. */
type State = {
  visitor: boolean;
  resolved: boolean;
  plansOpen: boolean;
  loginOpen: boolean;
};
let state: State = {
  visitor: false,
  resolved: false,
  plansOpen: false,
  loginOpen: false,
};
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const visitorStore = {
  setVisitor: (visitor: boolean) => set({ visitor, resolved: true }),
  openPlans: () => set({ plansOpen: true, loginOpen: false }),
  closePlans: () => set({ plansOpen: false }),
  openLogin: () => set({ loginOpen: true, plansOpen: false }),
  closeLogin: () => set({ loginOpen: false }),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useVisitor() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
