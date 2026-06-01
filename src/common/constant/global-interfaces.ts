// InviteInterfaces.ts

export interface Token {
  id: number
  userId: number
  tokenEntityId: number
  token_type: 'stripe' | 'qbo' | 'pco'
  access_token: string
  refresh_token: string
  realm_id: string
  organization_name: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientBookkeeper {
  id: number
  email: string
  firstName: string
  lastName: string
  churchName: string
  isSubscribe: string
  role: string
  token: string | null
  img_url: string | null
  createdAt: string
  updatedAt: string
  isActive: 'Active' | 'Inactive'
  tokens: Token[]
}

export interface UserBookkeeper {
  id: number
  email: string
  firstName: string
  lastName: string
  churchName: string
  isSubscribe: string
  role: string
  token: string | null
  img_url: string | null
  createdAt: string
  updatedAt: string
  isActive: 'Active' | 'Inactive'
}

export interface BookkeeperInvite {
  id: number
  clientId: number
  userId: number
  email: string
  invitationToken: string
  inviteSent: boolean
  inviteAccepted: boolean
  bookkeeperIntegrationAccessEnabled: boolean
  createdAt: string
  updatedAt: string
  Client: ClientBookkeeper
  User: UserBookkeeper
}
