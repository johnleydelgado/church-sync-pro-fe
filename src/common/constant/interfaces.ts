import { BankAccountProps } from '@/redux/common'

// Base interfaces for common structures
interface Account {
  value: string // Account value is a string
  label: string // Account label is a string
}

interface Class {
  value: string // Class value is a string
  label: string // Class label is a string
}

interface Customer {
  value: string // Customer value is a string
  label: string // Customer label is a string
}

// Interfaces for nested structures
interface Fund {
  fundName: string // Fund name is a string
  account: Account // Fund has an associated account
  isActive: boolean // Boolean for activity status
}

interface Registration {
  registration: string // Registration name
  account: Account // Associated account
  class: Class // Associated class
  customer: Customer // Associated customer
  isActive: boolean // Boolean for activity status
}

interface BankCharges {
  account: Account // Associated account
  class: Class // Associated class
}

interface UserSetting {
  id: number // User setting ID
  settingsData: Fund[] // Array of funds
  settingRegistrationData: Registration[] // Array of registrations
  settingBankData: BankAccountProps[] | null // Array of bank data
  settingBankCharges: BankCharges // Bank charges structure
  isAutomationEnable?: boolean // Boolean for automation enablement
  isAutomationRegistration?: boolean // Boolean for automation registration
  userId: number // User ID
  startDateAutomationFund: string | null // Nullable date
  startDateAutomationRegistration: string | null // Nullable date
  createdAt: string // Created at timestamp
  updatedAt: string // Updated at timestamp
}

// Main interface representing the entire structure
export interface UserSettingsProps {
  id: number // User ID
  email: string // User email
  firstName: string // User's first name
  lastName: string // User's last name
  churchName: string // Church name
  isSubscribe: string // Subscription status
  role: string // User's role
  token: string | null // Nullable token
  img_url: string // Image URL
  createdAt: string // Created at timestamp
  updatedAt: string // Updated at timestamp
  UserBookkeepers: any[] // Any type for an empty array
  UserSetting: UserSetting // Associated user setting
}

// Interface for the 'attributes' object
interface FundAttributes {
  color: string
  created_at: string
  default: boolean
  deletable: boolean
  description: string
  ledger_code: string | null
  name: string
  updated_at: string
  visibility: string
}

// Interface for the 'links' object
interface Links {
  self: string
}

// Main interface for the JSON object
export interface FundAttProps {
  type: string
  id: string
  attributes: FundAttributes
  links: Links
  isClick: boolean
  project: string
  description: string
}
