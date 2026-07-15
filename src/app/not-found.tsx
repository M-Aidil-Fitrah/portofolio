import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
        404
      </p>
      <h1 className="text-[clamp(3rem,10vw,7rem)] font-semibold uppercase leading-[0.9] tracking-tight">
        Page not found
      </h1>
      <p className="max-w-md text-lg text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-4 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:text-volt"
      >
        &larr; Back to home
      </Link>
    </main>
  );
}
