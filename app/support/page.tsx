import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support — Draftly",
};

export default function SupportPage() {
  const ticketRef = `DRF-${String(Date.now()).slice(-6)}`;
  const subject = `Support Request #${ticketRef}: [type support subject here]`;
  const mailtoHref = `mailto:info@draftly.ca?subject=${encodeURIComponent(subject)}`;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
          Draftly<span className="text-vermillion">.</span>
        </Link>

        <div className="mt-8 border border-line bg-cream p-10">
          <p className="eyebrow text-vermillion">Get help</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">
            We&apos;re here.
          </h1>
          <p className="mt-4 leading-relaxed text-ink-soft">
            For any questions, billing issues, or feature requests, email us directly and
            we&apos;ll get back to you.
          </p>

          <a
            href={mailtoHref}
            className="mt-8 block border border-ink bg-ink px-6 py-3.5 text-center font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion"
          >
            Email us → info@draftly.ca
          </a>

          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Your ticket reference is{" "}
            <span className="font-medium text-ink">#{ticketRef}</span> — we include it when
            we reply so your request is easy to track.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link href="/" className="underline underline-offset-4 hover:text-ink">
            ← Back to Draftly
          </Link>
        </p>
      </div>
    </main>
  );
}
