// --- Auth ---
export interface AuthUser {
  email: string
  fullName: string
  melpid: string
}

export interface AuthState {
  deviceid: string
  sessionid: string
  keyHex: string
  jwt: string
  user: AuthUser
  encryptedMelpid: string
  clientid?: string
  clientname?: string
  JWT_TOKEN?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  status: 'SUCCESS' | 'FAILURE'
  message?: string
  email: string
  fullname: string
  melpid: string
  JWT_TOKEN: string
  new_session?: string
  usertype: 'Business' | 'Individual'
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
export interface Domain {
  clientid: string
  client_name: string
  domain: string
  /** 'SUPER' = super-admin, 'ADMIN' = regular admin. Returned by /AdminPanel/domains */
  adminType?: string
  [key: string]: unknown
}

// --- User ---
export interface AdminUser {
  melpid: string
  email: string
  fullname: string
  department?: string
  profession?: string
  status: 'active' | 'inactive' | 'deleted'
  adminstatus?: string
  profileImage?: string
  createdAt?: string
  [key: string]: unknown
}

// --- Team/Group ---
export interface TeamGroup {
  groupid: string
  groupname: string
  clientid: string
  participantCount: number
  groupType: 0 | 1 // 0 = team, 1 = group
  archived?: boolean
  createdAt?: string
  [key: string]: unknown
}

export interface Participant {
  melpid: string
  email: string
  fullname: string
  isAdmin?: boolean
  [key: string]: unknown
}

// --- User Group (Access Control) ---
export interface UserGroup {
  groupid: string
  groupname: string
  memberCount: number
  clientid: string
  [key: string]: unknown
}

// --- Policy ---
export interface Policy {
  policyid: string
  policyname: string
  features: string[]
  assignedCount: number
  clientid: string
  [key: string]: unknown
}

// --- Pagination ---
export interface PaginatedResponse<T> {
  list: T[]
  pageCount?: number
  pageSize?: number
  totalCount?: number
}

// --- Registration ---
export interface InviteUser {
  email: string
  name: string
  [key: string]: unknown
}

export interface RegistrationRequest {
  email: string
  name: string
  status: number
  createdAt: string
  [key: string]: unknown
}

// --- Normalized List ---
export interface NormalizedList<T = unknown> {
  list: T[]
  pageCount?: number
  pageSize?: number
  totalCount?: number
}
