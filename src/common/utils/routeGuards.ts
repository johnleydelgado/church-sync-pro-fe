import { route } from "../constant/route";

const unAuthGuard = {
  failCondition: false,
  requestDone: true,
  onFail: route.ROOT,
};

const authGuard = {
  failCondition: true,
  requestDone: true,
  onFail: route.ROOT,
};

export { authGuard, unAuthGuard };
