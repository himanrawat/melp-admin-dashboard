import { ApiRequestError, get, getJwtToken, postJson, putJson, del } from "./http";
import { loadStoredAuth, decryptWithKey, encryptWithSessionKey } from "./auth";
import type { NormalizedList } from "@/types";

type ParamValue = string | number | boolean | null | undefined;
type Params = Record<string, ParamValue>;

const withSession = (params: Params = {}): Params => {
	// Access-management endpoints still expect the legacy session id in query
	// params even though the SPA also sends a Bearer token.
	const auth = loadStoredAuth();
	const sessionid = auth?.sessionid?.trim();
	return sessionid ? { ...params, sessionid } : { ...params };
};

const getEncryptedMelpid = (): string | undefined => {
	const auth = loadStoredAuth();
	const encryptedMelpid = auth?.encryptedMelpid?.trim();
	if (encryptedMelpid) return encryptedMelpid;
	return undefined;
};

const withAccessMelpid = (params: Params = {}): Params => {
	const melpid = getEncryptedMelpid();
	const withSessionParams = withSession(params);
	return melpid ? { ...withSessionParams, melpid } : { ...withSessionParams };
};

const withLegacyAccessParams = (params: Params = {}): Params => {
	const melpid = getEncryptedMelpid();
	return melpid ? { ...params, melpid } : { ...params };
};

const decodeResponse = async (res: unknown): Promise<unknown> => {
	const auth = loadStoredAuth();
	const obj = res as Record<string, unknown> | null;
	if (!obj) return res;

	// Encrypted response: data field is an AES-encrypted base64 string
	if (typeof obj.data === "string" && auth?.keyHex) {
		try {
			const plain = await decryptWithKey(obj.data, auth.keyHex);
			const parsed = JSON.parse(plain) as Record<string, unknown>;
			return parsed?.data || parsed;
		} catch {
			// Not encrypted — fall through to the service-envelope handler below
		}
	}

	// Unencrypted service envelope: { status: "SUCCESS", data: X }
	// The Java API wraps responses in this shape. Strip the envelope so callers
	// receive the payload directly (mirrors what the old PHP model does manually
	// via `serviceResp.data` before passing data to callbacks).
	if (obj.status === "SUCCESS" && "data" in obj) {
		const data = obj.data;
		if (typeof data === "string") {
			// Some endpoints (e.g. domain policies, group policies) return data
			// as a JSON-encoded string. Parse it; if it fails return as-is.
			try {
				return JSON.parse(data) as unknown;
			} catch {
				return data;
			}
		}
		return data;
	}

	return res;
};

const normalizeListResponse = <T = unknown>(
	res: unknown,
): NormalizedList<T> => {
	const obj = res as Record<string, unknown> | null;
	const dataField = obj?.data as
		| Record<string, unknown>
		| unknown[]
		| undefined;
	const payload =
		dataField &&
		typeof dataField === "object" &&
		!Array.isArray(dataField) &&
		Array.isArray((dataField as Record<string, unknown>)?.list)
			? (dataField as Record<string, unknown>)
			: ((dataField || obj) as Record<string, unknown> | unknown[]);

	if (Array.isArray(payload)) return { list: payload as T[] };

	const payloadObj = payload as Record<string, unknown>;
	if (Array.isArray(payloadObj?.list)) {
		return {
			list: payloadObj.list as T[],
			pageCount: payloadObj.pageCount as number | undefined,
			pageSize: payloadObj.pageSize as number | undefined,
			totalCount: payloadObj.totalCount as number | undefined,
		};
	}

	const nestedData = payloadObj?.data as
		| Record<string, unknown>
		| unknown[]
		| undefined;
	if (Array.isArray((nestedData as Record<string, unknown>)?.list)) {
		const data = nestedData as Record<string, unknown>;
		return {
			list: data.list as T[],
			pageCount: data.pageCount as number | undefined,
			pageSize: data.pageSize as number | undefined,
			totalCount: data.totalCount as number | undefined,
		};
	}

	if (Array.isArray(nestedData)) return { list: nestedData as T[] };

	return { list: [] };
};

// ==================== DOMAIN MANAGEMENT ====================

export const fetchDomains = async (clientid = ""): Promise<unknown> => {
	const raw = await get("/AdminPanel/domains", {
		params: withAccessMelpid({ clientid }),
	});
	return decodeResponse(raw);
};

