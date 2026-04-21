import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { clearAuth, loadStoredAuth, login as loginApi } from '@/api/auth'
import type { AuthState, Domain } from '@/types'

interface AuthContextValue {
  authState: AuthState | null
  isAuthenticated: boolean
  login: (credentials: { email: string; password: string }) => Promise<AuthState>
  logout: () => void
  selectedClient: string
  setSelectedClient: (id: string, name?: string) => void
  selectedClientName: string
  domains: Domain[]
  setDomains: React.Dispatch<React.SetStateAction<Domain[]>>
  /** 'SUPER' if current user is a super-admin for the selected domain, 'ADMIN' otherwise */
  currentAdminType: string | undefined
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState | null>(() => loadStoredAuth())
  const authRef = useRef(authState)
  authRef.current = authState
  const isAuthenticated = Boolean(authState?.sessionid)
  const storedClientId = localStorage.getItem('melp_admin_clientid') || ''
  const storedClientName = localStorage.getItem('melp_admin_clientname') || ''

  const [selectedClient, setSelectedClientState] = useState(authState?.clientid || storedClientId)
  const [selectedClientName, setSelectedClientNameState] = useState(authState?.clientname || storedClientName)
  const [domains, setDomains] = useState<Domain[]>([])

  const currentAdminType = useMemo(() => {
    const domain = domains.find(
      (d) => String(d.clientid || d.client_id || '') === selectedClient,
    )
    const raw = domain?.adminType
    return typeof raw === 'string' ? raw : undefined
  }, [domains, selectedClient])

  const persistAuth = (nextState: AuthState | null) => {
    setAuthState(nextState)
    if (nextState) localStorage.setItem('melp_admin_auth', JSON.stringify(nextState))
  }

  const login = async (credentials: { email: string; password: string }): Promise<AuthState> => {
    const result = await loginApi(credentials)
    persistAuth(result)
    return result
  }

  const logout = () => {
    clearAuth()
    setAuthState(null)
    setSelectedClientState('')
    setSelectedClientNameState('')
    setDomains([])
  }

  const setSelectedClient = useCallback((id: string, name = '') => {
    const finalName = name || id || ''
    setSelectedClientState(id)
    setSelectedClientNameState(finalName)
    localStorage.setItem('melp_admin_clientid', id || '')
    localStorage.setItem('melp_admin_clientname', finalName)
    // Persist clientid to auth storage for future sessions without triggering
    // a full authState re-render (which would interrupt Dialog cleanup and
    // cascade re-renders across the entire tree).
    const cur = authRef.current
    if (cur) {
      const next = { ...cur, clientid: id, clientname: finalName }
      authRef.current = next
      localStorage.setItem('melp_admin_auth', JSON.stringify(next))
    }
  }, [])

  const value = useMemo(
    (): AuthContextValue => ({
      authState,
      isAuthenticated,
      login,
      logout,
      selectedClient,
      setSelectedClient,
      selectedClientName,
      domains,
      setDomains,
      currentAdminType,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authState, isAuthenticated, selectedClient, selectedClientName, domains, setSelectedClient, currentAdminType],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
