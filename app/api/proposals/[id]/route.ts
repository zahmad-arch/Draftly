import { NextResponse } from "next/server";
import { resolveAccess } from "@/lib/access";
import { titleFrom } from "@/lib/proposal-blocks";
import { scrub } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";

const STATUSES = new Set(["draft", "sent", "won", "lost"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await resolveAccess();
  if (res.kind === "unauthenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (res.kind !== "ok") {
    return NextResponse.json({ error: "Active subscription required." }, { status: 402 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    value?: number | null;
    title?: string;
    client_name?: string;
    content?: string;
  };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 422 });
    }
    update.status = body.status;
  }
  if (body.value !== undefined) {
    if (body.value !== null && (typeof body.value !== "number" || body.value < 0)) {
      return NextResponse.json({ error: "Invalid value." }, { status: 422 });
    }
    update.value = body.value;
  }
  if (body.title !== undefined) update.title = String(body.title).slice(0, 200);
  if (body.client_name !== undefined) update.client_name = String(body.client_name).slice(0, 200);
  if (body.content !== undefined) {
    if (typeof body.content !== "string" || body.content.length > 120_000) {
      return NextResponse.json({ error: "Invalid content." }, { status: 422 });
    }
    const clean = scrub(body.content);
    update.content = clean;
    // Keep the display title in sync with the document's first heading.
    const t = titleFrom(clean);
    if (t) update.title = t;
  }

  // RLS scopes the update to the caller's account.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .update(update)
    .eq("id", id)
    .select("id, status, value")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await resolveAccess();
  if (res.kind === "unauthenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (res.kind !== "ok") {
    return NextResponse.json({ error: "Active subscription required." }, { status: 402 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
