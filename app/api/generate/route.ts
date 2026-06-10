import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

export const maxDuration = 60;

interface GenerateRequest {
  clientName?: string;
  yourBusiness?: string;
  projectNotes?: string;
  budget?: string;
  tone?: string;
}

function buildPrompt({ clientName, yourBusiness, projectNotes, budget, tone }: GenerateRequest) {
  return `You are an expert proposal writer for freelancers and agencies. Write a complete, client-ready project proposal in Markdown.

Seller: ${yourBusiness || "an independent professional"}
Client: ${clientName || "the client"}
Budget signal: ${budget || "not specified, propose a sensible range"}
Tone: ${tone || "confident and warm"}

Project notes from the discovery call:
${projectNotes || "(none provided)"}

Structure the proposal with these sections: a short opening framed around the client's desired OUTCOME (never start with "I am writing to..."), Scope of Work, Deliverables, Timeline, Investment (a simple pricing table in Markdown), and Next Steps with a clear call to action. Keep it under 600 words. Be specific: turn vague notes into concrete commitments. Never invent credentials or fake testimonials.`;
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
| Execution | Weeks 2–4 |
| Refinement & handover | Week 5 |

## Investment

| Item | Price |
| --- | --- |
| Full engagement | ${input.budget || "$8,500"} |

50% to begin, 50% on delivery.

## Next Steps

Reply "let's go" and you'll have the kickoff document within 24 hours. This quote is valid for 14 days.

${seller}`;

  const words = text.split(" ");
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return demoStream(input);
  }

  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    prompt: buildPrompt(input),
  });

  return result.toTextStreamResponse();
}
