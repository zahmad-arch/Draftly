import {
  Document as PdfDocument,
  Page as PdfPage,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  groupForPdf,
  inlineText,
  parseBlocks,
  type Inline,
  type PdfBlock,
} from "@/lib/proposal-blocks";
import { scrub } from "@/lib/sanitize";
import { FALLBACK_FAMILIES, ensureFonts, type PdfFamilies } from "./fonts";

const INK = "#1b1712";
const INK_SOFT = "#5a5043";
const VERMILLION = "#d8431f";
const LINE = "#d9cfba";
const CREAM = "#fdfaf2";

export interface ProposalPdfData {
  id: string;
  client_name: string | null;
  title: string | null;
  content: string;
  seller_name: string | null;
  created_at: string;
}

function makeStyles(f: PdfFamilies) {
  return StyleSheet.create({
    page: {
      backgroundColor: CREAM,
      color: INK,
      paddingTop: 56,
      paddingHorizontal: 64,
      paddingBottom: 78,
      fontFamily: f.body,
      fontSize: 9.5,
    },
    mastheadRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    seller: {
      fontFamily: f.body,
      fontWeight: 600,
      fontSize: 9,
      letterSpacing: 1.8,
      textTransform: "uppercase",
      color: INK,
    },
    mastheadMeta: {
      fontSize: 8,
      letterSpacing: 1,
      color: INK_SOFT,
      textAlign: "right",
    },
    hairline: { borderBottomWidth: 0.75, borderBottomColor: LINE, marginTop: 10 },
    inkTab: { width: 56, height: 2, backgroundColor: INK },
    eyebrow: {
      marginTop: 26,
      fontFamily: f.body,
      fontWeight: 600,
      fontSize: 8,
      letterSpacing: 2.4,
      textTransform: "uppercase",
      color: VERMILLION,
    },
    title: {
      marginTop: 10,
      fontFamily: f.display,
      fontWeight: 600,
      fontSize: 25,
      lineHeight: 1.15,
      color: INK,
    },
    preparedFor: { marginTop: 8, fontSize: 9.5, color: INK_SOFT },
    mastheadClose: {
      borderBottomWidth: 0.75,
      borderBottomColor: LINE,
      marginTop: 24,
      marginBottom: 6,
    },
    p: { fontSize: 9.5, lineHeight: 1.55, color: INK, marginBottom: 7 },
    bold: { fontFamily: f.body, fontWeight: 600 },
    h2Wrap: { marginTop: 22, marginBottom: 8 },
    h2Rule: { borderBottomWidth: 0.5, borderBottomColor: LINE, marginBottom: 14 },
    h2: { fontFamily: f.display, fontWeight: 600, fontSize: 13, color: INK },
    h1Mid: { fontFamily: f.display, fontWeight: 600, fontSize: 16, color: INK },
    quote: {
      borderLeftWidth: 2,
      borderLeftColor: VERMILLION,
      paddingLeft: 10,
      marginVertical: 8,
    },
    quoteText: {
      fontFamily: f.body,
      fontStyle: "italic",
      fontSize: 9.5,
      lineHeight: 1.5,
      color: INK_SOFT,
    },
    bulletRow: { flexDirection: "row", marginBottom: 5 },
    bulletMarker: {
      width: 2.8,
      height: 2.8,
      backgroundColor: VERMILLION,
      marginTop: 4.6,
      marginRight: 7,
    },
    bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.55, color: INK },
    numberedRow: { flexDirection: "row", marginBottom: 5 },
    numberedNum: {
      width: 16,
      fontFamily: f.display,
      fontWeight: 500,
      fontSize: 9.5,
      color: INK_SOFT,
    },
    blank: { height: 5 },
    table: {
      marginVertical: 10,
      borderTopWidth: 1.2,
      borderTopColor: INK,
      borderBottomWidth: 0.75,
      borderBottomColor: INK,
    },
    tableHeaderRow: {
      flexDirection: "row",
      paddingVertical: 5,
      borderBottomWidth: 0.6,
      borderBottomColor: LINE,
    },
    tableHeaderCell: {
      fontFamily: f.body,
      fontWeight: 600,
      fontSize: 7.5,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: INK_SOFT,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 6,
      borderBottomWidth: 0.6,
      borderBottomColor: LINE,
    },
    tableRowLast: { flexDirection: "row", paddingVertical: 6 },
    totalRow: {
      flexDirection: "row",
      paddingVertical: 7,
      borderTopWidth: 1.2,
      borderTopColor: INK,
    },
    cell: { flex: 1, fontSize: 9.5, color: INK },
    cellRight: { textAlign: "right", fontFamily: f.body, fontWeight: 500 },
    totalLabel: { flex: 1, fontFamily: f.body, fontWeight: 600, fontSize: 9.5, color: INK },
    totalValue: {
      flex: 1,
      textAlign: "right",
      fontFamily: f.body,
      fontWeight: 600,
      fontSize: 9.5,
      color: VERMILLION,
    },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 64,
      right: 64,
    },
    footerRule: { borderBottomWidth: 0.6, borderBottomColor: LINE },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 7,
    },
    footerText: {
      fontFamily: f.body,
      fontSize: 7,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: INK_SOFT,
    },
  });
}

