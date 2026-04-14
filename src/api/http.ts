import { loadStoredAuth, refreshJwtToken, updateStoredJwt } from "./auth";
import type { AuthState } from "@/types";
import { popupApi } from "@/components/shared/popup";

export class ApiRequestError extends Error {
	status: number;
	body?: unknown;

	constructor(
		message: string,
		{ status, body }: { status: number; body?: unknown },
	) {
		super(message);
		this.name = "ApiRequestError";
		this.status = status;
		this.body = body;
	}
}

const API_BASE = (
	import.meta.env.VITE_MELP_API_BASE || "/MelpService/"
).replace(/\/+$/, "");

// JWT refresh configuration
const JWT_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const JWT_REFRESH_TIMESTAMP_KEY = "melp_jwt_refreshed_at";
let jwtRefreshPromise: Promise<string> | null = null;

const buildUrl = (
	path: string,
	params: Record<string, string | number | boolean | undefined | null> = {},
): string => {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const fullPath = `${API_BASE}${normalizedPath}`;
	const url = new URL(fullPath, window.location.origin);
	Object.entries(params).forEach(([k, v]) => {
		if (v !== undefined && v !== null && v !== "")
			url.searchParams.set(k, String(v));
	});
	return url.toString();
};

const getLegacyToken = (): string => {
	const stored = localStorage.getItem("melpAuthToken");
	if (stored) return String(stored).trim();

	const sessionRaw = localStorage.getItem("usersessiondata");
	if (sessionRaw) {
		try {
			const parsed = JSON.parse(sessionRaw) as Record<string, unknown>;
			const legacyCandidates = [
				parsed?.JWT_TOKEN,
				parsed?.jwt_TOKEN,
				parsed?.access_token,
				parsed?.token,
			];
			for (const value of legacyCandidates) {
				if (typeof value === "string" && value.trim()) return value.trim();
			}
		} catch {
			// ignore malformed data
		}
	}

	return "";
};

const getJwtToken = (): string => {
	const auth = loadStoredAuth();
	const candidate = auth?.jwt || auth?.JWT_TOKEN || "";
	if (candidate && typeof candidate === "string" && candidate.trim()) {
		return candidate.replace(/^Bearer\s+/i, "").trim();
	}
	return getLegacyToken();
};

const getSessionId = (): string => {
	const auth = loadStoredAuth();
	return auth?.sessionid || "";
};

const getDeviceId = (): string => {
	const auth: AuthState | null = loadStoredAuth();
	return auth?.deviceid || localStorage.getItem("melp_device_id") || "";
};

const hasSessionForRefresh = (): boolean => {
	return Boolean(getSessionId() && getDeviceId());
};

const getAuthHeaders = (): Record<string, string> => {
	const token = getJwtToken();
	if (!token) return {};
	return { Authorization: `Bearer ${token}` };
};

const seedRefreshTimestampIfMissing = (): void => {
	if (localStorage.getItem(JWT_REFRESH_TIMESTAMP_KEY)) return;
	const token = getJwtToken();
	if (!token) return;
	localStorage.setItem(JWT_REFRESH_TIMESTAMP_KEY, Date.now().toString());
};

const refreshJwtIfNeeded = async (): Promise<void> => {
	seedRefreshTimestampIfMissing();
	const lastRefresh = Number(
		localStorage.getItem(JWT_REFRESH_TIMESTAMP_KEY) || 0,
	);
	const now = Date.now();

	if (now - lastRefresh < JWT_REFRESH_INTERVAL_MS) return;
	if (!hasSessionForRefresh()) return;
	if (jwtRefreshPromise) {
		await jwtRefreshPromise;
		return;
	}

	const sessionId = getSessionId();
	const deviceId = getDeviceId();

	try {
		jwtRefreshPromise = refreshJwtToken(sessionId, deviceId);
		const newToken = await jwtRefreshPromise;
		if (newToken) {
			updateStoredJwt(newToken);
			localStorage.setItem(JWT_REFRESH_TIMESTAMP_KEY, Date.now().toString());
		}
	} catch (err) {
		console.warn("Unable to refresh JWT token:", (err as Error).message);
	} finally {
		jwtRefreshPromise = null;
	}
};