export const fetchAuditLogs = async ({
	clientid,
	page = 1,
	count = 20,
	search = "",
	sortAsc = false,
	actions = [],
}: {
	clientid?: string;
	page?: number;
	count?: number;
	search?: string;
	sortAsc?: boolean;
	actions?: string[];
} = {}): Promise<NormalizedList> => {
	const params = withSession({
		clientid: clientid ? Number(clientid) : undefined,
		page,
		count,
	});
	const body: Record<string, unknown> = {
		search: search.trim(),
		sort: {
			column: "ACTION_TIME",
			asc: sortAsc,
		},
	};
	if (actions.length > 0) {
		body.filters = {
			column: "ACTION",
			value: actions.join(","),
		};
	}
	const raw = await postJson("/admin/audit/logs", body, { params });
	const decoded = await decodeResponse(raw);
	return normalizeListResponse(decoded);
};

export const verifyDomain = async (domain: string): Promise<unknown> => {
	const raw = await get("/admin/domain/verify", {
		params: withSession({ domain }),
	});
	return decodeResponse(raw);
};

export const getDomainSecret = async (domain: string): Promise<unknown> => {
	const raw = await get("/admin/domain/Secret", {
		params: withSession({ domain }),
	});
	return decodeResponse(raw);
};

export const fetchDomainPolicies = async (
	clientid: string,
	page = 1,
	count = 10,
): Promise<unknown> => {
	const params = withAccessMelpid({ page, count });
	const raw = await get(`/admin/domain/${clientid}`, { params });
	return decodeResponse(raw);
};

// ==================== ADMIN MANAGEMENT ====================

export const fetchAdmins = async (
	clientid = "",
	page = 1,
): Promise<unknown> => {
	const raw = await get("/admin", {
		params: withSession({ clientid, page }),
	});
	return decodeResponse(raw);
};

export const activateAdmin = async (
	clientid: string,
	userid: string,
): Promise<unknown> => {
	// AdminPanel/admin is a legacy endpoint that decrypts every URL param.
	// Send only the three encrypted params the old panel sends — no sessionid or extras.
	const encUserId = await encryptWithSessionKey(userid);
	const encClientId = await encryptWithSessionKey(clientid);
	const encMelpid = getEncryptedMelpid();
	const params: Params = { userid: encUserId, clientid: encClientId };
	if (encMelpid) params.melpid = encMelpid;
	return postJson("/AdminPanel/admin", {}, { params });
};

export const deactivateAdmin = async (
	clientid: string,
	userid: string,
): Promise<unknown> => {
	const encUserId = await encryptWithSessionKey(userid);
	const encClientId = await encryptWithSessionKey(clientid);
	const encMelpid = getEncryptedMelpid();
	const params: Params = { userid: encUserId, clientid: encClientId };
	if (encMelpid) params.melpid = encMelpid;
	return del("/AdminPanel/admin", { params });
};

// ==================== USER MANAGEMENT ====================

export const fetchUsers = async ({
	page = 1,
	pageSize = 20,
	clientid,
	category = 0,
	filters = [],
	sort = { column: "FULL_NAME", asc: true },
}: {
	page?: number;
	pageSize?: number;
	clientid?: string | number;
	/** 0 = all, 1 = active, 2 = inactive, 3 = admin */
	category?: number;
	filters?: { column: string; value: string }[];
	sort?: { column: string; asc: boolean };
}): Promise<NormalizedList> => {
	const params = withSession({ page, pagesize: pageSize });
	const body = { clientid, category, filters, sort };
	const raw = await postJson("/admin/userlist", body, { params });
	const decoded = await decodeResponse(raw);
	return normalizeListResponse(decoded);
};

export const fetchUserPolicyDetails = async (
	userid: string,
): Promise<unknown> => {
	const params = withAccessMelpid({ userid });
	const raw = await get(`/admin/userpolicy/${userid}`, { params });
	return decodeResponse(raw);
};

export const updateUser = async (
	payload: Record<string, unknown>,
): Promise<unknown> => {
	const params = withSession({});
	return putJson("/admin/update/user", payload, { params });
};

export const deleteUsers = async (emails: string[] = []): Promise<unknown> => {
	const params = withSession({ emails: emails.join(",") });
	return del("/admin/users", { params });
};

export const deleteUserByMelpid = async (melpid: string): Promise<unknown> => {
	const params = withSession({});
	return del(`/admin/user/${melpid}/delete`, { params });
};

export const activateUser = async (
	email: string,
	name: string,
): Promise<unknown> => {
	const params = withSession({ email, name });
	return postJson("/admin/user", {}, { params });
};

