# Melp Admin Dashboard - Integration Status

> Last updated: 2026-03-28

---

## Summary

| Category | Status | Details |
|----------|--------|---------|
| **Core Infrastructure** | DONE | Auth, HTTP client, API layer, route guards, env config |
| **Login** | DONE | ECDH + AES encryption, real API call |
| **Data Pages (List/Read)** | DONE (9 pages) | Users, Teams, Groups, Access, Domains, Registration List |
| **Dashboard** | NOT DONE | All 8 widgets use hardcoded data |
| **Form Submissions (Create/Update)** | PARTIAL | Some forms submit, most don't |
| **Payments** | NOT DONE | Entirely hardcoded, no backend API exists |
| **Settings** | NOT DONE | Fake save with setTimeout |

---

## DONE - Core Infrastructure

### API Layer (`src/api/`)

| File | Status | What It Does |
|------|--------|-------------|
| [auth.ts](src/api/auth.ts) | DONE | ECDH key exchange (p256), AES-256-CBC encrypt/decrypt, login, JWT refresh, session management |
| [http.ts](src/api/http.ts) | DONE | Fetch wrapper with `Authorization: Bearer {jwt}`, auto JWT refresh (1hr), 401 retry + redirect, 429 handling |
| [admin.ts](src/api/admin.ts) | DONE | 60+ API endpoint functions: domains, users, teams, groups, policies, registration, config |

### Auth Context (`src/context/`)

| File | Status | What It Does |
|------|--------|-------------|
| [auth-context.tsx](src/context/auth-context.tsx) | DONE | `useAuth()` hook with `login()`, `logout()`, `isAuthenticated`, `selectedClient`, `domains` state, localStorage persistence |

### Types (`src/types/`)

| File | Status | What It Does |
|------|--------|-------------|
| [index.ts](src/types/index.ts) | DONE | TypeScript interfaces for AuthState, User, Domain, Team, Policy, etc. |

### App Shell

| File | What Changed | Status |
|------|-------------|--------|
| [main.tsx](src/main.tsx) | `<AuthProvider>` wraps App inside `<ThemeProvider>` | DONE |
| [App.tsx](src/App.tsx) | `PrivateRoute` component guards all dashboard routes | DONE |
| [app-sidebar.tsx](src/components/app-sidebar.tsx) | Reads `authState.user.fullName` and `email` from `useAuth()` | DONE |
| [site-header.tsx](src/components/layout/site-header.tsx) | Shows real user name + `selectedClientName` from `useAuth()` | DONE |

### Environment & Build

| File | Status | Content |
|------|--------|---------|
| [.env](/.env) | DONE | `VITE_MELP_API_BASE=/MelpService/` |
| [.env.example](/.env.example) | DONE | Template for team |
| [vite.config.ts](vite.config.ts) | DONE | Proxy `/MelpService` to `https://bang.prd.melp.us:5003` |
| [package.json](package.json) | DONE | Added `elliptic`, `js-sha256`, `@types/elliptic` |

---

## DONE - Pages With Real API Integration

### 1. LoginPage.tsx - FULLY INTEGRATED

| Aspect | Status | Details |
|--------|--------|---------|
| Form UI | DONE | Email, password, show/hide toggle, remember me, loading spinner |
| API call | DONE | `useAuth().login({ email, password })` -> ECDH session -> AES encrypt -> `POST /MelpService/melplogin/v1` |
| Error handling | DONE | Catches login errors, displays message |
| Auto-redirect | DONE | If already authenticated, redirects to `/dashboard` |
| Route protection | DONE | `PrivateRoute` blocks unauthenticated access to all other pages |

### 2. UsersPage.tsx - FULLY INTEGRATED

