export default function AuthCodeErrorPage() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
      <section aria-labelledby="auth-error-title">
        <p>PlaceFlow</p>
        <h1 id="auth-error-title">We couldn&apos;t complete sign-in.</h1>
        <p>No account data was changed. Return to the login page and try Google or GitHub again.</p>
        <a href="/login">Try again</a>
      </section>
    </main>
  )
}
