"use client";

export default function StudioError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="border border-line bg-cream p-10 text-center">
        <p className="eyebrow text-vermillion">Hit a snag</p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
          That didn&apos;t go through.
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          Something went wrong on our side. Try again, and if it keeps happening,{" "}
          <a href="mailto:support@draftly.ca" className="underline underline-offset-4">
            email support
          </a>
          .
        </p>
        <button
          onClick={reset}
          className="mt-7 cursor-pointer border border-ink bg-ink px-6 py-3 font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