export const deactivateUsers = async (
	emails: string[] = [],
): Promise<unknown> => {
	const params = withSession({ emails: emails.join(",") });
	return del("/admin/users", { params });
};

export const fetchDepartments = async (clientId: string): Promise<unknown> => {
	const params = withSession({});
	const raw = await get(`/admin/departments/${clientId}`, { params });
	return decodeResponse(raw);
};

export const fetchTitles = async (clientId: string): Promise<unknown> => {
	const params = withSession({});
	const raw = await get(`/admin/profile/${clientId}`, { params });
	return decodeResponse(raw);
};

export const fetchTeams = async ({
	page = 1,
	pageSize = 20,
	search = "",
	clientid,
	isActive,
}: {
	page?: number;
	pageSize?: number;
	search?: string;
	clientid?: string;
	isActive?: 0 | 1;
} = {}): Promise<NormalizedList> => {
	const resolvedClientId = clientid ?? loadStoredAuth()?.clientid;
	const params = withSession({ page, count: pageSize });
	const body: Record<string, unknown> = {
		clientid: resolvedClientId ? Number(resolvedClientId) : undefined,
		groupType: 0,
		query: search.trim(),
		sort: { column: "GROUP_NAME", asc: true },
	};
	if (isActive !== undefined) {
		body.isActive = isActive;
	}
	const raw = await postJson("/admin/group/list", body, { params });
	const decoded = await decodeResponse(raw);
	return normalizeListResponse(decoded);
};

export const fetchGroups = async ({
	page = 1,
	pageSize = 20,
	search = "",
	clientid,
	isActive,
}: {
	page?: number;
	pageSize?: number;
	search?: string;
	clientid?: string;
	isActive?: 0 | 1;
} = {}): Promise<NormalizedList> => {
	const resolvedClientId = clientid ?? loadStoredAuth()?.clientid;
	const params = withSession({ page, count: pageSize });
	const body: Record<string, unknown> = {
		clientid: resolvedClientId ? Number(resolvedClientId) : undefined,
		groupType: 1,
		query: search.trim(),
		sort: { column: "GROUP_NAME", asc: true },
	};
	if (isActive !== undefined) {
		body.isActive = isActive;
	}
	const raw = await postJson("/admin/group/list", body, { params });
	const decoded = await decodeResponse(raw);
	return normalizeListResponse(decoded);
};

export const fetchArchivedTeamGroups = async ({
	groupType,
	page = 1,
	pageSize = 20,
	search = "",
	clientid,
}: {
	groupType: 0 | 1;
	page?: number;
	pageSize?: number;
	search?: string;
	clientid?: string;
}): Promise<NormalizedList> => {
	const resolvedClientId = clientid ?? loadStoredAuth()?.clientid;
	const params = withSession({ page, count: pageSize });
	const body = {
		clientid: resolvedClientId ? Number(resolvedClientId) : undefined,
		groupType,
		query: search.trim(),
		sort: { column: "GROUP_NAME", asc: true },
	};
	const raw = await postJson("/admin/group/archivelist", body, { params });
	const decoded = await decodeResponse(raw);
	return normalizeListResponse(decoded);
};

export const archiveTeamGroup = async (
	groupid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withSession({ clientid, groupid });
	return postJson(`/admin/group/${groupid}/archive`, {}, { params });
};

export const activateTeamGroup = async (
	groupid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withSession({ clientid, groupid });
	return postJson(`/admin/group/${groupid}/activate`, {}, { params });
};

export const fetchDeletedUsers = async ({
	clientid,
	page = 1,
	count = 20,
	status,
	filters = [],
	sort = { field: "USER_NAME", asc: true },
}: {
	clientid?: string;
	page?: number;
	count?: number;
	status?: number;
	filters?: unknown[];
	sort?: Record<string, unknown>;
} = {}): Promise<NormalizedList> => {
	const params = withSession({ page, count });
	const body = {
		clientId: clientid ? Number(clientid) : undefined,
		category: 0,
		status,
		filters,
		sort,
	};
	const raw = await postJson("/admin/user/delete/list", body, { params });
	const decoded = await decodeResponse(raw);
	return normalizeListResponse(decoded);
};

