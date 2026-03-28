import { get, postJson, putJson, del } from "./http";
import { loadStoredAuth, decryptWithKey } from "./auth";
import type { NormalizedList } from "@/types";

type ParamValue = string | number | boolean | null | undefined;
type Params = Record<string, ParamValue>;

const withSession = (params: Params = {}): Params => {
	// Auth is handled via Authorization: Bearer <JWT> header in http.ts.
	// The SPA does NOT pass sessionid/melpid as query params for admin endpoints —
	// doing so causes the backend to validate the (potentially stale) sessionid
	// and return 401 even when the JWT is valid.
	return { ...params };
};

const decodeResponse = async (res: unknown): Promise<unknown> => {
	const auth = loadStoredAuth();
	const obj = res as Record<string, unknown> | null;
	if (obj && typeof obj.data === "string" && auth?.keyHex) {
		try {
			const plain = await decryptWithKey(obj.data, auth.keyHex);
			const parsed = JSON.parse(plain) as Record<string, unknown>;
			return parsed?.data || parsed;
		} catch {
			return res;
		}
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
		params: withSession({ clientid }),
	});
	return decodeResponse(raw);
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
	const params = withSession({ page, count });
	const raw = await get(`/admin/domain/${clientid}`, { params });
	return decodeResponse(raw);
};

// ==================== ADMIN MANAGEMENT ====================

export const fetchAdmins = async (
	clientid = "",
	page = 1,
): Promise<unknown> => {
	const raw = await get("/admin/admins", {
		params: withSession({ clientid, page }),
	});
	return decodeResponse(raw);
};

export const activateAdmin = async (
	clientid: string,
	userid: string,
): Promise<unknown> => {
	const params = withSession({ clientid, userid });
	return postJson("/admin/admin", {}, { params });
};

export const deactivateAdmin = async (
	clientid: string,
	userid: string,
): Promise<unknown> => {
	const params = withSession({ clientid, userid });
	return del("/admin/admin", { params });
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
	/** 0 = all, 1 = active, 2 = inactive */
	category?: number;
	filters?: { column: string; value: string }[];
	sort?: { column: string; asc: boolean };
}): Promise<unknown> => {
	const params = withSession({ page, pagesize: pageSize });
	const body = { clientid, category, filters, sort };
	const raw = await postJson("/admin/userlist", body, { params });
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
	return get(`/admin/departments/${clientId}`, { params });
};

export const fetchTitles = async (clientId: string): Promise<unknown> => {
	const params = withSession({});
	return get(`/admin/profile/${clientId}`, { params });
};

export const fetchTeams = async ({
	page = 1,
	pageSize = 20,
	search = "",
	clientid,
}: {
	page?: number;
	pageSize?: number;
	search?: string;
	clientid?: string;
} = {}): Promise<NormalizedList> => {
	const resolvedClientId = clientid ?? loadStoredAuth()?.clientid;
	const params = withSession({ page, count: pageSize });
	const body = {
		clientid: resolvedClientId ? Number(resolvedClientId) : undefined,
		groupType: 0,
		query: search,
	};
	const raw = await postJson("/admin/group/list", body, { params });
	const decoded = await decodeResponse(raw);
	return normalizeListResponse(decoded);
};

export const fetchGroups = async ({
	page = 1,
	pageSize = 20,
	search = "",
	clientid,
}: {
	page?: number;
	pageSize?: number;
	search?: string;
	clientid?: string;
} = {}): Promise<NormalizedList> => {
	const resolvedClientId = clientid ?? loadStoredAuth()?.clientid;
	const params = withSession({ page, count: pageSize });
	const body = {
		clientid: resolvedClientId ? Number(resolvedClientId) : undefined,
		groupType: 1,
		query: search,
	};
	const raw = await postJson("/admin/group/list", body, { params });
	const decoded = await decodeResponse(raw);
	return normalizeListResponse(decoded);
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
): Promise<unknown> => {
	const params = withSession({});
	const raw = await postJson("/admin/export/users/v1", filters, { params });
	return raw; // Don't decrypt, might be a file download
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
	count = 20,
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
	const params = withSession({ page, count });
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
	const params = withSession({ clientid: payload.clientid as ParamValue });
	return postJson("/admin/usergroup", payload, { params });
};

export const updateUserGroup = async (
	payload: Record<string, unknown>,
): Promise<unknown> => {
	const params = withSession({ clientid: payload.clientid as ParamValue });
	return putJson("/admin/usergroup", payload, { params });
};

export const deleteUserGroup = async (
	groupid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	return del(`/admin/usergroup/${groupid}`, { params });
};

