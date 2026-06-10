export type ProposalStatus = "draft" | "sent" | "won" | "lost";

const STYLES: Record<ProposalStatus, string> = {
  won: "border-2 border-moss text-moss font-display font-bold",
  lost: "border border-line text-ink-soft/60 opacity-70",
  sent: "border border-ink text-ink",
  draft: "border border-transparent text-ink-soft/50",
};

export function StatusStamp({
  status,
  className = "",
}: {
  status: ProposalStatus;
  className?: string;
}) {
  if (status === "draft") {
    return <span className={`text-xs text-ink-soft/50 ${className}`}>draft</span>;
  }
  return (
    <span
      className={`px-2 py-0.5 text-[0.65rem] tracking-[0.18em] uppercase ${STYLES[status]} ${className}`}
    >
      {status}
    </span>
  );
}