type Styles = ReturnType<typeof makeStyles>;

function Inlines({ inlines, styles }: { inlines: Inline[]; styles: Styles }) {
  return (
    <>
      {inlines.map((seg, i) => (
        <Text key={i} style={seg.bold ? styles.bold : undefined}>
          {scrub(seg.text)}
        </Text>
      ))}
    </>
  );
}

function Table({
  rows,
  headerRow,
  styles,
}: {
  rows: Inline[][][];
  headerRow: boolean;
  styles: Styles;
}) {
  const bodyRows = headerRow ? rows.slice(1) : rows;
  const header = headerRow ? rows[0] : null;

  return (
    <View style={styles.table}>
      {header && (
        <View style={styles.tableHeaderRow} wrap={false}>
          {header.map((cell, j) => (
            <Text
              key={j}
              style={[styles.cell, styles.tableHeaderCell, j > 0 ? { textAlign: "right" } : {}]}
            >
              {scrub(inlineText(cell))}
            </Text>
          ))}
        </View>
      )}
      {bodyRows.map((cells, i) => {
        const first = scrub(inlineText(cells[0] ?? []));
        const isTotal = /^total\b/i.test(first);
        const isLast = i === bodyRows.length - 1;
        const rowStyle = isTotal
          ? styles.totalRow
          : isLast
            ? styles.tableRowLast
            : styles.tableRow;
        return (
          <View key={i} style={rowStyle} wrap={false}>
            {cells.map((cell, j) => (
              <Text
                key={j}
                style={
                  isTotal
                    ? j === 0
                      ? styles.totalLabel
                      : styles.totalValue
                    : [styles.cell, ...(j > 0 ? [styles.cellRight] : [])]
                }
              >
                {scrub(inlineText(cell))}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function ProposalPdf({
  proposal,
  families,
}: {
  proposal: ProposalPdfData;
  families: PdfFamilies;
}) {
  const styles = makeStyles(families);
  const blocks = groupForPdf(parseBlocks(scrub(proposal.content)));

  // The first h1 becomes the masthead title and is not repeated in the body.
  const firstH1 = blocks.findIndex((b) => b.kind === "h1");
  const titleBlock = firstH1 >= 0 ? (blocks[firstH1] as { inlines: Inline[] }) : null;
  const body: PdfBlock[] = blocks.filter((_, i) => i !== firstH1);

  const title = scrub(
    (titleBlock ? inlineText(titleBlock.inlines) : "") || proposal.title || "Proposal",
  );
  const seller = proposal.seller_name ? scrub(proposal.seller_name) : null;
  const client = proposal.client_name ? scrub(proposal.client_name) : null;
  const ref = proposal.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const date = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(proposal.created_at));

  // Leading blank blocks before the first section read as dead space in print.
  while (body.length > 0 && body[0].kind === "blank") body.shift();

  return (
    <PdfDocument title={title} author={seller ?? undefined}>
      <PdfPage size="LETTER" style={styles.page}>
        {/* Masthead */}
        <View>
          <View style={styles.mastheadRow}>
            <Text style={styles.seller}>{seller ?? "Proposal"}</Text>
            <View>
              <Text style={styles.mastheadMeta}>NO. {ref}</Text>
              <Text style={[styles.mastheadMeta, { marginTop: 2 }]}>{date}</Text>
            </View>
          </View>
          <View style={styles.hairline} />
          <View style={styles.inkTab} />
          {seller && <Text style={styles.eyebrow}>Proposal</Text>}
          <Text style={styles.title}>{title}</Text>
          {client && <Text style={styles.preparedFor}>Prepared for {client}</Text>}
          <View style={styles.mastheadClose} />
        </View>

        {/* Body */}
        {body.map((block, i) => {
          switch (block.kind) {
            case "h1":
              return (
                <View key={i} style={styles.h2Wrap} minPresenceAhead={56}>
                  <View style={styles.h2Rule} />
                  <Text style={styles.h1Mid}>{scrub(inlineText(block.inlines))}</Text>
                </View>
              );
            case "h2":
              return (
                <View key={i} style={styles.h2Wrap} minPresenceAhead={56}>
                  <View style={styles.h2Rule} />
                  <Text style={styles.h2}>{scrub(inlineText(block.inlines))}</Text>
                </View>
              );
            case "quote":
              return (
                <View key={i} style={styles.quote} wrap={false}>
                  <Text style={styles.quoteText}>{scrub(inlineText(block.inlines))}</Text>
                </View>
              );
            case "bullet":
              return (
                <View key={i} style={styles.bulletRow} wrap={false}>
                  <View style={styles.bulletMarker} />
                  <Text style={styles.bulletText}>
                    <Inlines inlines={block.inlines} styles={styles} />
                  </Text>
                </View>
              );
            case "numbered": {
              const m = scrub(inlineText(block.inlines)).match(/^(\d+)\.\s*(.*)$/);
              if (!m) {
                return (
                  <Text key={i} style={styles.p}>
                    <Inlines inlines={block.inlines} styles={styles} />
                  </Text>
                );
              }
              return (
                <View key={i} style={styles.numberedRow} wrap={false}>
                  <Text style={styles.numberedNum}>{m[1]}.</Text>
                  <Text style={styles.bulletText}>{m[2]}</Text>
                </View>
              );
            }
            case "table":
              return <Table key={i} rows={block.rows} headerRow={block.headerRow} styles={styles} />;
            case "blank":
              return <View key={i} style={styles.blank} />;
            case "p":
              return (
                <Text key={i} style={styles.p}>
                  <Inlines inlines={block.inlines} styles={styles} />
                </Text>
              );
          }
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerRule} />
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{seller ?? "Confidential"}</Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) =>
                totalPages ? `Page ${pageNumber} of ${totalPages}` : `Page ${pageNumber}`
              }
            />
          </View>
        </View>
      </PdfPage>
    </PdfDocument>
  );
}

/** Renders the proposal PDF, retrying once with built-in fonts on failure. */
export async function renderProposalPdf(proposal: ProposalPdfData): Promise<Buffer> {
  const families = ensureFonts();
  try {
    return await renderToBuffer(<ProposalPdf proposal={proposal} families={families} />);
  } catch (err) {
    if (families.display !== FALLBACK_FAMILIES.display) {
      return await renderToBuffer(
        <ProposalPdf proposal={proposal} families={FALLBACK_FAMILIES} />,
      );
    }
    throw err;
  }
}