export const exportUsers = async (
	filters: Record<string, unknown> = {},
): Promise<{ blob: Blob; filename?: string }> => {
	const params = withSession({});
	const API_BASE = (
		import.meta.env.VITE_MELP_API_BASE || "/MelpService/"
	).replace(/\/+$/, "");
	const url = new URL(`${API_BASE}/admin/export/users/v1`, window.location.origin);
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			url.searchParams.set(key, String(value));
		}
	});

	const token = getJwtToken();
	const res = await fetch(url.toString(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(filters),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		let body: unknown = text;
		try {
			body = text ? JSON.parse(text) : null;
		} catch {
			// Keep raw text when the export endpoint returns a non-JSON failure body.
		}
		throw new ApiRequestError(`Export request failed (${res.status}).`, {
			status: res.status,
			body,
		});
	}

	const contentDisposition = res.headers.get("Content-Disposition") || "";
	const filenameMatch =
		/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition);
	const filename = filenameMatch
		? decodeURIComponent(filenameMatch[1] || filenameMatch[2] || "")
		: undefined;

	return {
		blob: await res.blob(),
		filename,
	};
};

export const fetchTeamById = async (
	groupid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	const raw = await get(`/admin/group/${groupid}`, { params });
	return decodeResponse(raw);
};

export const updateGroupDetails = async (
	groupid: string,
	{ name, description }: { name?: string; description?: string } = {},
): Promise<unknown> => {
	const auth = loadStoredAuth();
	const params = withSession({
		email: auth?.user?.email || "",
		groupid,
		groupname: name,
		description: description || "",
	});
	const raw = await get("/MelpService/updategroupnamedesc", { params });
	return decodeResponse(raw);
};

export const fetchTeamParticipants = async (
	groupid: string,
	clientid: string,
	page = 1,
	count?: number,
): Promise<NormalizedList> => {
	const params = withSession({ clientid, page, count });
	const raw = await get(`/admin/group/${groupid}/participant`, { params });
	const decoded = await decodeResponse(raw);
	return normalizeListResponse(decoded);
};

export const addTeamMembers = async (
	groupid: string,
	clientid: string,
	members: unknown,
): Promise<unknown> => {
	const params = withSession({ clientid });
	return postJson(`/admin/group/${groupid}/add`, members, { params });
};

export const removeTeamMember = async (
	groupid: string,
	clientid: string,
	participantid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	return del(`/admin/group/${groupid}/${participantid}/remove`, { params });
};

export const assignTeamAdmin = async (
	groupid: string,
	clientid: string,
	participantid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	return postJson(
		`/admin/group/${groupid}/${participantid}/admin`,
		{},
		{ params },
	);
};

export const removeTeamAdmin = async (
	groupid: string,
	clientid: string,
	participantid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	return del(`/admin/group/${groupid}/${participantid}/admin`, { params });
};

// ==================== USER GROUPS (PERMISSION-BASED) ====================

export const fetchUserGroups = async ({
	page = 1,
	count = 20,
	filters = {},
}: {
	page?: number;
	count?: number;
	filters?: Record<string, unknown>;
}): Promise<unknown> => {
	const params = withAccessMelpid({ page, count });
	const body = { ...filters };
	const normalizedSort = (body as Record<string, unknown>).sort || {
		column: "GROUP_NAME",
		asc: true,
	};
	const payload = { ...body, sort: normalizedSort };
	const raw = await postJson("/admin/usergroup/list", payload, { params });
	return decodeResponse(raw);
};

export const createUserGroup = async (
	payload: Record<string, unknown>,
): Promise<unknown> => {
	const params = withAccessMelpid({
		clientid: payload.clientid as ParamValue,
	});
	return postJson("/admin/usergroup", payload, { params });
};

export const updateUserGroup = async (
	payload: Record<string, unknown>,
): Promise<unknown> => {
	const params = withAccessMelpid({
		clientid: payload.clientid as ParamValue,
	});
	return putJson("/admin/usergroup", payload, { params });
};

export const deleteUserGroup = async (
	groupid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withAccessMelpid({ clientid });
	return del(`/admin/usergroup/${groupid}`, { params });
};

export const deleteUserGroups = async (
	groupids: string[],
	clientid: string,
): Promise<unknown> => {
	const params = withAccessMelpid({ clientid });
	const body = {
		clientid: Number(clientid),
		keys: groupids,
	};
	return postJson("/admin/usergroup/deleteAll", body, { params });
};

export const fetchUserGroupById = async (
	groupid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withAccessMelpid({ clientid });
	const raw = await get(`/admin/usergroup/${groupid}`, { params });
	return decodeResponse(raw);
};

