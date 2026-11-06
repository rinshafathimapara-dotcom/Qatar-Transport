"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Let’s try that again.</h1>
      <p>The application encountered an error.</p>
      <button onClick={reset}>Try again</button>
      <a href="/">Back home</a>
    </main>
  );
}
