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

export const signUpInitialValues: UserSignUpProps = {
  churchName: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
}

export const signUpValidationSchema = object({
  email: yup.string().required('Email is a required field').email(),
  churchName: yup.string().required('Church Name is a required field'),
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
