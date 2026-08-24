"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="system-page">
      <p className="system-kicker">Something interrupted the flow</p>
      <h1>We could not finish loading this page.</h1>
      <p>Your saved placement data has not been changed. Try the request again.</p>
      <div className="system-actions">
        <button className="system-action" type="button" onClick={reset}>
          Try again
        </button>
        <Link className="system-action system-action-secondary" href="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
