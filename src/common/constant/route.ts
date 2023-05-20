export const route = {
  ROOT: '/',
  AUTH_GOOGLE: '/auth/callback/google',
  SECONDARY_LOGIN: '/qbo-planning-center-login',
  SIGNUP: '/signup',
  SUBSCRIPTION: '/subscription',
  TRANSACTION: '/transaction',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  NOMINATE_PASSWORD: '/nominate-password',
}

export const mainRoute = {
  TRANSACTION: '/transaction',
  TRANSACTION_VIEWPAGE: '/transaction/view-page/:batchId',
  TRANSACTION_STRIPE_VIEWPAGE: '/transaction/view-page-stripe/:payoutDate',
  SETTINGS: '/settings',
  PCO_QBO_STRIPE: '/pco-qbo-stripe',
  PCO_QBO_STRIPE_SYNC: '/sync-pco-qbo-stripe',
}
