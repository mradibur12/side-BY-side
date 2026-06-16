import { Suspense } from 'react'
import SignupForm from './SignupForm'

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{color:'var(--ink2)',fontSize:'0.875rem'}}>Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
