import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { resolveAccess } from "@/lib/access";
import { scrub, scrubStream } from "@/lib/sanitize";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { consumeGeneration, releaseGeneration } from "@/lib/usage";

export const maxDuration = 60;

export interface PricingItem {
  item: string;
  qty: string;
  price: string;
}

interface GenerateRequest {
  clientName?: string;
  yourBusiness?: string;
  projectNotes?: string;
  budget?: string;
  tone?: string;
  clientProfileId?: string;
  pricingItems?: PricingItem[];
}

interface PromptContext {
  voice?: { description: string; writing_sample: string; voice_name: string } | null;
  profile?: {
    name: string;
    business_context: string | null;
    default_tone: string | null;
    notes: string | null;
  } | null;
  pricingItems?: PricingItem[];
}

function buildPrompt(input: GenerateRequest, ctx: PromptContext = {}) {
  const clientName = input.clientName || ctx.profile?.name || "the client";
  const tone = input.tone || ctx.profile?.default_tone || "confident and warm";

  let notes = input.projectNotes || "(none provided)";
  if (ctx.profile?.business_context || ctx.profile?.notes) {
    notes += `\n\nWhat we know about this client:`;
    if (ctx.profile.business_context) notes += `\n${ctx.profile.business_context}`;
    if (ctx.profile.notes) notes += `\n${ctx.profile.notes}`;
  }

  let investment: string;
  if (ctx.pricingItems && ctx.pricingItems.length > 0) {
    const lines = ctx.pricingItems
      .map((p) => `- ${p.item}${p.qty ? ` (qty: ${p.qty})` : ""}: ${p.price}`)
      .join("\n");
    investment = `Investment (an itemized pricing table in Markdown using EXACTLY these line items and prices, with a total row that sums them. Do not invent or change prices):\n${lines}`;
  } else {
    investment = "Investment (a simple pricing table in Markdown)";
  }

  let voiceSection = "";
  if (ctx.voice && (ctx.voice.description || ctx.voice.writing_sample)) {
    voiceSection = `\n\nBrand voice${ctx.voice.voice_name ? ` ("${ctx.voice.voice_name}")` : ""}: ${ctx.voice.description}`;
    if (ctx.voice.writing_sample) {
      voiceSection += `\n\nHere is a sample of our past writing. Match its voice, cadence, and vocabulary:\n${ctx.voice.writing_sample.slice(0, 2000)}`;
    }
  }

  return `You are an expert proposal writer for freelancers and agencies. Write a complete, client-ready project proposal in Markdown.

Seller: ${input.yourBusiness || "an independent professional"}
Client: ${clientName}
Budget signal: ${input.budget || "not specified, propose a sensible range"}
Tone: ${tone}${voiceSection}

Project notes from the discovery call:
${notes}

Structure the proposal with these sections: a short opening framed around the client's desired OUTCOME (never start with "I am writing to..."), Scope of Work, Deliverables, Timeline, ${investment}, and Next Steps with a clear call to action. Keep it under 600 words. Be specific: turn vague notes into concrete commitments. Never invent credentials or fake testimonials.

Style rules, non-negotiable:
- Never use em dashes. Use a comma, colon, or period instead.
- Never use emojis or decorative symbols of any kind.
- Avoid words and phrases that read as AI-generated: "delve", "leverage", "seamless", "elevate", "unlock", "supercharge", "game-changing", "I hope this finds you well", "in today's fast-paced world". Plain, confident, specific language only.
- Write like an experienced human professional sending a real document to a real client.`;
}

