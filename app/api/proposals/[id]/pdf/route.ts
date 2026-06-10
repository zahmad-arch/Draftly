import { resolveAccess } from "@/lib/access";
import { renderProposalPdf } from "@/lib/pdf/proposal-pdf";
import { scrub } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function contentDisposition(clientName: string | null): string {
  const base = clientName
    ? `Proposal - ${scrub(clientName)}`
    : "Proposal";
  const cleaned = base
    .replace(/[\\/:*?"<>|\r\n]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "")
    .slice(0, 80);
  const ascii = cleaned.replace(/[^\x20-\x7E]/g, "_");
  const utf8 = encodeURIComponent(cleaned);
  return `attachment; filename="${ascii}.pdf"; filename*=UTF-8''${utf8}.pdf`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await resolveAccess();
  if (res.kind === "unauthenticated") {
    return new Response("Sign in required.", { status: 401 });
  }
  if (res.kind !== "ok") {
    return new Response("Active subscription required.", { status: 402 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, client_name, title, content, seller_name, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!proposal) return new Response("Not found.", { status: 404 });
  if (!proposal.content) {
    return new Response("This draft has no content yet. Try again in a moment.", {
      status: 409,
    });
  }

  const buffer = await renderProposalPdf(proposal);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(proposal.client_name),
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
