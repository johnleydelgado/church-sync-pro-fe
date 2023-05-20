const ns = `${process.env.REACT_APP_NAME_PROJECT}`

export interface setTokenProps {
  token: string
  key: string
  expiresIn: string | undefined | number
}
export const storageKey = {
  QBQ_ACCESS_TOKEN: `${ns}-qbo-access-token`,
  PC_ACCESS_TOKEN: `${ns}-pc-access-token`,
  PERSONAL_TOKEN: `${ns}-personal-token`,
  TOKENS: `${ns}-tokens`,
  SETTINGS: `${ns}-settings`,
}

export const storage = {
  setLocalToken: (token: string, key: string) =>
    localStorage.setItem(key, token),
  getToken: (key: any) => localStorage.getItem(key),
  removeToken: (key: string) => localStorage.removeItem(key),
}

// export const adminDecode = jwt.decode(storage.getToken(storageKey.ADMIN_TOKEN));
// export const userDecode = jwt.decode(storage.getToken(storageKey.TOKEN));
// export const hospitalAdminDecode = jwt.decode(
//   storage.getToken(storageKey.HOSPITAL_ADMIN_TOKEN)
// );
// export const employeeDecode = jwt.decode(
//   storage.getToken(storageKey.EMPLOYEE_TOKEN)
// );
