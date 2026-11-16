"use client";

/** Identificador deste aparelho/navegador (para contar as telas). */
export function getDeviceId(): string {
  const make = () => `d-${crypto.randomUUID()}`;
  try {
    let id = localStorage.getItem("amora:device");
    if (!id) {
      id = make();
      localStorage.setItem("amora:device", id);
    }
    return id;
  } catch {
    // navegador sem armazenamento (ex.: modo privado restrito)
    const w = window as unknown as { __amoraDevice?: string };
    w.__amoraDevice ??= make();
    return w.__amoraDevice;
  }
}

/** Nome amigável do aparelho a partir do "user agent". */
export function describeDevice(ua: string | null | undefined): string {
  const s = ua ?? "";
  const os = /iPhone/.test(s)
    ? "iPhone"
    : /iPad/.test(s)
      ? "iPad"
      : /Android/.test(s)
        ? /Mobile/.test(s) ? "Celular Android" : "Tablet Android"
        : /SmartTV|SMART-TV|Tizen|Web0S|webOS|BRAVIA|AFT/.test(s)
          ? "Smart TV"
          : /Windows/.test(s)
            ? "Computador Windows"
            : /Macintosh/.test(s)
              ? "Mac"
              : /Linux/.test(s)
                ? "Computador Linux"
                : "Aparelho";
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /OPR\//.test(s)
      ? "Opera"
      : /SamsungBrowser/.test(s)
        ? "Samsung Internet"
        : /CriOS|Chrome\//.test(s)
          ? "Chrome"
          : /FxiOS|Firefox/.test(s)
            ? "Firefox"
            : /Safari/.test(s)
              ? "Safari"
              : "";
  return browser ? `${os} · ${browser}` : os;
}