export const deleteUserGroups = async (
	groupids: string[],
	clientid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	const body = { ids: groupids };
	return postJson("/admin/usergroup/deleteAll", body, { params });
};

export const fetchUserGroupById = async (
	groupid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	const raw = await get(`/admin/usergroup/${groupid}`, { params });
	return decodeResponse(raw);
};

export const fetchUserGroupMembers = async (
	groupid: string,
	clientid: string,
	page = 1,
	size = 20,
): Promise<unknown> => {
	const params = withSession({ clientid, page, size });
	const raw = await get(`/admin/usergroup/${groupid}/member`, { params });
	return decodeResponse(raw);
};

export const fetchUserGroupPolicies = async (
	groupid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	const raw = await get(`/admin/usergroup/${groupid}/policy`, { params });
	return decodeResponse(raw);
};

export const addUserGroupMembers = async (
	groupid: string,
	clientid: string,
	members: unknown,
): Promise<unknown> => {
	const params = withSession({ clientid });
	return postJson(`/admin/usergroup/${groupid}/add`, members, { params });
};

export const removeUserGroupMember = async (
	groupid: string,
	clientid: string,
	participantid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	return del(`/admin/usergroup/${groupid}/${participantid}/remove`, { params });
};

export const removeUserGroupMembers = async (
	groupid: string,
	memberIds: string[],
): Promise<unknown> => {
	const params = withSession();
	const body = { ids: memberIds };
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
	const params = withSession({ clientid, page, count, search });
	const raw = await get("/admin/policy/list", { params });
	return decodeResponse(raw);
};

export const fetchPolicyById = async (
	policyid: string,
	clientid: string,
): Promise<unknown> => {
	const params = withSession({ clientid });
	const raw = await get(`/admin/policy/${policyid}`, { params });
	return decodeResponse(raw);
};

export const createPolicy = async (
	payload: Record<string, unknown>,
): Promise<unknown> => {
	const params = withSession({ clientid: payload.clientid as ParamValue });
	return postJson("/admin/policy", payload, { params });
};

export const updatePolicy = async (
	policyid: string,
	payload: Record<string, unknown>,
): Promise<unknown> => {
	const params = withSession();
	return postJson(`/admin/policy/${policyid}/name`, payload, { params });
};

export const deletePolicy = async (policyid: string): Promise<unknown> => {
	const params = withSession();
	return del(`/admin/policy/${policyid}`, { params });
};

export const deletePolicies = async (policyIds: string[]): Promise<unknown> => {
	const params = withSession();
	const body = { ids: policyIds };
	return postJson("/admin/policy/deleteAll", body, { params });
};

export const assignPolicy = async (
	policyid: string,
	entities: unknown,
): Promise<unknown> => {
	const params = withSession();
	return postJson(`/admin/policy/${policyid}/add`, entities, { params });
};

export const revokePolicy = async (
	policyid: string,
	activeid: string,
): Promise<unknown> => {
	const params = withSession();
	return del(`/admin/policy/${policyid}/${activeid}`, { params });
};

export const revokePolicies = async (
	policyid: string,
	activeids: unknown,
): Promise<unknown> => {
	const params = withSession();
	return postJson(`/admin/policy/${policyid}/revoke`, activeids, { params });
};

export const assignMultiplePolicies = async (
	payload: unknown,
): Promise<unknown> => {
	const params = withSession();
	return postJson("/admin/policy/entity/addAll", payload, { params });
};

export const removeMultiplePolicies = async (
	payload: unknown,
): Promise<unknown> => {
	const params = withSession();
	return postJson("/admin/policy/entity/removeAll", payload, { params });
};

// ==================== USER REGISTRATION/INVITATION ====================

export const bulkInviteUsers = async (
	file: File,
	hasHeader = true,
): Promise<unknown> => {
	const auth = loadStoredAuth();
	const formData = new FormData();
	formData.append("file", file);
	formData.append("melpId", auth?.user?.melpid || "");
	formData.append("sessionid", auth?.sessionid || "");
	formData.append("hasHeader", String(hasHeader));

	const API_BASE = (
		import.meta.env.VITE_MELP_API_BASE || "/MelpService/"
	).replace(/\/+$/, "/");
	const url = `${API_BASE}/admin/invite/bulk/v1`;

	const res = await fetch(url, {
		method: "POST",
		body: formData,
	});
	if (!res.ok) throw new Error(`Request failed (${res.status})`);
	return res.json() as Promise<unknown>;
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
	const melpId = auth?.user?.melpid || "";
	const params = withSession({
		clientid,
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