/** Pull a display title from the generated markdown's first heading. */
function titleFrom(text: string): string | null {
  const m = text.match(/^#\s+(.+)$/m);
  return m ? m[1].trim().slice(0, 200) : null;
}

/** Demo-mode fallback: streams a templated proposal so the product works with zero API keys. */
function demoStream(input: GenerateRequest): Response {
  const client = input.clientName || "Acme Co.";
  const seller = input.yourBusiness || "Your Studio";
  const text = `> **Demo mode:** set \`ANTHROPIC_API_KEY\` to enable live AI drafting. This sample shows the output shape.

# Proposal for ${client}

${client} needs results, not busywork, and that's exactly what this engagement is built to deliver. Below is how ${seller} will get you there.

## Scope of Work

Based on our conversation, this engagement covers:

- Discovery and audit of the current state
- Strategy aligned to your goals${input.projectNotes ? `, specifically: ${input.projectNotes.slice(0, 140)}` : ""}
- Full execution and delivery
- One round of refinement based on your feedback

## Deliverables

1. Kickoff document and project plan
2. The core work product, ready for launch
3. Handover guide so your team owns it going forward

## Timeline

| Phase | Duration |
| --- | --- |
| Discovery | Week 1 |
| Execution | Weeks 2-4 |
| Refinement & handover | Week 5 |

## Investment

| Item | Price |
| --- | --- |
| Full engagement | ${input.budget || "$8,500"} |

50% to begin, 50% on delivery.

## Next Steps

Reply "let's go" and you'll have the kickoff document within 24 hours. This quote is valid for 14 days.

${seller}`;

  const words = scrub(text).split(" ");
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < words.length; i++) {
        controller.enqueue(encoder.encode(words[i] + (i < words.length - 1 ? " " : "")));
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const input = (await req.json().catch(() => ({}))) as GenerateRequest;

  // Demo mode without Supabase: open studio, no gates, no persistence.
  if (!isSupabaseConfigured()) return demoStream(input);

  // 1. Auth + entitlement
  const res = await resolveAccess();
  if (res.kind === "unauthenticated") {
    return new Response("Sign in to draft proposals.", { status: 401 });
  }
  if (res.kind !== "ok") {
    return new Response("An active subscription is required.", { status: 402 });
  }
  const { access } = res;
  const ent = access.entitlements;

  // Demo output when no model key: gates ran, but skip usage + persistence.
  if (!process.env.ANTHROPIC_API_KEY) return demoStream(input);

  // 2. Monthly limit (atomic; race-free)
  let used: number | null = null;
  if (ent.monthlyLimit !== null) {
    const r = await consumeGeneration(access.userId, ent.monthlyLimit);
    if (!r.allowed) {
      return new Response(
        `You've used all ${ent.monthlyLimit} proposals this month. Upgrade to Studio for unlimited drafting.`,
        { status: 429 },
      );
    }
    used = r.used;
  }

  // 3. Context (user client; RLS scopes to the account)
  const supabase = await createClient();
  const [voiceRes, profileRes] = await Promise.all([
    ent.brandVoice
      ? supabase
          .from("brand_voices")
          .select("voice_name, description, writing_sample")
          .eq("account_id", access.accountId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    ent.clientProfiles && input.clientProfileId
      ? supabase
          .from("client_profiles")
          .select("name, business_context, default_tone, notes")
          .eq("id", input.clientProfileId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const pricingItems = ent.pricingTables ? input.pricingItems : undefined;

  // 4. Persist the draft row first so its id can ride a response header.
  const clientName = input.clientName || profileRes.data?.name || null;
  const { data: proposal } = await supabase
    .from("proposals")
    .insert({
      account_id: access.accountId,
      created_by: access.userId,
      client_name: clientName,
      title: clientName ? `Proposal for ${clientName}` : "Untitled proposal",
      seller_name: input.yourBusiness?.trim().slice(0, 200) || null,
      model: ent.model,
    })
    .select("id")
    .single();

  // 5. Stream
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const result = streamText({
    model: anthropic(ent.model),
    prompt: buildPrompt(input, {
      voice: voiceRes.data,
      profile: profileRes.data,
      pricingItems,
    }),
    onFinish: async ({ text }) => {
      if (!proposal) return;
      const clean = scrub(text);
      await supabase
        .from("proposals")
        .update({
          content: clean,
          title: titleFrom(clean) ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposal.id);
    },
    onError: async () => {
      // Model call failed: refund the generation and drop the empty draft.
      if (ent.monthlyLimit !== null) await releaseGeneration(access.userId);
      if (proposal) await supabase.from("proposals").delete().eq("id", proposal.id);
    },
  });

  // Drain server-side so onFinish fires even if the browser disconnects.
  result.consumeStream();

  // Scrub the live stream too: em dashes and emojis never reach the client.
  const body = result.textStream
    .pipeThrough(scrubStream())
    .pipeThrough(new TextEncoderStream());

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...(proposal ? { "X-Proposal-Id": proposal.id } : {}),
      ...(used !== null && ent.monthlyLimit !== null
        ? { "X-Usage-Used": String(used), "X-Usage-Limit": String(ent.monthlyLimit) }
        : {}),
    },
  });
}
