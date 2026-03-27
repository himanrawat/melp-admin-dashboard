// ── User Types ─────────────────────────────────────────────
export type UserStatus = "active" | "inactive" | "deleted"

export type User = {
  id: string
  name: string
  email: string
  avatar?: string
  department: string
  designation: string
  location: string
  deactivateDate?: string
  status: UserStatus
  joinedAt: string
  verified?: boolean
}

// ── Mock Data (4 initial rows) ─────────────────────────────
export const mockUsers: User[] = [
  { id: "1", name: "Aarav Sharma",  email: "aarav.sharma@melp.com",  department: "Engineering",     designation: "Senior Engineer",     location: "Bangalore",  status: "active",   joinedAt: "2025-01-15" },
  { id: "2", name: "Priya Patel",   email: "priya.patel@melp.com",   department: "Marketing",       designation: "Marketing Manager",   location: "Mumbai",     status: "active",   joinedAt: "2025-02-20" },
  { id: "3", name: "Rahul Verma",   email: "rahul.verma@melp.com",   department: "Sales",           designation: "Sales Executive",     location: "Delhi",      status: "inactive", joinedAt: "2024-11-08", deactivateDate: "2025-06-01" },
  { id: "4", name: "Sneha Reddy",   email: "sneha.reddy@melp.com",   department: "Human Resources", designation: "HR Business Partner", location: "Hyderabad",  status: "active",   joinedAt: "2025-03-01" },
]

export const DEPARTMENTS = [
  "Design",
  "Engineering",
  "Finance",
  "Human Resources",
  "Marketing",
  "Operations",
  "Sales",
]

export const LOCATIONS = [
  "Bangalore",
  "Chennai",
  "Delhi",
  "Hyderabad",
  "Kolkata",
  "Mumbai",
  "Pune",
]

export const DESIGNATIONS = [
  "Account Manager",
  "Backend Developer",
  "Content Strategist",
  "DevOps Engineer",
  "Financial Analyst",
  "Finance Manager",
  "Full Stack Developer",
  "HR Business Partner",
  "Marketing Manager",
  "Operations Lead",
  "Product Designer",
  "Sales Executive",
  "Senior Engineer",
  "Talent Acquisition Lead",
  "UI/UX Designer",
]
