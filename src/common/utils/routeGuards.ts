import { doesSessionExist } from 'supertokens-web-js/recipe/session'

import { storage, storageKey } from './storage'
import checkToken from './tokenVerification'
import { route } from '../constant/route'

const qboToken = storage.getToken(storageKey.QBQ_ACCESS_TOKEN)
const pcToken = storage.getToken(storageKey.PC_ACCESS_TOKEN)

const unAuthGuard = {
  failCondition: !!checkToken(qboToken) && !!checkToken(pcToken),
  requestDone: true,
  onFail: route.TRANSACTION,
}

const authGuard = {
  failCondition: !checkToken(qboToken) && !checkToken(pcToken),
  requestDone: true,
  onFail: route.ROOT,
}

export { authGuard, unAuthGuard }
