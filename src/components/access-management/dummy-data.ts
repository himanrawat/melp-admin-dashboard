export type AccessEntityType = "User" | "User Group" | "Domain"

export type AccessFeature = {
  id: string
  name: string
  description: string
  limit: "Allow" | "Deny" | "Conditional"
  enabled: boolean
}

export type AccessModule = {
  id: string
  name: string
  description: string
  scope: "Workspace" | "People" | "Security" | "Records"
  features: AccessFeature[]
}

export type PolicyEntity = {
  id: string
  name: string
  type: AccessEntityType
  secondary: string
  attachedAt: string
}

export type AccessPolicy = {
  id: string
  name: string
  description: string
  createdAt: string
  risk: "Core" | "Sensitive" | "Operational"
  modules: AccessModule[]
  entities: PolicyEntity[]
}

export type AccessUser = {
  id: string
  name: string
  email: string
  title: string
  team: string
  status: "Active" | "Pending"
}

export type AccessGroup = {
  id: string
  name: string
  description: string
  createdAt: string
  owners: string[]
  users: AccessUser[]
  permissions: AccessPolicy[]
}

export type AccessDomainContext = {
  id: string
  name: string
  host: string
  environment: "Production" | "Staging"
  lastUpdated: string
  attachedPolicies: AccessPolicy[]
}

const moduleLibrary: AccessModule[] = [
  {
    id: "workspace-ops",
    name: "Workspace Operations",
    description: "Controls workspace configuration, lifecycle, and audit visibility.",
    scope: "Workspace",
    features: [
      {
        id: "workspace-update-brand",
        name: "Update Brand Settings",
        description: "Change logos, themes, and public brand elements.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "workspace-manage-roles",
        name: "Manage Workspace Roles",
        description: "Grant or revoke elevated roles across the workspace.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "workspace-archive",
        name: "Archive Workspace",
        description: "Temporarily archive the workspace for maintenance.",
        limit: "Conditional",
        enabled: true,
      },
    ],
  },
  {
    id: "people-admin",
    name: "People Administration",
    description: "Access to user, team, and group operations.",
    scope: "People",
    features: [
      {
        id: "people-create-user",
        name: "Create Users",
        description: "Invite and provision new users into the workspace.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "people-bulk-onboard",
        name: "Bulk Onboarding",
        description: "Run batch uploads and review onboarding status.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "people-suspend-user",
        name: "Suspend Accounts",
        description: "Deactivate or pause access for selected users.",
        limit: "Allow",
        enabled: true,
      },
    ],
  },
  {
    id: "records-control",
    name: "Record Controls",
    description: "Defines access to operational and regulated records.",
    scope: "Records",
    features: [
      {
        id: "records-view-sensitive",
        name: "View Sensitive Records",
        description: "Open protected records containing customer or financial data.",
        limit: "Conditional",
        enabled: true,
      },
      {
        id: "records-export",
        name: "Export Records",
        description: "Download record sets for audit or legal follow-up.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "records-delete",
        name: "Delete Records",
        description: "Permanently remove records from operational storage.",
        limit: "Deny",
        enabled: false,
      },
    ],
  },
  {
    id: "security-center",
    name: "Security Center",
    description: "Security operations, response controls, and visibility.",
    scope: "Security",
    features: [
      {
        id: "security-audit-view",
        name: "View Audit Logs",
        description: "Inspect security and operational audit trails.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "security-session-revoke",
        name: "Revoke Sessions",
        description: "Force sign-out on active user sessions.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "security-ip-policies",
        name: "Manage IP Policies",
        description: "Control IP allow lists and step-up verification rules.",
        limit: "Conditional",
        enabled: true,
      },
    ],
  },
  {
    id: "domain-governance",
    name: "Domain Governance",
    description: "Policies for domain-scoped access and approvals.",
    scope: "Workspace",
    features: [
      {
        id: "domain-attach-policy",
        name: "Attach Policies to Domains",
        description: "Bind access policies to selected domains.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "domain-detach-policy",
        name: "Detach Policies from Domains",
        description: "Remove policy coverage from existing domains.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "domain-change-env",
        name: "Change Environment Guards",
        description: "Switch domain-level approval modes by environment.",
        limit: "Conditional",
        enabled: true,
      },
    ],
  },
  {
    id: "support-ops",
    name: "Support Operations",
    description: "Runbooks for support teams and incident follow-ups.",
    scope: "People",
    features: [
      {
        id: "support-view-cases",
        name: "View Escalation Cases",
        description: "Inspect escalated support cases and operator notes.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "support-assign-owner",
        name: "Assign Case Owners",
        description: "Move ownership across support responders.",
        limit: "Allow",
        enabled: true,
      },
      {
        id: "support-refund",
        name: "Approve Refunds",
        description: "Approve customer remediation actions for incidents.",
        limit: "Conditional",
        enabled: true,
      },
    ],
  },
]