| Aspect | Status | Details |
|--------|--------|---------|
| List users | DONE | Calls `fetchUsers()` with `selectedClient`, maps response fields dynamically |
| Tabs | DONE | All / Active / Inactive / Deleted tabs with client-side filtering |
| Search | DONE | Client-side search on name/email/department |
| Stat cards | DONE | Counts computed from fetched data (not hardcoded) |
| Add user dialog | DONE | Calls `manualInviteUsers()` API |
| Edit/View user | DONE | UI exists, edit dialog present |
| Pagination | PARTIAL | Fetches 200 rows, client-side paging (no server-side pagination) |
| Export CSV | NOT DONE | `exportUsers()` exists in admin.ts but not wired to UI |
| Delete/Deactivate | NOT DONE | API functions exist (`deleteUsers`, `deactivateUsers`) but not wired |

### 3. TeamsPage.tsx - FULLY INTEGRATED (READ)

| Aspect | Status | Details |
|--------|--------|---------|
| List teams | DONE | Calls `fetchTeams()` with `groupType: 0`, search support |
| Stat cards | DONE | Total/Active/Inactive computed from API data |
| Search & filter | DONE | Search + status filter on client-side |
| View team detail | DONE | Dialog shows team info |
| Add team | NOT DONE | Dialog exists but `onAdd` is local state only, no API call |
| Edit/Delete team | NOT DONE | Dropdown menu exists but no API wiring |
| Member management | NOT DONE | `fetchTeamParticipants()`, `addTeamMembers()`, `removeTeamMember()` exist but unused |

### 4. GroupsPage.tsx - FULLY INTEGRATED (READ)

| Aspect | Status | Details |
|--------|--------|---------|
| List groups | DONE | Calls `fetchGroups()` with `groupType: 1` |
| Stat cards | DONE | Computed from fetched data |
| Search & filter | DONE | Client-side filtering |
| Add group | NOT DONE | Dialog is local state only |
| Edit/Delete group | NOT DONE | No API wiring |

### 5. AccessGroupsPage.tsx - FULLY INTEGRATED (READ)

| Aspect | Status | Details |
|--------|--------|---------|
| List user groups | DONE | Calls `fetchUserGroups()` |
| Search & filter | DONE | Client-side |
| Create group | NOT DONE | Dialog exists, `createUserGroup()` in admin.ts not wired |
| Edit/Delete | NOT DONE | `updateUserGroup()`, `deleteUserGroup()` available but not wired |
| Member management | NOT DONE | `addUserGroupMembers()`, `removeUserGroupMember()` not wired |
| Policy assignment | NOT DONE | `fetchUserGroupPolicies()` not wired |

### 6. AccessPoliciesPage.tsx - FULLY INTEGRATED (READ)

| Aspect | Status | Details |
|--------|--------|---------|
| List policies | DONE | Calls `fetchPolicies()` with `selectedClient` |
| Policy cards | DONE | Shows name, effect (allow/deny), resources, assigned count |
| Search | DONE | Client-side filtering |
| Create policy | NOT DONE | Dialog exists, `createPolicy()` in admin.ts not wired |
| Edit/Delete | NOT DONE | `updatePolicy()`, `deletePolicy()` available but not wired |
| Assign/Revoke | NOT DONE | `assignPolicy()`, `revokePolicy()` not wired |

### 7. AccessDomainsPage.tsx - FULLY INTEGRATED (READ)

| Aspect | Status | Details |
|--------|--------|---------|
| List domain access | DONE | Calls `fetchDomains()` |
| Access type display | DONE | Full/Restricted/Blocked with icons |
| Search & filter | DONE | Client-side |
| Configure access | NOT DONE | Dialog is local state only |

### 8. DomainsPage.tsx - FULLY INTEGRATED (READ)

| Aspect | Status | Details |
|--------|--------|---------|
| List domains | DONE | Calls `fetchDomains()` |
| Status display | DONE | Verified/Pending/Failed badges |
| DNS record display | DONE | Shows TXT record details |
| Add domain | NOT DONE | Dialog exists, no API call |
| Verify domain | NOT DONE | `verifyDomain()` in admin.ts not wired |
| Get secret | NOT DONE | `getDomainSecret()` in admin.ts not wired |
| Merge/Unmerge | NOT DONE | `addDomainMerge()`, `removeDomainMerge()` not wired |

