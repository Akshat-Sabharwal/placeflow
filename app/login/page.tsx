'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AppRole } from '@/lib/contracts/domain'
import { Brand } from '@/components/brand'
import styles from './login.module.css'

type Provider = 'google' | 'github'

export default function LoginPage() {
  const [role, setRole] = useState<AppRole>('student')
  const [pending, setPending] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(provider: Provider) {
    setPending(provider)
    setError(null)
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      },
    })
    if (authError) {
      setError(`Google and GitHub sign-in are available. ${authError.message}`)
      setPending(null)
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="login-heading">
        <div className={styles.brand}><Brand /></div>
        <p className={styles.eyebrow}>Campus placement, without the chaos.</p>
        <h1 id="login-heading">Welcome back.</h1>
        <p className={styles.copy}>Choose the workspace you are joining, then continue with an existing account.</p>
        <div className={styles.roleTabs} role="tablist" aria-label="PlaceFlow workspace">
          {(['student', 'coordinator'] as const).map((item) => (
            <button
              id={`${item}-tab`}
              key={item}
              type="button"
              role="tab"
              aria-controls="role-panel"
              aria-selected={role === item}
              tabIndex={role === item ? 0 : -1}
              onClick={() => setRole(item)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                event.preventDefault()
                const nextRole = item === 'student' ? 'coordinator' : 'student'
                setRole(nextRole)
                document.getElementById(`${nextRole}-tab`)?.focus()
              }}
            >
              {item === 'student' ? 'Student' : 'Coordinator'}
            </button>
          ))}
        </div>
        <div
          id="role-panel"
          className={styles.rolePanel}
          role="tabpanel"
          aria-labelledby={`${role}-tab`}
        >
          <p>
            {role === 'student'
              ? 'Discover drives, verify eligibility, and track applications.'
              : 'Publish drives, review applicants, and manage outcomes.'}
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={() => signIn('google')} disabled={pending !== null}>
              {pending === 'google' ? 'Connecting…' : `Continue as ${role} with Google`}
            </button>
            <button type="button" onClick={() => signIn('github')} disabled={pending !== null}>
              {pending === 'github' ? 'Connecting…' : `Continue as ${role} with GitHub`}
            </button>
          </div>
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <p className={styles.note}>Your first successful choice is sealed to your account. Returning accounts keep their existing role. No password is stored by PlaceFlow.</p>
      </section>
    </main>
  )
}
