"use client";

import { useEffect } from "react";
import { visitorStore } from "./visitor-store";

/** Avisa a tela que quem está aqui é assinante (mostra sino, perfil etc.). */
export function SessionResolved() {
  useEffect(() => visitorStore.setVisitor(false), []);
  return null;
}