const refreshAccessToken = async (): Promise<string> => {
	if (jwtRefreshPromise) return jwtRefreshPromise;

	const sessionId = getSessionId();
	const deviceId = getDeviceId();

	if (!sessionId || !deviceId) {
		throw new Error("Missing session or device information");
	}

	jwtRefreshPromise = refreshJwtToken(sessionId, deviceId);

	try {
		const newToken = await jwtRefreshPromise;
		if (newToken) {
			updateStoredJwt(newToken);
			localStorage.setItem(JWT_REFRESH_TIMESTAMP_KEY, Date.now().toString());
			return newToken;
		}
		throw new Error("Invalid refresh token response");
	} finally {
		jwtRefreshPromise = null;
	}
};

const shouldRetryAuth = (status: number, hasRetried = false): boolean => {
	if (hasRetried) return false;
	if (status !== 401) return false;
	return hasSessionForRefresh() && !!getJwtToken();
};

const handleSessionExpired = (): void => {
	console.log("Session expired, clearing storage and redirecting to login");

	sessionStorage.clear();
	localStorage.removeItem("melp_admin_auth");
	localStorage.removeItem("melp_temp_session");
	localStorage.removeItem("melp_device_id");
	localStorage.removeItem(JWT_REFRESH_TIMESTAMP_KEY);

	popupApi.warning(
		"Session Expired",
		"Your session has expired. Please login again to continue.",
		() => { window.location.href = "/login" },
	);
};

const parseJsonOrNull = async (response: Response): Promise<unknown> => {
	const text = await response.text().catch(() => "");
	if (!text) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch (err) {
		console.warn("Failed to parse JSON response", err);
		return null;
	}
};

interface RequestOptions {
	params?: Record<string, string | number | boolean | undefined | null>;
	body?: unknown;
	signal?: AbortSignal;
	hasRetried?: boolean;
}

const makeRequest = async <T = unknown>(
	method: string,
	path: string,
	{ params = {}, body = null, signal, hasRetried = false }: RequestOptions = {},
): Promise<T> => {
	await refreshJwtIfNeeded();

	const url = buildUrl(path, params);
	const headers: Record<string, string> = { ...getAuthHeaders() };

	const options: RequestInit = { method, headers, signal };

	if (body !== null) {
		headers["Content-Type"] = "application/json";
		options.body = JSON.stringify(body);
	}

	options.headers = headers;

	const res = await fetch(url, options);

	if (res.status === 401) {
		if (shouldRetryAuth(res.status, hasRetried)) {
			try {
				await refreshAccessToken();
				return makeRequest<T>(method, path, {
					params,
					body,
					signal,
					hasRetried: true,
				});
			} catch {
				handleSessionExpired();
				throw new Error("Session expired");
			}
		} else {
			handleSessionExpired();
			throw new Error("Session expired");
		}
	}

	if (res.status === 429) {
		throw new ApiRequestError("Too many requests. Please try again later.", {
			status: 429,
		});
	}

	if (!res.ok) {
		const body = await parseJsonOrNull(res);
		const fallbackText =
			typeof body === "string"
				? body
				: JSON.stringify(body || {});
		throw new ApiRequestError(
			`Request failed (${res.status}): ${fallbackText}`,
			{ status: res.status, body },
		);
	}

	return parseJsonOrNull(res) as T;
};

export const get = async <T = unknown>(
	path: string,
	{
		params,
		signal,
	}: {
		params?: Record<string, string | number | boolean | undefined | null>;
		signal?: AbortSignal;
	} = {},
): Promise<T> => {
	return makeRequest<T>("GET", path, { params, signal });
};

export const postJson = async <T = unknown>(
	path: string,
	body: unknown = {},
	{
		params,
		signal,
	}: {
		params?: Record<string, string | number | boolean | undefined | null>;
		signal?: AbortSignal;
	} = {},
): Promise<T> => {
	return makeRequest<T>("POST", path, { params, body, signal });
};

export const putJson = async <T = unknown>(
	path: string,
	body: unknown = {},
	{
		params,
		signal,
	}: {
		params?: Record<string, string | number | boolean | undefined | null>;
		signal?: AbortSignal;
	} = {},
): Promise<T> => {
	return makeRequest<T>("PUT", path, { params, body, signal });
};

export const del = async <T = unknown>(
	path: string,
	{
		params,
		signal,
	}: {
		params?: Record<string, string | number | boolean | undefined | null>;
		signal?: AbortSignal;
	} = {},
): Promise<T> => {
	return makeRequest<T>("DELETE", path, { params, signal });
};

export { getSessionId, getDeviceId, getJwtToken, hasSessionForRefresh };