const users: AccessUser[] = [
  {
    id: "u-01",
    name: "Mila Sanchez",
    email: "mila@northstar.app",
    title: "Operations Director",
    team: "Operations",
    status: "Active",
  },
  {
    id: "u-02",
    name: "Derek Wu",
    email: "derek@northstar.app",
    title: "Compliance Lead",
    team: "Compliance",
    status: "Active",
  },
  {
    id: "u-03",
    name: "Imani Brooks",
    email: "imani@northstar.app",
    title: "Support Manager",
    team: "Support",
    status: "Active",
  },
  {
    id: "u-04",
    name: "Ava Thomas",
    email: "ava@northstar.app",
    title: "Security Analyst",
    team: "Security",
    status: "Active",
  },
  {
    id: "u-05",
    name: "Luca Martin",
    email: "luca@northstar.app",
    title: "Growth Ops",
    team: "Growth",
    status: "Pending",
  },
  {
    id: "u-06",
    name: "Priya Mehta",
    email: "priya@northstar.app",
    title: "Platform Admin",
    team: "Infrastructure",
    status: "Active",
  },
]

const policyEntities: Record<string, PolicyEntity[]> = {
  "policy-ops-core": [
    {
      id: "entity-u-01",
      name: "Mila Sanchez",
      type: "User",
      secondary: "Operations Director",
      attachedAt: "Mar 14, 2026",
    },
    {
      id: "entity-g-01",
      name: "Operations Control Room",
      type: "User Group",
      secondary: "12 members",
      attachedAt: "Mar 10, 2026",
    },
    {
      id: "entity-d-01",
      name: "Northstar HQ",
      type: "Domain",
      secondary: "admin.northstar.app",
      attachedAt: "Mar 08, 2026",
    },
  ],
  "policy-compliance-review": [
    {
      id: "entity-u-02",
      name: "Derek Wu",
      type: "User",
      secondary: "Compliance Lead",
      attachedAt: "Mar 11, 2026",
    },
    {
      id: "entity-g-02",
      name: "Audit Review Board",
      type: "User Group",
      secondary: "7 members",
      attachedAt: "Mar 09, 2026",
    },
  ],
  "policy-domain-approval": [
    {
      id: "entity-d-02",
      name: "Northstar Staging",
      type: "Domain",
      secondary: "staging.northstar.app",
      attachedAt: "Mar 07, 2026",
    },
    {
      id: "entity-g-03",
      name: "Domain Approvers",
      type: "User Group",
      secondary: "5 members",
      attachedAt: "Mar 06, 2026",
    },
  ],
  "policy-support-escalation": [
    {
      id: "entity-u-03",
      name: "Imani Brooks",
      type: "User",
      secondary: "Support Manager",
      attachedAt: "Mar 04, 2026",
    },
    {
      id: "entity-g-04",
      name: "Escalation Desk",
      type: "User Group",
      secondary: "9 members",
      attachedAt: "Mar 03, 2026",
    },
  ],
  "policy-security-response": [
    {
      id: "entity-u-04",
      name: "Ava Thomas",
      type: "User",
      secondary: "Security Analyst",
      attachedAt: "Mar 12, 2026",
    },
    {
      id: "entity-d-03",
      name: "Northstar HQ",
      type: "Domain",
      secondary: "admin.northstar.app",
      attachedAt: "Mar 02, 2026",
    },
  ],
}