### 9. RegistrationListPage.tsx - FULLY INTEGRATED (READ)

| Aspect | Status | Details |
|--------|--------|---------|
| List invitations | DONE | Calls `fetchRegistrationRequests()` |
| Status mapping | DONE | Maps API status codes (1=accepted, 4=expired, 5=cancelled) |
| Search & filter | DONE | By status and source |
| Resend invite | NOT DONE | Button exists, no API call |

---

## NOT DONE - Pages With No API Integration

### 10. RegistrationAddPage.tsx - NO API

| Aspect | Status | Details |
|--------|--------|---------|
| Form UI | DONE | Name, email, phone, department, designation, location, role fields |
| Departments list | HARDCODED | Static array: `["Engineering", "Design", "Sales", ...]` |
| Roles list | HARDCODED | Static array: `["Member", "Manager", "Admin", "Read Only"]` |
| Submit form | NOT DONE | Sets `submitted=true` locally, **no `manualInviteUsers()` call** |
| No `useAuth()` import | -- | Does not import auth context or any API |
| No `api/admin` import | -- | Zero API imports |

### 11. RegistrationBulkPage.tsx - NO API

| Aspect | Status | Details |
|--------|--------|---------|
| Drag & drop upload | DONE | File selection and drag-drop UI works |
| CSV template | HARDCODED | Static string with example rows |
| Upload history | HARDCODED | 4 fake records (`employees_march_2026.csv`, etc.) |
| File processing | FAKE | `setInterval` simulating progress 0-100% |
| Submit upload | NOT DONE | **`bulkInviteUsers()` exists in admin.ts but is never called** |
| No `useAuth()` import | -- | Does not import auth context or any API |
| No `api/admin` import | -- | Zero API imports |

### 12. PaymentsPage.tsx - ENTIRELY HARDCODED

| Aspect | Status | Details |
|--------|--------|---------|
| Subscription info | HARDCODED | "Professional", "$99/month", "Annual" |
| Usage stats | HARDCODED | "156 / 500 users", "45.6 / 100 GB storage" |
| Invoice history | HARDCODED | 5 fake invoices with download buttons that do nothing |
| Plan comparison | HARDCODED | 3 plans (Starter $29, Professional $99, Enterprise $249) |
| Payment method | HARDCODED | "VISA ending in 4242" |
| No `useAuth()` import | -- | Zero auth or API imports |
| Backend API | DOES NOT EXIST | No payment endpoints in `admin.ts` or backend |

### 13. SettingsPage.tsx - MOSTLY HARDCODED

| Aspect | Status | Details |
|--------|--------|---------|
| Profile tab | PARTIAL | Shows `authState.user.fullName` and `email` from `useAuth()` (real) |
| Organisation tab | HARDCODED | Org name "Melp Technologies", website, industry, size - all static |
| Notifications tab | HARDCODED | Toggle switches with local state, no persistence |
| Security tab | HARDCODED | 2FA toggle, "last changed 30 days ago", fake session list |
| Save buttons | FAKE | All use `setTimeout(800ms)` -> show "Saved" checkmark |
| No API calls | -- | `fetchClientConfig()` exists in admin.ts but is never imported |

### 14. DashboardPage.tsx - ALL WIDGETS HARDCODED

The page itself is just a layout wrapper. All data lives in the child components, and **none of them import any API or auth**:

| Component | File | Hardcoded Data |
|-----------|------|---------------|
| **StatCards** | `stat-cards.tsx` | `3,842` users, `2,651` active, `854` inactive, `202` teams, `164` teams, `38` groups, `23` domains, `970` total users, `42` avg/domain |
| **UserGrowthChart** | `user-growth-chart.tsx` | 7 months of data: `[{Jan:120,98}, {Feb:145,115}, ... {Jul:350,310}]` |
| **UserStatusBreakdown** | `user-status-breakdown.tsx` | `active: 2651, inactive: 854, deleted: 337` |
| **RecentRegistrations** | `recent-registrations.tsx` | 4 fake users: "Sarah Johnson", "Mark Chen", "Lisa Patel", "James Wilson" |
| **RecentActivities** | `recent-activities.tsx` | 4 fake entries: "Sarah Johnson joined...", "Policy updated...", "Domain added...", "Team created..." |
| **DomainOverview** | `domain-overview.tsx` | 4 fake domains: `engineering.melp.co (482 users)`, `marketing.melp.co (156)`, `sales.melp.co (234)`, `support.melp.co (98)` |
| **AccessSummary** | `access-summary.tsx` | `24` user groups, `18` policies, `42` access rules |
| **PaymentsOverview** | `payments-overview.tsx` | "Professional" plan, `$99/mo`, "156/500 users", "45.6/100 GB" |

### 15. ComponentsPage.tsx - DEV ONLY

Showcase page for UI components. Not relevant to backend integration.

---

## API Functions: Available vs Used

### USED (imported by at least one page)

| Function | Used By |
|----------|---------|
| `login()` (auth.ts) | LoginPage |
| `fetchUsers()` | UsersPage |
| `manualInviteUsers()` | UsersPage (add user dialog) |
| `fetchTeams()` | TeamsPage |
| `fetchGroups()` | GroupsPage |
| `fetchUserGroups()` | AccessGroupsPage |
| `fetchPolicies()` | AccessPoliciesPage |
| `fetchDomains()` | AccessDomainsPage, DomainsPage |
| `fetchRegistrationRequests()` | RegistrationListPage |

### NOT USED (exist in admin.ts but never imported)

| Function | Intended For |
|----------|-------------|
| `updateUser()` | UsersPage - edit user |
| `deleteUsers()` | UsersPage - bulk delete |
| `deleteUserByMelpid()` | UsersPage - single delete |
| `activateUser()` | UsersPage - reactivate |
| `deactivateUsers()` | UsersPage - deactivate |
| `fetchDeletedUsers()` | UsersPage - deleted tab |
| `exportUsers()` | UsersPage - CSV export |
| `fetchDepartments()` | UsersPage, RegistrationAddPage |
| `fetchTitles()` | UsersPage, RegistrationAddPage |
| `fetchTeamById()` | TeamsPage - team detail |
| `fetchTeamParticipants()` | TeamsPage - member list |
| `addTeamMembers()` | TeamsPage - add members |
| `removeTeamMember()` | TeamsPage - remove member |
| `assignTeamAdmin()` | TeamsPage - make admin |
| `removeTeamAdmin()` | TeamsPage - remove admin |
| `updateGroupDetails()` | TeamsPage/GroupsPage - edit |
| `createUserGroup()` | AccessGroupsPage - create |
| `updateUserGroup()` | AccessGroupsPage - edit |
| `deleteUserGroup()` | AccessGroupsPage - delete |
| `deleteUserGroups()` | AccessGroupsPage - bulk delete |
| `fetchUserGroupById()` | AccessGroupsPage - detail |
| `fetchUserGroupMembers()` | AccessGroupsPage - members |
| `fetchUserGroupPolicies()` | AccessGroupsPage - policies |
| `addUserGroupMembers()` | AccessGroupsPage - add members |
| `removeUserGroupMember()` | AccessGroupsPage - remove member |
| `removeUserGroupMembers()` | AccessGroupsPage - bulk remove |
| `fetchPolicyById()` | AccessPoliciesPage - detail |
| `createPolicy()` | AccessPoliciesPage - create |
| `updatePolicy()` | AccessPoliciesPage - edit |
| `deletePolicy()` | AccessPoliciesPage - delete |
| `deletePolicies()` | AccessPoliciesPage - bulk delete |
| `assignPolicy()` | AccessPoliciesPage - assign |
| `revokePolicy()` | AccessPoliciesPage - revoke |
| `revokePolicies()` | AccessPoliciesPage - bulk revoke |
| `assignMultiplePolicies()` | AccessPoliciesPage - bulk assign |
| `removeMultiplePolicies()` | AccessPoliciesPage - bulk remove |
| `fetchDomainPolicies()` | AccessDomainsPage - policies |
| `verifyDomain()` | DomainsPage - verify |
| `getDomainSecret()` | DomainsPage - get secret |
| `fetchMergedDomains()` | DomainsPage - merges |
| `addDomainMerge()` | DomainsPage - merge |
| `removeDomainMerge()` | DomainsPage - unmerge |
| `bulkInviteUsers()` | RegistrationBulkPage |
| `resetUserPassword()` | UsersPage or SettingsPage |
| `fetchClientConfig()` | SettingsPage |
| `fetchAdmins()` | SettingsPage |
| `activateAdmin()` | UsersPage or SettingsPage |
| `deactivateAdmin()` | UsersPage or SettingsPage |

