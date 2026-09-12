export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// El access token vive en una cookie httpOnly — el navegador la manda solo si el
// fetch tiene credentials:"include", y JS no puede leerla ni guardarla a mano
// (esa es la idea: un XSS ya no puede robar el token con localStorage.getItem).
async function tryRefresh(): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
  return res.ok;
}

export async function api<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (res.status === 401 && !isRetry && path !== "/auth/refresh" && (await tryRefresh())) {
    return api<T>(path, options, true);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message ?? `error ${res.status}`);
  }
  return body as T;
}

// para endpoints que devuelven binario (PDF) en vez de JSON
export async function apiBlob(path: string, isRetry = false): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });

  if (res.status === 401 && !isRetry && (await tryRefresh())) {
    return apiBlob(path, true);
  }
  if (!res.ok) {
    throw new Error(`error ${res.status}`);
  }
  return res.blob();
}

export async function getSession(): Promise<{ id: string; email: string; emailVerified: boolean } | null> {
  try {
    return await api<{ id: string; email: string; emailVerified: boolean }>("/auth/me");
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
}
