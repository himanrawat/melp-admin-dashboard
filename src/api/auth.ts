import { ec as EC } from "elliptic";
import { sha256 } from "js-sha256";
import type { AuthState } from "@/types";

const API_BASE = (
	import.meta.env.VITE_MELP_API_BASE || "/MelpService/"
).replace(/\/+$/, "/");
const API_ROOT = API_BASE.replace(/\/+$/, "");
const REFRESH_ENDPOINT =
	import.meta.env.VITE_JWT_REFRESH_URL || `${API_ROOT}/auth/token`;

const TOKEN_CANDIDATES = [
	"access_token",
	"jwt_TOKEN",
	"JWT_TOKEN",
	"token",
	"jwt",
] as const;

const extractTokenFromPayload = (payload: unknown): string => {
	if (!payload) return "";
	const obj = payload as Record<string, unknown>;
	const targets = [
		obj,
		obj?.data,
		obj?.result,
		obj?.response,
		(obj?.data as Record<string, unknown>)?.data,
	];
	for (const target of targets) {
		if (!target || typeof target !== "object") continue;
		const rec = target as Record<string, unknown>;
		for (const key of TOKEN_CANDIDATES) {
			const value = rec[key];
			if (typeof value === "string" && value.trim()) return value.trim();
		}
	}
	if (typeof payload === "string" && (payload as string).trim())
		return (payload as string).trim();
	return "";
};

const IV_BYTES = new TextEncoder().encode("0123456789ABCDEF");
const curve = new EC("p256");

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++)
		binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
};

const base64ToBytes = (b64: string): Uint8Array => {
	const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
};

const postForm = async (
	path: string,
	data: Record<string, string>,
): Promise<Record<string, unknown>> => {
	const url = `${API_BASE}${path}`;
	const body = new URLSearchParams(data);
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	if (!res.ok) throw new Error(`Request failed (${res.status})`);
	return res.json() as Promise<Record<string, unknown>>;
};

const generateDeviceId = (): string => {
	const existing = localStorage.getItem("melp_device_id");
	if (existing) return existing;
	const rand = Math.floor(100000 + Math.random() * 900000);
	const id = `${rand}${Date.now()}`;
	localStorage.setItem("melp_device_id", id);
	return id;
};

const deriveKeyHex = (
	clientKey: EC.KeyPair,
	serverX: string,
	serverY: string,
): string => {
	const toHex = (value: string): string =>
		BigInt(value).toString(16).padStart(64, "0");

	const serverPub = curve.keyFromPublic(
		{
			x: toHex(serverX),
			y: toHex(serverY),
		},
		"hex",
	);

	const sharedPoint = serverPub.getPublic().mul(clientKey.getPrivate());
	const encoded = sharedPoint.encode("hex", false);
	return sha256(encoded);
};

const encryptString = async (
	plain: string,
	keyHex: string,
): Promise<string> => {
	const keyBytes = new Uint8Array(
		keyHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
	);
	const data = new TextEncoder().encode(plain);
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyBytes.buffer as ArrayBuffer,
		{ name: "AES-CBC" },
		false,
		["encrypt"],
	);
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-CBC", iv: IV_BYTES },
		cryptoKey,
		data.buffer as ArrayBuffer,
	);
	return arrayBufferToBase64(encrypted);
};

const encryptValue = async (plain: string, keyHex: string): Promise<string> => {
	if (!plain || !keyHex) return "";
	return encryptString(plain, keyHex);
};

const decryptString = async (
	cipherB64: string,
	keyHex: string,
): Promise<string> => {
	const keyBytes = new Uint8Array(
		keyHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
	);
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyBytes.buffer as ArrayBuffer,
		{ name: "AES-CBC" },
		false,
		["decrypt"],
	);
	const cipherBytes = base64ToBytes(cipherB64);
	const plainBuffer = await crypto.subtle.decrypt(
		{ name: "AES-CBC", iv: IV_BYTES },
		cryptoKey,
		cipherBytes.buffer as ArrayBuffer,
	);
	return new TextDecoder().decode(new Uint8Array(plainBuffer)).trim();
};

export const ensureWebSession = async (): Promise<{
	deviceid: string;
	sessionid: string;
	keyHex: string;
}> => {
	const deviceid = generateDeviceId();
	const clientKey = curve.genKeyPair();
	const coords = {
		xDec: clientKey.getPublic().getX().toString(10),
		yDec: clientKey.getPublic().getY().toString(10),
	};
	const existingSession = localStorage.getItem("melp_temp_session") || "";

	const payload: Record<string, string> = {
		deviceid,
		client_x: coords.xDec,
		client_y: coords.yDec,
		devicetype: "2",
		sessionid: existingSession,
	};

	const response = await postForm("generatewebmelpsession", payload);
	if (response.status !== "SUCCESS")
		throw new Error((response.message as string) || "Unable to create session");

	const { sessionid, server_x, server_y } = response as {
		sessionid: string;
		server_x: string;
		server_y: string;
	};
	localStorage.setItem("melp_temp_session", sessionid);

	const keyHex = deriveKeyHex(clientKey, server_x, server_y);
	return { deviceid, sessionid, keyHex };
};

