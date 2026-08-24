import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-page">
      <p className="system-kicker">404 · Off the flow</p>
      <h1>This page does not exist.</h1>
      <p>The link may be old, or the placement item may no longer be available.</p>
      <Link className="system-action" href="/">
        Return to PlaceFlow
      </Link>
    </main>
  );
}
