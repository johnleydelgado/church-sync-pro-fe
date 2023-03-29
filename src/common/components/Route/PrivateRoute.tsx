import { Navigate } from 'react-router-dom'

export interface RouteGuard {
  failCondition: boolean
  requestDone: boolean
  onFail: string
}

interface PrivateRouteProps {
  Component: any
  guards: RouteGuard[]
  [key: string]: any
}

const PrivateRoute = ({ guards, Component, ...rest }: PrivateRouteProps) => {
  for (const guard of guards) {
    if (!guard.requestDone) {
      // if guard request isn't done then render nothing and wait for requestDone to change
      return null
    } else if (guard.failCondition) {
      // if guard request is done then check if failCondition matches
      // and if it does then either redirect to onFail or display nothing
      if (guard.onFail) {
        if (typeof guard.onFail === 'string') {
          return <Navigate to={guard.onFail} />
        } else {
          return null
        }
      } else {
        return null
      }
    }
  }

  return <Component />
}

export default PrivateRoute
