import path from "node:path";
import { Font } from "@react-pdf/renderer";

export interface PdfFamilies {
  display: string;
  body: string;
}

export const FALLBACK_FAMILIES: PdfFamilies = {
  // PDF standard-14 fonts: always available, no registration needed.
  display: "Times-Roman",
  body: "Helvetica",
};

const DIR = path.join(process.cwd(), "lib", "pdf", "fonts");
let registered: "brand" | "fallback" | null = null;

/** Registers the brand fonts once; degrades to built-ins if the TTFs are missing. */
export function ensureFonts(): PdfFamilies {
  if (registered === "brand") return { display: "Fraunces", body: "Archivo" };
  if (registered === "fallback") return FALLBACK_FAMILIES;
  try {
    Font.register({
      family: "Fraunces",
      fonts: [
        { src: path.join(DIR, "Fraunces-Medium.ttf"), fontWeight: 500 },
        { src: path.join(DIR, "Fraunces-SemiBold.ttf"), fontWeight: 600 },
      ],
    });
    Font.register({
      family: "Archivo",
      fonts: [
        { src: path.join(DIR, "Archivo-Regular.ttf") },
        { src: path.join(DIR, "Archivo-Medium.ttf"), fontWeight: 500 },
        { src: path.join(DIR, "Archivo-SemiBold.ttf"), fontWeight: 600 },
        { src: path.join(DIR, "Archivo-Italic.ttf"), fontStyle: "italic" },
      ],
    });
    // react-pdf's hyphenation produces odd breaks; disable it.
    Font.registerHyphenationCallback((w) => [w]);
    registered = "brand";
    return { display: "Fraunces", body: "Archivo" };
  } catch {
    registered = "fallback";
    return FALLBACK_FAMILIES;
  }
}
