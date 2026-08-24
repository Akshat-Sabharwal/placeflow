export default function Loading() {
  return (
    <main className="system-page" aria-busy="true" aria-live="polite">
      <div className="system-loader" aria-hidden="true" />
      <p className="system-kicker">Loading PlaceFlow</p>
      <h1>Bringing the latest placement state into view.</h1>
    </main>
  );
}