**Total**: 9 used / 43 unused = **~17% API utilization**

---

## What Needs To Be Done (Priority Order)

### Priority 1: Dashboard (High Impact, Visible)

| Task | Component | API to Wire |
|------|-----------|-------------|
| Real user counts | `stat-cards.tsx` | `fetchUsers()` for total/active/inactive counts |
| Real team/group counts | `stat-cards.tsx` | `fetchTeams()` + `fetchGroups()` for counts |
| Real domain count | `stat-cards.tsx` | `fetchDomains()` for count |
| Real growth chart | `user-growth-chart.tsx` | Need a stats/analytics endpoint (may not exist) |
| Real status breakdown | `user-status-breakdown.tsx` | Derive from `fetchUsers()` response |
| Real recent registrations | `recent-registrations.tsx` | `fetchRegistrationRequests()` |
| Real domain list | `domain-overview.tsx` | `fetchDomains()` |
| Real access counts | `access-summary.tsx` | `fetchUserGroups()` + `fetchPolicies()` |
| Real payments info | `payments-overview.tsx` | No backend API exists yet |
| Real activity log | `recent-activities.tsx` | Need audit log endpoint (exists in old SPA: `POST /admin/audit/logs`) |

### Priority 2: CRUD Operations (Core Functionality)

| Task | Page | APIs to Wire |
|------|------|-------------|
| Delete/Deactivate/Activate users | UsersPage | `deleteUsers()`, `deactivateUsers()`, `activateUser()` |
| Export users CSV | UsersPage | `exportUsers()` |
| Team member management | TeamsPage | `fetchTeamParticipants()`, `addTeamMembers()`, `removeTeamMember()` |
| Team admin management | TeamsPage | `assignTeamAdmin()`, `removeTeamAdmin()` |
| Create/Edit/Delete user groups | AccessGroupsPage | `createUserGroup()`, `updateUserGroup()`, `deleteUserGroup()` |
| User group member management | AccessGroupsPage | `addUserGroupMembers()`, `removeUserGroupMember()` |
| Create/Edit/Delete policies | AccessPoliciesPage | `createPolicy()`, `updatePolicy()`, `deletePolicy()` |
| Assign/Revoke policies | AccessPoliciesPage | `assignPolicy()`, `revokePolicy()` |
| Domain verify + secret | DomainsPage | `verifyDomain()`, `getDomainSecret()` |
| Domain merge/unmerge | DomainsPage | `addDomainMerge()`, `removeDomainMerge()` |

### Priority 3: Form Submissions (Registration)

| Task | Page | APIs to Wire |
|------|------|-------------|
| Submit add user form | RegistrationAddPage | `manualInviteUsers()` |
| Fetch real departments | RegistrationAddPage | `fetchDepartments()` |
| Fetch real designations | RegistrationAddPage | `fetchTitles()` |
| Wire CSV upload | RegistrationBulkPage | `bulkInviteUsers()` |
| Real upload history | RegistrationBulkPage | Need endpoint or derive from `fetchRegistrationRequests()` |

### Priority 4: Settings (Persistence)

