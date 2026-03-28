# Melp Admin Dashboard - Backend Integration Guide

> **Source project**: `melp_admin/melp-admin/` (working React app with full backend)
> **Target project**: `melp-admin-dashboard/` (new React+TypeScript shell, no backend)
> **Goal**: Port authentication, API layer, and all data flows into the new dashboard

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What Exists in Each Project](#2-what-exists-in-each-project)
3. [Dependencies to Install](#3-dependencies-to-install)
4. [Files to Create](#4-files-to-create)
5. [Authentication Flow - Complete Specification](#5-authentication-flow---complete-specification)
6. [HTTP Client - Complete Specification](#6-http-client---complete-specification)
7. [Auth Context - Complete Specification](#7-auth-context---complete-specification)
8. [Route Protection](#8-route-protection)
9. [Login Page Changes](#9-login-page-changes)
10. [Sidebar & Header Changes](#10-sidebar--header-changes)
11. [Environment Configuration](#11-environment-configuration)
12. [All Admin API Endpoints](#12-all-admin-api-endpoints)
13. [Page-to-API Mapping](#13-page-to-api-mapping)
14. [Data Types & Interfaces](#14-data-types--interfaces)
15. [Implementation Order](#15-implementation-order)

---

## 1. Architecture Overview

### Data Flow (after integration)

```
User Action (click, form submit)
    |
    v
React Page Component (e.g. UsersPage.tsx)
    |
    v
API Service Layer (src/api/admin.ts)
    |-- withSession() injects sessionid + melpid into every call
    |-- decodeResponse() decrypts encrypted API responses
    |
    v
HTTP Client (src/api/http.ts)
    |-- refreshJwtIfNeeded() auto-refreshes JWT every 1 hour
    |-- getAuthHeaders() attaches "Authorization: Bearer {jwt}"
    |-- 401 handler: refresh token + retry once, else redirect /login
    |
    v
fetch() --> Java Backend (WEBSERVICE_JAVA_BASE)
    |
    v
JSON Response --> decodeResponse() --> Component State --> UI
```

### Source File Mapping

| Source (melp_admin/melp-admin/) | Target (melp-admin-dashboard/) | What It Does |
|---|---|---|
| `src/api/auth.js` | `src/api/auth.ts` | ECDH session, AES encrypt/decrypt, login, JWT refresh |
| `src/api/http.js` | `src/api/http.ts` | Fetch wrapper with auth headers, 401 retry, token refresh |
| `src/api/admin.js` | `src/api/admin.ts` | 70+ API endpoint functions |
| `src/context/AuthContext.jsx` | `src/context/auth-context.tsx` | Auth state provider + useAuth hook |
| `src/main.jsx` | `src/main.tsx` (modify) | Wrap with AuthProvider |
| `src/App.jsx` (PrivateRoute) | `src/App.tsx` (modify) | Add PrivateRoute guard |
| `src/pages/Login.jsx` | `src/pages/LoginPage.tsx` (modify) | Wire handleSubmit to real API |

---

## 2. What Exists in Each Project

### melp_admin/melp-admin/ (Source - HAS backend)

```
src/
  api/
    auth.js          <-- ECDH + AES encryption + login + JWT refresh
    http.js          <-- fetch wrapper with auth headers + 401 retry
    admin.js         <-- 70+ API functions (users, teams, policies, etc.)
  context/
    AuthContext.jsx   <-- Auth state management + domain selection
  pages/
    Login.jsx         <-- Real login with useAuth().login()
  App.jsx             <-- PrivateRoute + domain auto-fetch
  main.jsx            <-- AuthProvider wraps App
```

### melp-admin-dashboard/ (Target - NO backend)

```
src/
  api/                <-- DOES NOT EXIST (needs creation)
  context/            <-- DOES NOT EXIST (needs creation)
  hooks/
    use-theme.tsx     <-- Theme only, no auth
  pages/
    LoginPage.tsx     <-- Fake setTimeout login
  components/
    app-sidebar.tsx   <-- Hardcoded user "James William"
    ui/               <-- 30 shadcn/ui components (keep as-is)
  App.tsx             <-- No route protection
  main.tsx            <-- Only ThemeProvider, no AuthProvider
```

---

## 3. Dependencies to Install

The dashboard is missing crypto libraries required for the ECDH + AES login flow.

```bash
npm install elliptic js-sha256
npm install -D @types/elliptic
```

| Package | Version (in source) | Purpose |
|---|---|---|
| `elliptic` | `^6.6.1` | ECDH key pair generation (p256 curve) |
| `js-sha256` | `^0.11.1` | SHA-256 hash for deriving AES key |
| `@types/elliptic` | (dev) | TypeScript type definitions |

**Already present in dashboard** (no install needed): `react-router-dom`, `react`, `react-dom`

---

## 4. Files to Create

### New files to add:

| File | Based On | Notes |
|---|---|---|
| `src/api/auth.ts` | `melp_admin/.../api/auth.js` | Convert to TypeScript, add types |
| `src/api/http.ts` | `melp_admin/.../api/http.js` | Convert to TypeScript, add generics |
| `src/api/admin.ts` | `melp_admin/.../api/admin.js` | Convert to TypeScript, add types |
| `src/context/auth-context.tsx` | `melp_admin/.../context/AuthContext.jsx` | Convert to TypeScript, typed context |
| `.env` | New | API base URL configuration |
| `.env.example` | New | Template for team |

### Existing files to modify:

| File | Change |
|---|---|
| `src/main.tsx` | Wrap App with `<AuthProvider>` |
| `src/App.tsx` | Add `PrivateRoute` component, wrap `AppLayout` |
| `src/pages/LoginPage.tsx` | Replace setTimeout with `useAuth().login()` |
| `src/components/app-sidebar.tsx` | Replace hardcoded user with `useAuth().authState.user` |
| `src/components/layout/site-header.tsx` | Add domain selector + real user name |
| `package.json` | Add `elliptic`, `js-sha256`, `@types/elliptic` |

---

## 5. Authentication Flow - Complete Specification

### Step 1: Session Establishment (ECDH Key Exchange)

**Function**: `ensureWebSession()` in `auth.ts`

```
Client                                  Server
  |                                       |
  |-- Generate ECDH key pair (p256) ----> |
  |                                       |
  |-- POST /MelpService/generatewebmelpsession
  |   Body (URL-encoded form):            |
  |     deviceid: "123456_1711234567890"  |
  |     client_x: "decimal X coordinate"  |
  |     client_y: "decimal Y coordinate"  |
  |     devicetype: "2"                   |
  |     sessionid: "" (or existing)       |
  |                                       |
  |   Response:                           |
  |     { status: "SUCCESS",              |
  |       sessionid: "abc123...",         |
  |       server_x: "decimal X",         |
  |       server_y: "decimal Y" }         |
  |                                       |
  |-- Derive shared secret:               |
  |   sharedPoint = serverPub * clientPriv|
  |   keyHex = sha256(sharedPoint.encode) |
  |                                       |
  |-- Store: deviceid, sessionid, keyHex  |
```

**Device ID generation**:
```
const rand = Math.floor(100000 + Math.random() * 900000)  // 6-digit random
const id = `${rand}${Date.now()}`                           // e.g. "4837291711234567890"
// Stored in localStorage as 'melp_device_id', reused across sessions
```

### Step 2: Login (Encrypted Credentials)

**Function**: `login({ email, password })` in `auth.ts`

**Encryption**: AES-256-CBC
- Key: `keyHex` (32-byte hex string from ECDH)
- IV: Fixed `0123456789ABCDEF` (16 bytes, UTF-8 encoded)
- Padding: PKCS7
- Output: Base64

**Request**:
```
POST /MelpService/melplogin/v1
Content-Type: application/x-www-form-urlencoded

email=<AES encrypted, Base64>&
password=<AES encrypted, Base64>&
devicetype=2&
deviceid=4837291711234567890&
sessionid=abc123...&
appversion=2.3&
version=3&
timezone=Asia/Kolkata&
language=en
```

**Response** (encrypted):
```json
{
  "data": "<Base64 AES-CBC encrypted JSON string>"
}
```

**Decrypted response**:
```json
{
  "status": "SUCCESS",
  "email": "admin@company.com",
  "fullname": "Admin User",
  "melpid": "USR12345",
  "JWT_TOKEN": "eyJhbGciOiJ...",
  "new_session": "newsession123...",
  "usertype": "Business",
  "adminstatus": "1",
  "companyname": "Acme Corp",
  "departmentname": "IT",
  "professionname": "Admin",
  "screen": 4
}
```

**Token extraction priority**: Checks these keys in order:
`access_token` > `jwt_TOKEN` > `JWT_TOKEN` > `token` > `jwt`

### Step 3: Store Auth State

After successful login, save to `localStorage.melp_admin_auth`:
```json
{
  "deviceid": "4837291711234567890",
  "sessionid": "newsession123...",
  "keyHex": "a1b2c3d4e5f6...64chars",
  "jwt": "eyJhbGciOiJ...",
  "user": {
    "email": "admin@company.com",
    "fullName": "Admin User",
    "melpid": "USR12345"
  },
  "encryptedMelpid": "<AES encrypted melpid, Base64>"
}
```

Additional localStorage keys set by the system:
- `melp_device_id` - Device identifier (persists across logins)
- `melp_temp_session` - Temporary session during ECDH handshake
- `melp_admin_clientid` - Selected domain/client ID
- `melp_admin_clientname` - Selected domain/client name
- `melp_jwt_refreshed_at` - Timestamp of last JWT refresh
- `JWT_TOKEN` - Legacy JWT storage (for compatibility)
- `melpAuthToken` - Legacy JWT storage (for compatibility)

---

## 6. HTTP Client - Complete Specification

### File: `src/api/http.ts`

### Request Flow

```
get/postJson/putJson/del()
    |
    v
makeRequest(method, path, options)
    |
    |-- 1. refreshJwtIfNeeded()
    |       Check: (now - lastRefresh) > 3600000ms (1 hour)?
    |       If yes & session exists: POST /auth/token
    |       Headers: { Authorization: "Session {sessionid}", X-Device-Id: "{deviceid}" }
    |       Update stored JWT on success
    |
    |-- 2. Build URL: API_BASE + path + query params
    |
    |-- 3. Add headers:
    |       Authorization: "Bearer {jwt}"
    |       Content-Type: "application/json" (for POST/PUT)
    |
    |-- 4. fetch(url, options)
    |
    |-- 5. Handle response:
    |       200-299: Parse JSON, return
    |       401: refreshAccessToken() + retry ONCE
    |            If retry fails: clearStorage() + redirect /login
    |       429: Throw "Too many requests"
    |       Other: Throw with status + body
```

### Exported Methods

```typescript
get<T>(path: string, options?: { params?: Record<string, string>, signal?: AbortSignal }): Promise<T>
postJson<T>(path: string, body?: object, options?: { params?: Record<string, string>, signal?: AbortSignal }): Promise<T>
putJson<T>(path: string, body?: object, options?: { params?: Record<string, string>, signal?: AbortSignal }): Promise<T>
del<T>(path: string, options?: { params?: Record<string, string>, signal?: AbortSignal }): Promise<T>
```

### JWT Token Retrieval Priority

```
1. auth.jwt            (from melp_admin_auth in localStorage)
2. auth.JWT_TOKEN       (alternative field name)
3. auth.token           (another alternative)
4. localStorage.melpAuthToken  (legacy key)
5. localStorage.usersessiondata -> JWT_TOKEN/jwt_TOKEN/access_token/token  (legacy object)
```

### Session Expiry Handling

When session is truly expired (401 after retry):
1. `sessionStorage.clear()`
2. Remove: `melp_admin_auth`, `melp_temp_session`, `melp_device_id`, `melp_jwt_refreshed_at`
3. `alert("Your session has expired. Please login again to continue.")`
4. `window.location.href = '/login'`

---

## 7. Auth Context - Complete Specification

### File: `src/context/auth-context.tsx`

### Context Value Interface

```typescript
interface AuthState {
  deviceid: string
  sessionid: string
  keyHex: string
  jwt: string
  user: {
    email: string
    fullName: string
    melpid: string
  }
  encryptedMelpid: string
  clientid?: string
  clientname?: string
}

interface AuthContextValue {
  authState: AuthState | null
  isAuthenticated: boolean
  login: (credentials: { email: string; password: string }) => Promise<AuthState>
  logout: () => void
  selectedClient: string
  setSelectedClient: (id: string, name?: string) => void
  selectedClientName: string
  domains: Domain[]
  setDomains: (domains: Domain[]) => void
}
```

### Provider Setup

```
<AuthProvider>
  |-- useState: authState (loaded from localStorage on mount)
  |-- useState: selectedClient (from localStorage.melp_admin_clientid)
  |-- useState: selectedClientName (from localStorage.melp_admin_clientname)
  |-- useState: domains []
  |
  |-- isAuthenticated = Boolean(authState?.sessionid)
  |
  |-- login(credentials):
  |     1. Call loginApi({ email, password })  (from auth.ts)
  |     2. Save result to state + localStorage
  |     3. Return authState
  |
  |-- logout():
  |     1. clearAuth()  (from auth.ts)
  |     2. Set all state to null/empty
  |
  |-- setSelectedClient(id, name):
  |     1. Update state
  |     2. Save to localStorage (melp_admin_clientid, melp_admin_clientname)
  |     3. Merge into authState
  |
  |-- Provides: useAuth() hook
</AuthProvider>
```

### Integration into main.tsx

Current:
```tsx
<StrictMode>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</StrictMode>
```

After:
```tsx
<StrictMode>
  <ThemeProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
</StrictMode>
```

---

## 8. Route Protection

### PrivateRoute Component (add to App.tsx)

```typescript
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}
```

### Updated Route Structure

```
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />        {/* Public */}
    <Route path="/*" element={
      <PrivateRoute>                                         {/* Guard */}
        <AppLayout />                                        {/* Sidebar + Header + Routes */}
      </PrivateRoute>
    } />
  </Routes>
</BrowserRouter>
```

### Post-Login Domain Fetch

After login succeeds and dashboard loads, `AppLayout` should:
1. Call `fetchDomains()` from `admin.ts`
2. If no domain selected: auto-select first domain OR show domain picker
3. Store selected domain via `setSelectedClient(id, name)`
4. The `selectedClient` (clientId) is required for almost every other API call

---

## 9. Login Page Changes

### Current LoginPage.tsx (fake login)

```typescript
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setTimeout(() => {           // <-- FAKE
    navigate("/dashboard")     // <-- No auth
  }, 1200)
}
```

### After Integration

```typescript
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError("")
  setLoading(true)
  try {
    await login({ email, password })    // <-- Real ECDH + AES + API call
    navigate("/dashboard")
  } catch (err) {
    setError(err.message || "Unable to login")
  } finally {
    setLoading(false)
  }
}
```

**UI stays exactly the same** - only the `handleSubmit` internals change.

Also add auto-redirect if already authenticated:
```typescript
useEffect(() => {
  if (isAuthenticated) navigate("/dashboard", { replace: true })
}, [isAuthenticated])
```

---

## 10. Sidebar & Header Changes

### app-sidebar.tsx

**Current** (hardcoded):
```typescript
const data = {
  user: {
    name: "James William",
    email: "william01@gmail.com",
    avatar: "",
  },
}
```

**After**:
```typescript
const { authState, logout } = useAuth()
const user = {
  name: authState?.user?.fullName || "Admin",
  email: authState?.user?.email || "",
  avatar: "",
}
```

### site-header.tsx

Add:
- Domain name display (from `useAuth().selectedClientName`)
- Domain switcher dropdown (click to change domain)
- Logout button wired to `useAuth().logout()` + `navigate("/login")`

---

## 11. Environment Configuration

### `.env` file (create in project root)

```env
# Melp API Base URL
# For local development with XAMPP proxy:
VITE_MELP_API_BASE=/MelpService/

# For direct backend connection:
# VITE_MELP_API_BASE=https://bang.prd.melp.us:5003/

# JWT Refresh endpoint (optional, defaults to {API_BASE}/auth/token)
# VITE_JWT_REFRESH_URL=https://bang.prd.melp.us:5003/MelpService/auth/token
```

### `.env.example` file

```env
# Copy this to .env and update values
VITE_MELP_API_BASE=/MelpService/
# VITE_JWT_REFRESH_URL=
```

### Vite Config

The existing `vite.config.ts` may need a proxy for local development to avoid CORS:

```typescript
server: {
  proxy: {
    '/MelpService': {
      target: 'https://bang.prd.melp.us:5003',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

---

## 12. All Admin API Endpoints

### Helper Functions (used by all endpoints)

```typescript
// Injects sessionid + encrypted melpid into every request's params
withSession(params?: Record<string, any>): Record<string, any>

// Decrypts AES-encrypted API responses using stored keyHex
decodeResponse(res: any): Promise<any>

// Normalizes paginated list responses into { list, pageCount, pageSize, totalCount }
normalizeListResponse(res: any): NormalizedList
```

---

### Domain Management

| Function | Method | Endpoint | Parameters | Body |
|---|---|---|---|---|
| `fetchDomains(clientid?)` | GET | `/AdminPanel/domains` | `sessionid, melpid, clientid` | - |
| `verifyDomain(domain)` | GET | `/admin/domain/verify` | `sessionid, melpid, domain` | - |
| `getDomainSecret(domain)` | GET | `/admin/domain/Secret` | `sessionid, melpid, domain` | - |
| `fetchDomainPolicies(clientid, page, count)` | GET | `/admin/domain/{clientid}` | `sessionid, melpid, page, count` | - |
| `fetchMergedDomains(clientid)` | GET | `/mergeDomain/{clientid}` | `sessionid, melpid` | - |
| `addDomainMerge(clientid, payload)` | POST | `/mergeDomain/{clientid}/add` | `sessionid, melpid` | `payload` |
| `removeDomainMerge(clientid, payload)` | POST | `/mergeDomain/{clientid}/remove` | `sessionid, melpid` | `payload` |

---

### Admin Management

| Function | Method | Endpoint | Parameters | Body |
|---|---|---|---|---|
| `fetchAdmins(clientid, page)` | GET | `/AdminPanel/admins` | `sessionid, melpid, clientid, page` | - |
| `activateAdmin(clientid, userid)` | POST | `/AdminPanel/admin` | `sessionid, melpid, clientid, userid` | `{}` |
| `deactivateAdmin(clientid, userid)` | DELETE | `/AdminPanel/admin` | `sessionid, melpid, clientid, userid` | - |

---

### User Management

| Function | Method | Endpoint | Parameters | Body |
|---|---|---|---|---|
| `fetchUsers({ page, pageSize, filters })` | POST | `/admin/userlist` | `sessionid, melpid, page, pagesize` | `{ ...filters }` |
| `updateUser(payload)` | PUT | `/admin/update/user` | `sessionid, melpid` | `payload` |
| `deleteUsers(emails[])` | DELETE | `/admin/users` | `sessionid, melpid, emails` | - |
| `deleteUserByMelpid(melpid)` | DELETE | `/admin/user/{melpid}/delete` | `sessionid, melpid` | - |
| `activateUser(email, name)` | POST | `/admin/user` | `sessionid, melpid, email, name` | `{}` |
| `deactivateUsers(emails[])` | DELETE | `/admin/users` | `sessionid, melpid, emails` | - |
| `fetchDepartments(clientId)` | GET | `/admin/departments/{clientId}` | `sessionid, melpid` | - |
| `fetchTitles(clientId)` | GET | `/admin/profile/{clientId}` | `sessionid, melpid` | - |
| `fetchDeletedUsers({ clientid, page, count, status, filters, sort })` | POST | `/admin/user/delete/list` | `sessionid, melpid, page, count` | `{ clientId, status, filters, sort }` |
| `exportUsers(filters)` | POST | `/admin/export/users/v1` | `sessionid, melpid` | `filters` |

---

### Teams & Groups Management

| Function | Method | Endpoint | Parameters | Body |
|---|---|---|---|---|
| `fetchTeams({ page, pageSize, search, clientid })` | POST | `/admin/group/list` | `sessionid, melpid, page, count` | `{ clientid, groupType: 0, query }` |
| `fetchGroups({ page, pageSize, search, clientid })` | POST | `/admin/group/list` | `sessionid, melpid, page, count` | `{ clientid, groupType: 1, query }` |
| `fetchTeamById(groupid, clientid)` | GET | `/admin/group/{groupid}` | `sessionid, melpid, clientid` | - |
| `fetchTeamParticipants(groupid, clientid, page, count)` | GET | `/admin/group/{groupid}/participant` | `sessionid, melpid, clientid, page, count` | - |
| `addTeamMembers(groupid, clientid, members)` | POST | `/admin/group/{groupid}/add` | `sessionid, melpid, clientid` | `members` |
| `removeTeamMember(groupid, clientid, participantid)` | DELETE | `/admin/group/{groupid}/{participantid}/remove` | `sessionid, melpid, clientid` | - |
| `assignTeamAdmin(groupid, clientid, participantid)` | POST | `/admin/group/{groupid}/{participantid}/admin` | `sessionid, melpid, clientid` | `{}` |
| `removeTeamAdmin(groupid, clientid, participantid)` | DELETE | `/admin/group/{groupid}/{participantid}/admin` | `sessionid, melpid, clientid` | - |
| `updateGroupDetails(groupid, { name, description })` | GET | `/MelpService/updategroupnamedesc` | `sessionid, email, groupid, groupname, description` | - |

**Note**: Teams = `groupType: 0`, Groups = `groupType: 1` (same endpoint, different type)

---

### User Groups (Permission-Based Access Control)

| Function | Method | Endpoint | Parameters | Body |
|---|---|---|---|---|
| `fetchUserGroups({ page, count, filters })` | POST | `/admin/usergroup/list` | `sessionid, melpid, page, count` | `{ ...filters, sort: { column, asc } }` |
| `createUserGroup(payload)` | POST | `/admin/usergroup` | `sessionid, melpid, clientid` | `payload` |
| `updateUserGroup(payload)` | PUT | `/admin/usergroup` | `sessionid, melpid, clientid` | `payload` |
| `deleteUserGroup(groupid, clientid)` | DELETE | `/admin/usergroup/{groupid}` | `sessionid, melpid, clientid` | - |
| `deleteUserGroups(groupids[], clientid)` | POST | `/admin/usergroup/deleteAll` | `sessionid, melpid, clientid` | `{ ids: groupids }` |
| `fetchUserGroupById(groupid, clientid)` | GET | `/admin/usergroup/{groupid}` | `sessionid, melpid, clientid` | - |
| `fetchUserGroupMembers(groupid, clientid, page, size)` | GET | `/admin/usergroup/{groupid}/member` | `sessionid, melpid, clientid, page, size` | - |
| `fetchUserGroupPolicies(groupid, clientid)` | GET | `/admin/usergroup/{groupid}/policy` | `sessionid, melpid, clientid` | - |
| `addUserGroupMembers(groupid, clientid, members)` | POST | `/admin/usergroup/{groupid}/add` | `sessionid, melpid, clientid` | `members` |
| `removeUserGroupMember(groupid, clientid, participantid)` | DELETE | `/admin/usergroup/{groupid}/{participantid}/remove` | `sessionid, melpid, clientid` | - |
| `removeUserGroupMembers(groupid, memberIds[])` | POST | `/admin/usergroup/{groupid}/participants/remove` | `sessionid, melpid` | `{ ids: memberIds }` |

---

### Policy Management

| Function | Method | Endpoint | Parameters | Body |
|---|---|---|---|---|
| `fetchPolicies({ clientid, page, count, search })` | GET | `/admin/policy/list` | `sessionid, melpid, clientid, page, count, search` | - |
| `fetchPolicyById(policyid, clientid)` | GET | `/admin/policy/{policyid}` | `sessionid, melpid, clientid` | - |
| `createPolicy(payload)` | POST | `/admin/policy` | `sessionid, melpid, clientid` | `payload` |
| `updatePolicy(policyid, payload)` | POST | `/admin/policy/{policyid}/name` | `sessionid, melpid` | `payload` |
| `deletePolicy(policyid)` | DELETE | `/admin/policy/{policyid}` | `sessionid, melpid` | - |
| `deletePolicies(policyIds[])` | POST | `/admin/policy/deleteAll` | `sessionid, melpid` | `{ ids: policyIds }` |
| `assignPolicy(policyid, entities)` | POST | `/admin/policy/{policyid}/add` | `sessionid, melpid` | `entities` |
| `revokePolicy(policyid, activeid)` | DELETE | `/admin/policy/{policyid}/{activeid}` | `sessionid, melpid` | - |
| `revokePolicies(policyid, activeids[])` | POST | `/admin/policy/{policyid}/revoke` | `sessionid, melpid` | `activeids` |
| `assignMultiplePolicies(payload)` | POST | `/admin/policy/entity/addAll` | `sessionid, melpid` | `payload` |
| `removeMultiplePolicies(payload)` | POST | `/admin/policy/entity/removeAll` | `sessionid, melpid` | `payload` |

---

### Registration / Invitation

| Function | Method | Endpoint | Parameters | Body |
|---|---|---|---|---|
| `manualInviteUsers(users[])` | POST | `/admin/invite/mannual/v1` | `sessionid, melpid, melpId` | `{ newUsers: users }` |
| `bulkInviteUsers(file, hasHeader)` | POST | `/admin/invite/bulk/v1` | - | `FormData { file, melpId, sessionid, hasHeader }` |
| `fetchRegistrationRequests({ clientid, status, pagenumber, pagesize })` | GET | `/admin/invite/requests` | `sessionid, melpid, clientid, status, pagenumber, pagesize, melpId` | - |
| `resetUserPassword(melpId)` | POST | `/admin/user/password` | `sessionid, melpid, melpId` | `{}` |

**Note**: `bulkInviteUsers` uses raw `fetch()` with `FormData` (not the http.ts wrapper) because it uploads a file.

---

### Client Configuration

| Function | Method | Endpoint | Parameters | Body |
|---|---|---|---|---|
| `fetchClientConfig(category, signed)` | GET | `/MelpService/config/{category}` | `sessionid, melpid, signed` | - |

---

## 13. Page-to-API Mapping

| Dashboard Page | API Functions Needed | Current State |
|---|---|---|
| **LoginPage** | `login()` from auth.ts | Fake setTimeout |
| **DashboardPage** | `fetchUsers()` (for stats), `fetchDomains()` | Hardcoded numbers |
| **UsersPage** (all/active/inactive) | `fetchUsers()`, `updateUser()`, `activateUser()`, `deactivateUsers()`, `deleteUsers()`, `exportUsers()`, `fetchDepartments()`, `fetchTitles()` | 4 mock users |
| **UsersPage** (deleted) | `fetchDeletedUsers()` | Mock data |
| **TeamsPage** | `fetchTeams()`, `fetchTeamParticipants()`, `addTeamMembers()`, `removeTeamMember()`, `assignTeamAdmin()`, `removeTeamAdmin()` | Empty placeholder |
| **GroupsPage** | `fetchGroups()`, `fetchTeamParticipants()`, `addTeamMembers()`, `removeTeamMember()` | Empty placeholder |
| **AccessGroupsPage** | `fetchUserGroups()`, `createUserGroup()`, `updateUserGroup()`, `deleteUserGroup()`, `fetchUserGroupMembers()`, `addUserGroupMembers()`, `removeUserGroupMember()`, `fetchUserGroupPolicies()` | Empty placeholder |
| **AccessPoliciesPage** | `fetchPolicies()`, `createPolicy()`, `updatePolicy()`, `deletePolicy()`, `assignPolicy()`, `revokePolicy()` | Empty placeholder |
| **AccessDomainsPage** | `fetchDomainPolicies()`, `fetchMergedDomains()`, `addDomainMerge()`, `removeDomainMerge()` | Empty placeholder |
| **RegistrationAddPage** | `manualInviteUsers()` | Static form |
| **RegistrationBulkPage** | `bulkInviteUsers()` | Static form |
| **RegistrationListPage** | `fetchRegistrationRequests()` | Empty placeholder |
| **DomainsPage** | `fetchDomains()`, `verifyDomain()`, `getDomainSecret()` | Empty placeholder |
| **SettingsPage** | `fetchClientConfig()`, `fetchAdmins()`, `activateAdmin()`, `deactivateAdmin()` | Static UI |
| **PaymentsPage** | No API in backend yet | Static UI |

---

## 14. Data Types & Interfaces

### Core Types (create in `src/types/`)

```typescript
// --- Auth ---
interface AuthState {
  deviceid: string
  sessionid: string
  keyHex: string
  jwt: string
  user: AuthUser
  encryptedMelpid: string
  clientid?: string
  clientname?: string
}

interface AuthUser {
  email: string
  fullName: string
  melpid: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  status: "SUCCESS" | "FAILURE"
  message?: string
  email: string
  fullname: string
  melpid: string
  JWT_TOKEN: string
  new_session?: string
  usertype: "Business" | "Individual"
  adminstatus: string
  companyname?: string
  departmentname?: string
  professionname?: string
  screen: number
  mfa_required?: boolean
  action?: string
  otp?: { resendSeconds: number; ttlSeconds: number; attempts: number }
}

// --- Domain ---
interface Domain {
  clientid: string
  client_name: string
  domain: string
  [key: string]: any
}

// --- User ---
interface AdminUser {
  melpid: string
  email: string
  fullname: string
  department?: string
  profession?: string
  status: "active" | "inactive" | "deleted"
  adminstatus?: string
  profileImage?: string
  createdAt?: string
  [key: string]: any
}

// --- Team/Group ---
interface TeamGroup {
  groupid: string
  groupname: string
  clientid: string
  participantCount: number
  groupType: 0 | 1  // 0 = team, 1 = group
  archived?: boolean
  createdAt?: string
  [key: string]: any
}

interface Participant {
  melpid: string
  email: string
  fullname: string
  isAdmin?: boolean
  [key: string]: any
}

// --- User Group (Access Control) ---
interface UserGroup {
  groupid: string
  groupname: string
  memberCount: number
  clientid: string
  [key: string]: any
}

// --- Policy ---
interface Policy {
  policyid: string
  policyname: string
  features: string[]
  assignedCount: number
  clientid: string
  [key: string]: any
}

// --- Pagination ---
interface PaginatedResponse<T> {
  list: T[]
  pageCount?: number
  pageSize?: number
  totalCount?: number
}

// --- Registration ---
interface InviteUser {
  email: string
  name: string
  [key: string]: any
}

interface RegistrationRequest {
  email: string
  name: string
  status: number
  createdAt: string
  [key: string]: any
}
```

---

## 15. Implementation Order

### Phase 1: Auth Foundation (must be done first)

| Step | Task | Files |
|---|---|---|
| 1 | Install `elliptic`, `js-sha256`, `@types/elliptic` | `package.json` |
| 2 | Create `src/api/auth.ts` (port from source auth.js) | New file |
| 3 | Create `src/api/http.ts` (port from source http.js) | New file |
| 4 | Create `src/context/auth-context.tsx` (port from source AuthContext.jsx) | New file |
| 5 | Update `src/main.tsx` - add `<AuthProvider>` | Modify |
| 6 | Update `src/App.tsx` - add `PrivateRoute`, wrap `AppLayout` | Modify |
| 7 | Update `src/pages/LoginPage.tsx` - wire `useAuth().login()` | Modify |
| 8 | Create `.env` with `VITE_MELP_API_BASE` | New file |
| 9 | Update `vite.config.ts` - add proxy for `/MelpService` | Modify |

**After Phase 1**: Login works end-to-end, routes are protected, JWT auto-refreshes.

### Phase 2: Core UI Wiring

| Step | Task | Files |
|---|---|---|
| 10 | Update `app-sidebar.tsx` - real user data from auth | Modify |
| 11 | Update `site-header.tsx` - domain selector + logout | Modify |
| 12 | Add domain fetch + auto-select after login in AppLayout | Modify `App.tsx` |

**After Phase 2**: User sees their real name, can switch domains, can logout.

### Phase 3: API Service Layer

| Step | Task | Files |
|---|---|---|
| 13 | Create `src/api/admin.ts` (port all 70+ endpoints from source) | New file |
| 14 | Create `src/types/index.ts` (all TypeScript interfaces) | New file |

**After Phase 3**: All API functions are available for pages to consume.

### Phase 4: Connect Pages (one at a time)

| Step | Page | Key APIs |
|---|---|---|
| 15 | DashboardPage | `fetchUsers()` for stats, `fetchDomains()` |
| 16 | UsersPage | `fetchUsers()`, `updateUser()`, `deleteUsers()`, `exportUsers()` |
| 17 | TeamsPage | `fetchTeams()`, `fetchTeamParticipants()`, member management |
| 18 | GroupsPage | `fetchGroups()`, same participant APIs |
| 19 | AccessGroupsPage | `fetchUserGroups()`, CRUD + member management |
| 20 | AccessPoliciesPage | `fetchPolicies()`, CRUD + assignment |
| 21 | AccessDomainsPage | `fetchDomainPolicies()`, merge/unmerge |
| 22 | RegistrationAddPage | `manualInviteUsers()` |
| 23 | RegistrationBulkPage | `bulkInviteUsers()` |
| 24 | RegistrationListPage | `fetchRegistrationRequests()` |
| 25 | DomainsPage | `fetchDomains()`, `verifyDomain()`, `getDomainSecret()` |
| 26 | SettingsPage | `fetchClientConfig()`, admin management |

**After Phase 4**: All pages show real data from the backend.

---

## Encryption Reference

### AES-256-CBC (used for login + response decryption)

```
Algorithm:  AES-CBC
Key:        32 bytes (from SHA-256 of ECDH shared secret, hex-encoded)
IV:         "0123456789ABCDEF" (fixed, 16 bytes UTF-8)
Padding:    PKCS7
Input:      UTF-8 text
Output:     Base64 string
Library:    Web Crypto API (crypto.subtle)
```

### ECDH Key Exchange (used for session establishment)

```
Curve:          p256 (NIST P-256)
Library:        elliptic
Client:         Generates key pair, sends public X,Y (decimal) to server
Server:         Returns its public X,Y (decimal) + sessionid
Shared Secret:  serverPub * clientPrivate
Derived Key:    SHA-256(sharedPoint.encode('hex', false))
```

---

## Notes

- **Do NOT modify** any `src/components/ui/` files (shadcn components)
- **Do NOT modify** any CSS/styling files
- **Do NOT change** the route paths - they already match the sidebar navigation
- The `LoginPage.tsx` UI stays exactly as-is - only the submit handler changes
- All TypeScript conversions should use strict types, not `any`
- The source project uses `.jsx` (JavaScript) - target uses `.tsx` (TypeScript)
- react-router-dom: source uses v6, target uses v7 (minor API differences in Navigate/useNavigate)
