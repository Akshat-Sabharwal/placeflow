'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'

type Provider = 'google' | 'github'

export default function LoginPage() {
  const [pending, setPending] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(provider: Provider) {
    setPending(provider)
    setError(null)
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (authError) {
      setError(`Google and GitHub sign-in are available. ${authError.message}`)
      setPending(null)
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="login-heading">
        <Link href="/" className={styles.brand}>PlaceFlow</Link>
        <p className={styles.eyebrow}>Campus placement, without the chaos.</p>
        <h1 id="login-heading">Welcome back.</h1>
        <p className={styles.copy}>Use your existing account. Your placement role is assigned securely after sign-in.</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => signIn('google')} disabled={pending !== null}>
            {pending === 'google' ? 'Connecting…' : 'Continue with Google'}
          </button>
          <button type="button" onClick={() => signIn('github')} disabled={pending !== null}>
            {pending === 'github' ? 'Connecting…' : 'Continue with GitHub'}
          </button>
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <p className={styles.note}>No password is stored by PlaceFlow.</p>
      </section>
    </main>
  )
}