| Task | Page | APIs to Wire |
|------|------|-------------|
| Save org settings | SettingsPage | `fetchClientConfig()` + need a save endpoint |
| Password reset | SettingsPage | `resetUserPassword()` |
| Real session list | SettingsPage | Need endpoint |
| Admin management | SettingsPage | `fetchAdmins()`, `activateAdmin()`, `deactivateAdmin()` |

### Priority 5: Missing Features

| Task | Details |
|------|---------|
| Audit Logs page | Exists in old SPA (`POST /admin/audit/logs`), no page in React app. Need to create `AuditLogsPage.tsx` and add route |
| Payments integration | No backend API exists. Either build backend or keep as placeholder |
| Server-side pagination | Currently fetching 200 rows and filtering client-side. Should use `page` + `pagesize` params |
| Domain selector modal | After login, should auto-fetch domains and show picker (like the source project does) |
| Logout cleanup | Ensure all localStorage keys are cleared on logout |

---

## File-Level Status At a Glance

```
src/
  api/
    auth.ts                     DONE     (ECDH + AES + login + refresh)
    http.ts                     DONE     (fetch wrapper + auth headers)
    admin.ts                    DONE     (60+ endpoints defined, 17% used)
  context/
    auth-context.tsx            DONE     (useAuth hook, login/logout/domains)
  types/
    index.ts                    DONE     (TypeScript interfaces)
  hooks/
    use-theme.tsx               DONE     (dark/light mode - unrelated to API)
    use-mobile.ts               DONE     (responsive breakpoint)
  pages/
    LoginPage.tsx               DONE     (real login)
    UsersPage.tsx               DONE     (real data, partial CRUD)
    TeamsPage.tsx               DONE     (real list, no CRUD)
    GroupsPage.tsx              DONE     (real list, no CRUD)
    AccessGroupsPage.tsx        DONE     (real list, no CRUD)
    AccessPoliciesPage.tsx      DONE     (real list, no CRUD)
    AccessDomainsPage.tsx       DONE     (real list, no CRUD)
    DomainsPage.tsx             DONE     (real list, no CRUD)
    RegistrationListPage.tsx    DONE     (real list)
    RegistrationAddPage.tsx     NOT DONE (no API, hardcoded dropdowns)
    RegistrationBulkPage.tsx    NOT DONE (no API, fake upload)
    DashboardPage.tsx           NOT DONE (all widgets hardcoded)
    PaymentsPage.tsx            NOT DONE (entirely hardcoded, no backend)
    SettingsPage.tsx            NOT DONE (fake save, partial auth data)
    ComponentsPage.tsx          N/A      (dev showcase)
  components/
    app-sidebar.tsx             DONE     (real user from useAuth)
    layout/site-header.tsx      DONE     (real user + domain from useAuth)
    dashboard/
      stat-cards.tsx            NOT DONE (hardcoded: 3842, 202, 23)
      user-growth-chart.tsx     NOT DONE (hardcoded 7-month data)
      user-status-breakdown.tsx NOT DONE (hardcoded: 2651, 854, 337)
      recent-registrations.tsx  NOT DONE (4 fake users)
      recent-activities.tsx     NOT DONE (4 fake activities)
      domain-overview.tsx       NOT DONE (4 fake domains)
      access-summary.tsx        NOT DONE (hardcoded: 24, 18, 42)
      payments-overview.tsx     NOT DONE (hardcoded: $99/mo, 156/500)
    users/
      users-data.ts             DONE     (type definitions used by UsersPage)
      users-data-table.tsx      DONE     (table component)
      users-toolbar.tsx         DONE     (search + filters)
      users-stat-cards.tsx      DONE     (computed from data)
      add-user-dialog.tsx       DONE     (form UI)
      edit-user-dialog.tsx      DONE     (form UI)
      view-user-dialog.tsx      DONE     (read-only view)
      user-confirm-dialogs.tsx  DONE     (confirmation modals)
    ui/                         N/A      (30 shadcn components - never modify)
  .env                          DONE     (VITE_MELP_API_BASE=/MelpService/)
  vite.config.ts                DONE     (proxy to backend)
  package.json                  DONE     (elliptic + js-sha256 added)
```
