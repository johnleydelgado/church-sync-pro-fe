import { object } from 'yup'
import * as yup from 'yup'

export interface UserSignInProps {
  email: string
  password: string
}

export interface UserSignUpProps {
  churchName: string
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface CustomerProps {
  firstName: string
  middleName: string
  lastName: string
  projectName: string
  projectDisplayName: string
  email: string
  phoneno: string
  mobileno: string
  other: string
  nameToPrintOnChecks: string
  parentRef: string
  billWithParent?: boolean
  webAdd?: string
  active?: boolean
  Id?: number
  syncToken?: string
}

export const signUpInitialValues: UserSignUpProps = {
  churchName: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
}

export const customerInitialValues: CustomerProps = {
  firstName: '',
  middleName: '',
  lastName: '',
  projectName: '',
  projectDisplayName: '',
  email: '',
  phoneno: '',
  mobileno: '',
  other: '',
  nameToPrintOnChecks: '',
  parentRef: '',
  billWithParent: false,
  webAdd: '',
  active: true,
}

export const signUpValidationSchema = object({
  email: yup.string().required('Email is a required field').email(),
  churchName: yup.string(),
  firstName: yup.string().required('First Name is a required field'),
  lastName: yup.string().required('Last Name is a required field'),
  password: yup.string().required('Password is a required field'),
})

export const signInInitialValues: UserSignInProps = {
  email: '',
  password: '',
}

export const signInValidationSchema = object({
  email: yup.string().required('Email is a required field !').email(),
  password: yup.string().required('Password is a required field !'),
})
