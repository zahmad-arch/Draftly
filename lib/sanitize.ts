/**
 * Scrubs text of em dashes, emojis, and other AI-tell typography.
 * Pure function, shared by the generation stream, persistence, and PDF builder.
 * Keeps curly quotes/apostrophes and ellipses: they read as typeset, not AI.
 */

// Em dash family: em dash, horizontal bar, two-em dash, three-em dash.
const EM_DASHES = /\s*[—―⸺⸻]\s*/g;
// En dash and minus sign.
const EN_DASHES = /[–−]/g;
// Emoji, pictographs, variation selectors, ZWJ, regional-indicator flags,
// and dingbat-class symbols.
const EMOJI = /\p{Extended_Pictographic}|️|‍|[\u{1F1E6}-\u{1F1FF}]/gu;
// C0 control chars except \n (U+000A), plus DEL and C1.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;

export function scrub(s: string): string {
  return s
    .replace(EM_DASHES, ", ")
    .replace(EN_DASHES, "-")
    .replace(EMOJI, "")
    .replace(/ /g, " ") // non-breaking space
    .replace(CONTROL, "")
    .replace(/,\s*,/g, ",") // doubled commas from em-dash replacement
    .replace(/([.:;!?]),\s/g, "$1 ") // ".," artifacts
    .replace(/ {2,}/g, " ") // collapse space runs (never newlines)
    .replace(/ +$/gm, ""); // trailing spaces per line
}

/** Wraps a text stream so every chunk is scrubbed before reaching the client. */
export function scrubStream(): TransformStream<string, string> {
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      controller.enqueue(scrub(chunk));
    },
  });
}
