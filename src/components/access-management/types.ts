export type AccessEntityType = "User" | "User Group" | "Domain"

export type AccessFeature = {
  id: string
  backendFeatureId?: string
  name: string
  description: string
  limit: "Allow" | "Deny" | "Conditional"
  enabled: boolean
}

export type AccessModule = {
  id: string
  backendName?: string
  name: string
  description: string
  scope: "Workspace" | "People" | "Security" | "Records"
  features: AccessFeature[]
}

export type PolicyEntity = {
  id: string
  activeId?: string
  entityId?: string
  name: string
  type: AccessEntityType
  secondary: string
  attachedAt: string
}

export type AccessPolicy = {
  id: string
  backendPolicyId?: string
  name: string
  description: string
  createdAt: string
  risk: "Core" | "Sensitive" | "Operational"
  modules: AccessModule[]
  entities: PolicyEntity[]
  moduleCount?: number
  entityCount?: number
  contextLabel?: string
}

export type AccessUser = {
  id: string
  userId?: string
  melpid?: string
  name: string
  email: string
  title: string
  team: string
  status: string
}

export type AccessGroup = {
  id: string
  name: string
  description: string
  createdAt: string
  owners: string[]
  users: AccessUser[]
  permissions: AccessPolicy[]
  memberCount?: number
  policyAssigned?: boolean
}

export type AccessDomainContext = {
  id: string
  name: string
  host: string
  environment: "Production" | "Staging"
  lastUpdated: string
  attachedPolicies: AccessPolicy[]
}
