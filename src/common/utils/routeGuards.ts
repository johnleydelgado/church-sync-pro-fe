import { doesSessionExist } from 'supertokens-web-js/recipe/session'

import { storage, storageKey } from './storage'
import checkToken from './tokenVerification'
import { mainRoute, route } from '../constant/route'

const qboToken = storage.getToken(storageKey.QBQ_ACCESS_TOKEN)
const pcToken = storage.getToken(storageKey.PC_ACCESS_TOKEN)
const personalToken = storage.getToken(storageKey.PERSONAL_TOKEN)
const tokens = storage.getToken(storageKey.TOKENS)
const settings = storage.getToken(storageKey.SETTINGS)

const unAuthGuard = {
  failCondition: !!personalToken,
  requestDone: true,
  onFail: route.TRANSACTION,
}

const authGuard = {
  failCondition: !personalToken,
  requestDone: true,
  onFail: route.ROOT,
}

const authGuardHaveToken = {
  failCondition: !tokens,
  requestDone: true,
  onFail: personalToken === 'client' ? mainRoute.SETTINGS : mainRoute.DASHBOARD,
}

const authGuardHaveSettings = {
  failCondition: !settings,
  requestDone: true,
  onFail: personalToken === 'client' ? mainRoute.SETTINGS : mainRoute.DASHBOARD,
}

const authProceedToTransaction = {
  failCondition: !!settings,
  requestDone: true,
  onFail: mainRoute.TRANSACTION,
}

export {
  authGuard,
  unAuthGuard,
  authGuardHaveToken,
  authGuardHaveSettings,
  authProceedToTransaction,
}