export const fetchUserGroupMembers = async (
	groupid: string,
	clientid: string,
	page = 1,
	size = 20,
): Promise<unknown> => {
	const params = withAccessMelpid({ clientid, page, size });
	const raw = await get(`/admin/usergroup/${groupid}/member`, { params });
	return decodeResponse(raw);
};

export const fetchUserGroupPolicies = async (
	groupid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withAccessMelpid({ clientid });
	const raw = await get(`/admin/usergroup/${groupid}/policy`, { params });
	return decodeResponse(raw);
};

export const addUserGroupMembers = async (
	groupid: string,
	clientid: string,
	members: unknown,
): Promise<unknown> => {
	const params = { clientid };
	return postJson(`/admin/usergroup/${groupid}/add`, members, { params });
};

export const removeUserGroupMember = async (
	groupid: string,
	clientid: string,
	participantid: string,
): Promise<unknown> => {
	const params = withAccessMelpid({ clientid });
	return del(`/admin/usergroup/${groupid}/${participantid}/remove`, { params });
};

export const removeUserGroupMembers = async (
	groupid: string,
	clientid: string,
	memberIds: string[],
): Promise<unknown> => {
	const params = withAccessMelpid({ clientid, groupid });
	const body = {
		clientid: Number(clientid),
		keys: memberIds,
	};
	return postJson(`/admin/usergroup/${groupid}/participants/remove`, body, {
		params,
	});
};

// ==================== POLICY MANAGEMENT ====================

export const fetchPolicies = async ({
	clientid,
	page = 1,
	count = 10,
	search = "",
}: {
	clientid: string;
	page?: number;
	count?: number;
	search?: string;
}): Promise<unknown> => {
	const params = withAccessMelpid({ clientid, page, count, search });
	const raw = await get("/admin/policy/list", { params });
	return decodeResponse(raw);
};

export const fetchPolicyById = async (
	policyid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withLegacyAccessParams({ clientid });
	const raw = await get(`/admin/policy/${policyid}`, { params });
	return decodeResponse(raw);
};

export const fetchPolicyFeatures = async (
	clientid?: string,
): Promise<unknown> => {
	const resolvedClientId = clientid ?? loadStoredAuth()?.clientid;
	const params = withLegacyAccessParams({
		clientid: resolvedClientId ? Number(resolvedClientId) : undefined,
	});
	const raw = await get("/admin/feature", { params });
	return decodeResponse(raw);
};

export const createPolicy = async (
	payload: Record<string, unknown>,
): Promise<unknown> => {
	const params = withLegacyAccessParams({
		clientid: payload.clientid as ParamValue,
	});
	return postJson("/admin/policy", payload, { params });
};

export const updatePolicy = async (
	policyid: string,
	payload: Record<string, unknown>,
): Promise<unknown> => {
	const params = withLegacyAccessParams({
		clientid: payload.clientid as ParamValue,
	});
	return postJson(`/admin/policy/${policyid}/name`, payload, { params });
};

export const deletePolicy = async (policyid: string): Promise<unknown> => {
	const params = withAccessMelpid();
	return del(`/admin/policy/${policyid}`, { params });
};

export const deletePolicies = async (
	policyIds: string[],
	clientid?: string,
): Promise<unknown> => {
	const params = withAccessMelpid({
		clientid: clientid ? Number(clientid) : undefined,
	});
	const body = {
		clientid: clientid ? Number(clientid) : undefined,
		keys: policyIds,
	};
	return postJson("/admin/policy/deleteAll", body, { params });
};

export const assignPolicy = async (
	policyid: string,
	entities: unknown,
): Promise<unknown> => {
	const params = withAccessMelpid();
	return postJson(`/admin/policy/${policyid}/add`, entities, { params });
};

export const revokePolicy = async (
	policyid: string,
	activeid: string,
): Promise<unknown> => {
	const params = withAccessMelpid();
	return del(`/admin/policy/${policyid}/${activeid}`, { params });
};

export const revokePolicies = async (
	policyid: string,
	activeids: unknown,
): Promise<unknown> => {
	const params = withAccessMelpid();
	return postJson(`/admin/policy/${policyid}/revoke`, activeids, { params });
};

export const assignMultiplePolicies = async (
	payload: unknown,
): Promise<unknown> => {
	const params = withAccessMelpid();
	return postJson("/admin/policy/entity/addAll", payload, { params });
};

