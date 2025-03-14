export const route = {
  ROOT: '/',
  AUTH_GOOGLE: '/auth/callback/google',
  SECONDARY_LOGIN: '/qbo-planning-center-login',
  SIGNUP: '/signup',
  SIGNUP_GOOGLE: '/signup-google',
  SUBSCRIPTION: '/subscription',
  TRANSACTION: '/transaction',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  NOMINATE_PASSWORD: '/nominate-password',
  INVITE_LINK: 'invite-bookkeeper',
  SUBSCRIPTION_PLAN: 'subscription/plan',
}

export const mainRoute = {
  TRANSACTION: '/transaction',
  HOME: '/home',
  DASHBOARD: '/dashboard',
  TRANSACTION_VIEWPAGE: '/transaction/view-page/:batchId',
  TRANSACTION_STRIPE_VIEWPAGE: '/transaction/view-page-stripe/:payoutDate',
  SETTINGS: '/settings',
  PCO_QBO_STRIPE: '/pco-qbo-stripe',
  PCO_QBO_STRIPE_SYNC: '/sync-pco-qbo-stripe',
  ASK_US: '/ask-us',
  QUICK_START_QUIDE: '/quick-start-guide',
  AUTOMATION: '/automation',
  AUTOMATION_MAPPING: '/automation/mapping',
  AUTOMATION_ARCHIVE: '/automation/archive',
}

export const routeSettings = {
  ACCOUNT_DATA: '/settings/account-data',
  BILLING_INFO: '/settings/billing-info',
  INTEGRATIONS: '/settings/integrations',
  BOOKKEEPER: '/settings/bookkeeper',
  PROJECTS: '/settings/projects',
  SELECT_RECIPIENT_EMAILS: '/settings/select-recipient-emais',
}
