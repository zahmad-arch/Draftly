"use client";

export function EmailButton({ mailtoHref }: { mailtoHref: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = mailtoHref;
      }}
      className="mt-8 block w-full cursor-pointer border border-ink bg-ink px-6 py-3.5 text-center font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion"
    >
      Email us → info@draftly.ca
    </button>
  );
}