export const removeMultiplePolicies = async (
	payload: unknown,
): Promise<unknown> => {
	const params = withAccessMelpid();
	return postJson("/admin/policy/entity/removeAll", payload, { params });
};

// ==================== USER REGISTRATION/INVITATION ====================

export const bulkInviteUsers = async (
	file: File,
): Promise<unknown> => {
	const auth = loadStoredAuth();

	// Encrypt file content and melpId to match the legacy SPA flow:
	// 1. Read file as binary, base64-encode it, then encrypt with the session key
	// 2. Encrypt melpId with the session key
	const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
	const b64Content = btoa(
		String.fromCharCode(...new Uint8Array(arrayBuffer)),
	);
	const encryptedContent = await encryptWithSessionKey(b64Content);
	const encryptedFile = new File([encryptedContent], file.name, {
		type: file.type,
		lastModified: file.lastModified,
	});

	const encryptedMelpId = await encryptWithSessionKey(auth?.user?.melpid || "");

	const formData = new FormData();
	formData.append("file", encryptedFile);
	formData.append("melpId", encryptedMelpId);

	const API_BASE = (
		import.meta.env.VITE_MELP_API_BASE || "/MelpService/"
	).replace(/\/+$/, "");
	const url = `${API_BASE}/admin/invite/bulk/v1`;

	const token = getJwtToken();
	const res = await fetch(url, {
		method: "POST",
		headers: token ? { Authorization: `Bearer ${token}` } : {},
		body: formData,
	});

	const parseBody = async (): Promise<unknown> => {
		const text = await res.text().catch(() => "");
		if (!text) return null;
		try {
			return JSON.parse(text) as unknown;
		} catch {
			return text;
		}
	};

	const responseBody = await parseBody();
	if (!res.ok) {
		throw new ApiRequestError(`Bulk invite request failed (${res.status}).`, {
			status: res.status,
			body: responseBody,
		});
	}

	if (res.status === 204) return null;

	// Server returns 200 with {status:'FAILURE', message:'...'} for business-logic errors
	const decoded = await decodeResponse(responseBody);
	const decodedObj = decoded as Record<string, unknown> | null;
	if (decodedObj?.status === "FAILURE") {
		throw new ApiRequestError("Bulk invite failed.", {
			status: 200,
			body: { message: decodedObj.message as string },
		});
	}

	return decoded;
};

export const manualInviteUsers = async (users: unknown[]): Promise<unknown> => {
	const auth = loadStoredAuth();
	const melpId = auth?.user?.melpid || "";
	const params = withSession({ melpId });
	const body = { newUsers: users };
	return postJson("/admin/invite/mannual/v1", body, { params });
};

export const fetchRegistrationRequests = async ({
	clientid,
	status = 3,
	pagenumber = 1,
	pagesize = 20,
}: {
	clientid: string;
	status?: number;
	pagenumber?: number;
	pagesize?: number;
}): Promise<unknown> => {
	const auth = loadStoredAuth();
	const encClientId = await encryptWithSessionKey(clientid);
	const melpId =
		getEncryptedMelpid() ||
		(await encryptWithSessionKey(auth?.user?.melpid || ""));
	const params = withSession({
		clientid: encClientId,
		status,
		pagenumber,
		pagesize,
		melpId,
	});
	const raw = await get("/admin/invite/requests", { params });
	return decodeResponse(raw);
};

export const resetUserPassword = async (melpId: string): Promise<unknown> => {
	const params = withSession({ melpId });
	return postJson("/admin/user/password", {}, { params });
};

// ==================== CLIENT CONFIGURATION ====================

export const fetchClientConfig = async (
	category: string,
	signed = false,
): Promise<unknown> => {
	const params = withSession({ signed });
	const raw = await get(`/MelpService/config/${category}`, { params });
	return decodeResponse(raw);
};

// ==================== DOMAIN MERGE ====================

export const addDomainMerge = async (
	clientid: string,
	payload: unknown,
): Promise<unknown> => {
	const params = withSession();
	return postJson(`/mergeDomain/${clientid}/add`, payload, { params });
};

export const removeDomainMerge = async (
	clientid: string,
	payload: unknown,
): Promise<unknown> => {
	const params = withSession();
	return postJson(`/mergeDomain/${clientid}/remove`, payload, { params });
};

export const fetchMergedDomains = async (
	clientid: string,
): Promise<unknown> => {
	const params = withSession();
	const raw = await get(`/mergeDomain/${clientid}`, { params });
	return decodeResponse(raw);
};