const policies: AccessPolicy[] = [
  {
    id: "policy-ops-core",
    name: "Operations Core Access",
    description: "Primary operating policy for team leads managing users, domains, and access events.",
    createdAt: "Mar 02, 2026",
    risk: "Core",
    modules: [moduleLibrary[0], moduleLibrary[1], moduleLibrary[3]],
    entities: policyEntities["policy-ops-core"],
  },
  {
    id: "policy-compliance-review",
    name: "Compliance Review Guardrails",
    description: "Restricts sensitive record exports while preserving review workflows for compliance owners.",
    createdAt: "Feb 27, 2026",
    risk: "Sensitive",
    modules: [moduleLibrary[2], moduleLibrary[3]],
    entities: policyEntities["policy-compliance-review"],
  },
  {
    id: "policy-domain-approval",
    name: "Domain Approval Matrix",
    description: "Defines who can attach, detach, and review policy coverage at the domain level.",
    createdAt: "Feb 20, 2026",
    risk: "Operational",
    modules: [moduleLibrary[4], moduleLibrary[0]],
    entities: policyEntities["policy-domain-approval"],
  },
  {
    id: "policy-support-escalation",
    name: "Support Escalation Controls",
    description: "Keeps case assignment, refund approval, and escalation views tightly scoped for support leads.",
    createdAt: "Feb 16, 2026",
    risk: "Operational",
    modules: [moduleLibrary[5], moduleLibrary[2]],
    entities: policyEntities["policy-support-escalation"],
  },
  {
    id: "policy-security-response",
    name: "Security Response Actions",
    description: "High-trust response policy for audit visibility, session revocation, and incident actions.",
    createdAt: "Feb 12, 2026",
    risk: "Sensitive",
    modules: [moduleLibrary[3], moduleLibrary[0]],
    entities: policyEntities["policy-security-response"],
  },
]

const accessGroups: AccessGroup[] = [
  {
    id: "group-ops",
    name: "Operations Control Room",
    description: "Cross-functional operators handling live access incidents and escalations.",
    createdAt: "Mar 01, 2026",
    owners: ["Mila Sanchez", "Priya Mehta"],
    users: [users[0], users[3], users[5]],
    permissions: [policies[0], policies[4]],
  },
  {
    id: "group-audit",
    name: "Audit Review Board",
    description: "Approvers for sensitive records, export reviews, and domain-level governance.",
    createdAt: "Feb 24, 2026",
    owners: ["Derek Wu"],
    users: [users[1], users[5]],
    permissions: [policies[1], policies[2]],
  },
  {
    id: "group-escalation",
    name: "Escalation Desk",
    description: "Frontline response group for support events requiring policy-backed approvals.",
    createdAt: "Feb 19, 2026",
    owners: ["Imani Brooks"],
    users: [users[2], users[4]],
    permissions: [policies[3]],
  },
]

const domainContext: AccessDomainContext = {
  id: "domain-northstar-hq",
  name: "Northstar HQ",
  host: "admin.northstar.app",
  environment: "Production",
  lastUpdated: "Mar 14, 2026",
  attachedPolicies: [policies[0], policies[1], policies[4]],
}

const domainCandidates: PolicyEntity[] = [
  {
    id: "candidate-domain-01",
    name: "Northstar HQ",
    type: "Domain",
    secondary: "admin.northstar.app",
    attachedAt: "Current",
  },
  {
    id: "candidate-domain-02",
    name: "Northstar Staging",
    type: "Domain",
    secondary: "staging.northstar.app",
    attachedAt: "Available",
  },
  {
    id: "candidate-domain-03",
    name: "Partner Console",
    type: "Domain",
    secondary: "partners.northstar.app",
    attachedAt: "Available",
  },
]

const groupCandidates: PolicyEntity[] = accessGroups.map((group) => ({
  id: `candidate-${group.id}`,
  name: group.name,
  type: "User Group",
  secondary: `${group.users.length} members`,
  attachedAt: "Available",
}))

const userCandidates: PolicyEntity[] = users.map((user) => ({
  id: `candidate-${user.id}`,
  name: user.name,
  type: "User",
  secondary: user.email,
  attachedAt: "Available",
}))

export const accessDummyData = {
  users,
  policies,
  accessGroups,
  domainContext,
  policyLibrary: policies,
  moduleLibrary,
  attachableEntities: {
    User: userCandidates,
    "User Group": groupCandidates,
    Domain: domainCandidates,
  } satisfies Record<AccessEntityType, PolicyEntity[]>,
}
