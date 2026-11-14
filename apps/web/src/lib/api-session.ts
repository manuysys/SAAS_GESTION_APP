import { ApiError, getAccessToken, refreshSession, setAccessToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SESSION_EXPIRED_MESSAGE = "Tu sesión venció. Volvé a ingresar.";

export type SessionRequestInit = {
  method: "GET" | "POST" | "PATCH";
  /** Tenant activo. Siempre se envía como `X-Tenant-ID`; el backend lo valida contra la membresía. */
  tenantId: string;
  /** Cuerpo JSON. Excluyente con `body`. */
  json?: unknown;
  /** Cuerpo multipart. No se fija Content-Type: el navegador agrega el boundary. */
  body?: FormData;
};

function buildRequest(init: SessionRequestInit): RequestInit {
  const headers = new Headers({ "X-Tenant-ID": init.tenantId });
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (init.body) {
    body = init.body;
  } else if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  return { method: init.method, headers, body, credentials: "include" };
}

/**
 * Envía la request autenticada. Ante 401 intenta un refresh de sesión una vez y reintenta.
 * Si el refresh falla, lanza `ApiError(401)` con un mensaje para el usuario.
 */
export async function sessionFetch(path: string, init: SessionRequestInit): Promise<Response> {
  const first = await fetch(`${API_URL}${path}`, buildRequest(init));
  if (first.status !== 401) {
    return first;
  }

  try {
    const refreshed = await refreshSession();
    setAccessToken(refreshed.access_token);
  } catch {
    throw new ApiError(401, SESSION_EXPIRED_MESSAGE);
  }
  return fetch(`${API_URL}${path}`, buildRequest(init));
}

function errorDetail(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const { detail } = body;
    if (typeof detail === "string" && detail.trim() !== "") {
      return detail;
    }
  }
  return fallback;
}

/** Lee JSON y lanza `ApiError` con el `detail` del servidor si la respuesta no es exitosa. */
export async function readJsonOrThrow<T>(response: Response, fallback: string): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, errorDetail(body, fallback));
  }
  return body as T;
}

/** Lee un archivo binario (CSV) o lanza `ApiError` si la respuesta no es exitosa. */
export async function readBlobOrThrow(response: Response, fallback: string): Promise<Blob> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, errorDetail(body, fallback));
  }
  return response.blob();
}