export const login = async ({
	email,
	password,
}: {
	email: string;
	password: string;
}): Promise<AuthState> => {
	const { deviceid, sessionid, keyHex } = await ensureWebSession();

	const encEmail = await encryptString(email.trim().toLowerCase(), keyHex);
	const encPassword = await encryptString(password, keyHex);

	const payload: Record<string, string> = {
		email: encEmail,
		password: encPassword,
		devicetype: "2",
		deviceid,
		sessionid,
		appversion: "2.3",
		version: "3",
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
		language: "en",
	};

	const response = await postForm("melplogin/v1", payload);
	if (!response.data)
		throw new Error((response.message as string) || "Login failed");

	let decrypted: Record<string, unknown>;
	try {
		const plain = await decryptString(response.data as string, keyHex);
		decrypted = JSON.parse(plain) as Record<string, unknown>;
	} catch (err) {
		try {
			const plain = atob(response.data as string);
			decrypted = JSON.parse(plain) as Record<string, unknown>;
		} catch {
			console.error("Decrypt failed", err);
			throw new Error("Unable to decrypt server response. Please retry login.");
		}
	}
	if (decrypted.status !== "SUCCESS")
		throw new Error((decrypted.message as string) || "Login failed");

	const sessionToken = (decrypted.new_session as string) || sessionid;
	const jwt = (decrypted.JWT_TOKEN as string) || "";
	const user = {
		email: decrypted.email as string,
		fullName: decrypted.fullname as string,
		melpid: decrypted.melpid as string,
	};

	const encryptedMelpid = await encryptValue(
		decrypted.melpid as string,
		keyHex,
	);
	const clientid =
		(decrypted.clientid as string) ||
		(decrypted.client_id as string) ||
		"";
	const clientname =
		(decrypted.clientname as string) ||
		(decrypted.client_name as string) ||
		"";
	const authState: AuthState = {
		deviceid,
		sessionid: sessionToken,
		keyHex,
		jwt,
		user,
		encryptedMelpid,
		clientid,
		clientname,
	};
	localStorage.setItem("melp_admin_auth", JSON.stringify(authState));
	if (clientid) {
		localStorage.setItem("melp_admin_clientid", clientid);
		localStorage.setItem("melp_admin_clientname", clientname);
	}
	return authState;
};

export const loadStoredAuth = (): AuthState | null => {
	const raw = localStorage.getItem("melp_admin_auth");
	if (!raw) return null;
	try {
		return JSON.parse(raw) as AuthState;
	} catch {
		return null;
	}
};

export const clearAuth = (): void => {
	localStorage.removeItem("melp_admin_auth");
	localStorage.removeItem("melp_temp_session");
};

export const decryptWithKey = async (
	cipherB64: string,
	keyHex: string,
): Promise<string> => decryptString(cipherB64, keyHex);

export const refreshJwtToken = async (
	sessionId: string,
	deviceId: string,
): Promise<string> => {
	if (!sessionId || !deviceId) {
		throw new Error("Missing session or device information");
	}

	const response = await fetch(REFRESH_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Session ${sessionId}`,
			"X-Device-Id": deviceId,
		},
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(
			`Token refresh failed (${response.status})${errorText ? `: ${errorText}` : ""}`,
		);
	}

	const responsePayload: unknown = await response.json().catch(() => null);
	const token = extractTokenFromPayload(responsePayload);
	if (!token) throw new Error("Invalid refresh token response");
	return token;
};

export const updateStoredJwt = (jwtToken: string): void => {
	if (!jwtToken) return;
	const normalized = String(jwtToken)
		.replace(/^Bearer\s+/i, "")
		.trim();
	if (!normalized) return;

	const auth = loadStoredAuth();
	if (!auth) return;

	const nextAuth: AuthState = {
		...auth,
		jwt: normalized,
		JWT_TOKEN: normalized,
	};

	try {
		localStorage.setItem("melp_admin_auth", JSON.stringify(nextAuth));
	} catch (err) {
		console.warn("Unable to persist refreshed JWT in auth state", err);
	}

	try {
		localStorage.setItem("JWT_TOKEN", normalized);
	} catch (err) {
		console.warn("Unable to update legacy JWT_TOKEN storage", err);
	}

	try {
		localStorage.setItem("melpAuthToken", normalized);
	} catch (err) {
		console.warn("Unable to update melpAuthToken storage", err);
	}
};
