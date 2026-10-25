// Keep the backend error status with its message.
export class ApiError extends Error {
    constructor(message: string, public readonly status: number) {
        super(message);
        this.name = "ApiError";
    }
}

// Development uses mock data unless API mode is selected.
export const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" || (
    process.env.NEXT_PUBLIC_DATA_SOURCE !== "mock" && process.env.NODE_ENV === "production"
);

// All backend requests go through this helper.
export async function apiRequest<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
    if (!base) {
        throw new Error("Set NEXT_PUBLIC_API_BASE_URL to connect the backend.");
    }

    // Send the session cookie and avoid stale API responses.
    const response = await fetch(`${base}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        },
        cache: "no-store"
    });
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = typeof body?.message === "string" ? body.message : `Request failed (${response.status}).`;
        throw new ApiError(message, response.status);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
}

export function jsonBody(value: unknown): string {
    return JSON.stringify(value);
}
