import PDFDocument from "pdfkit";

export type StudyPackKind = "summary" | "flashcards" | "quiz";
export type StudyPackFormat = "markdown" | "pdf" | "anki";

type Citation = { materialTitle: string; pageNumber: number | null; excerpt: string };
type SummaryPayload = { summary?: string; citations?: Citation[] };
type FlashcardPayload = { cards?: Array<{ front?: string; back?: string; citations?: Citation[] }> };
type QuizPayload = { questions?: Array<{ prompt?: string; type?: string; options?: string[]; answer?: string; explanation?: string; citations?: Citation[] }> };

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "study-pack"; }
function citationLines(items: Citation[] | undefined) { return (items || []).map(item => `- ${item.materialTitle}${item.pageNumber ? `, page ${item.pageNumber}` : ""}: ${item.excerpt}`).join("\n"); }
function heading(subjectName: string, title: string) { return `# ${subjectName} — ${title}\n\n> Created by Kevin from your own source-grounded study material.\n\n`; }
function citationText(items: Citation[] | undefined) { return (items || []).map(item => `${item.materialTitle}${item.pageNumber ? `, p. ${item.pageNumber}` : ""}`).join(" · "); }
function escapeAnki(value: string) { return value.replace(/\t/g, " ").replace(/\r?\n/g, "<br>").replace(/<br><br>/g, "<br>"); }

export function buildStudyPack(input: { subjectName: string; kind: StudyPackKind; payload: unknown }) {
  const title = input.kind === "summary" ? "Summary Sheet" : input.kind === "flashcards" ? "Flashcard Deck" : "Quiz Pack & Answer Key";
  let content = heading(input.subjectName, title);

  if (input.kind === "summary") {
    const payload = input.payload as SummaryPayload;
    if (!payload.summary) throw new Error("Generate a summary before exporting this study pack.");
    content += `## Grounded summary\n\n${payload.summary}\n\n## Source notes\n\n${citationLines(payload.citations) || "No source notes were attached."}\n`;
  }
  if (input.kind === "flashcards") {
    const payload = input.payload as FlashcardPayload;
    const cards = payload.cards || [];
    if (!cards.length) throw new Error("Generate flashcards before exporting this study pack.");
    content += cards.map((card, index) => `## Card ${index + 1}\n\n**Prompt**  \n${card.front || "Review this concept."}\n\n**Answer**  \n${card.back || "No answer available."}\n\n**Sources**\n${citationLines(card.citations) || "No source notes were attached."}`).join("\n\n---\n\n") + "\n";
  }
  if (input.kind === "quiz") {
    const payload = input.payload as QuizPayload;
    const questions = payload.questions || [];
    if (!questions.length) throw new Error("Generate a quiz before exporting this study pack.");
    content += "## Practice quiz\n\n" + questions.map((question, index) => `${index + 1}. ${question.prompt || "Review the source material."}${question.options?.length ? `\n\n${question.options.map((option, optionIndex) => `   ${String.fromCharCode(65 + optionIndex)}. ${option}`).join("\n")}` : ""}`).join("\n\n") + "\n\n---\n\n## Answer key\n\n" + questions.map((question, index) => `### ${index + 1}. ${question.answer || "Review the cited material."}\n\n${question.explanation || ""}\n\n**Sources**\n${citationLines(question.citations) || "No source notes were attached."}`).join("\n\n");
  }
  return { fileName: `${slug(input.subjectName)}-${input.kind}-study-pack.md`, content, contentType: "text/markdown;charset=utf-8" };
}

export function buildAnkiPack(input: { subjectName: string; payload: unknown }) {
  const payload = input.payload as FlashcardPayload;
  const cards = payload.cards || [];
  if (!cards.length) throw new Error("Generate flashcards before exporting to Anki.");
  const tag = slug(input.subjectName).replace(/-/g, "_");
  const rows = cards.map(card => {
    const sources = citationText(card.citations);
    const back = `${card.back || "No answer available."}${sources ? `<br><br><small>Sources: ${sources}</small>` : ""}`;
    return `${escapeAnki(card.front || "Review this concept.")}\t${escapeAnki(back)}\t${tag}`;
  });
  return { fileName: `${slug(input.subjectName)}-anki-flashcards.tsv`, content: `#separator:Tab\n#html:true\n#tags column:3\n${rows.join("\n")}\n`, contentType: "text/tab-separated-values;charset=utf-8" };
}

function writePdfHeading(doc: PDFKit.PDFDocument, subjectName: string, title: string) {
  doc.fillColor("#473C5A").font("Helvetica-Bold").fontSize(24).text(subjectName);
  doc.moveDown(0.25).fillColor("#725AC1").fontSize(12).text(title.toUpperCase(), { characterSpacing: 1.4 });
  doc.moveDown(0.75).fillColor("#666070").font("Helvetica").fontSize(9).text("Created by Kevin from your source-grounded study materials.");
  doc.moveDown(1).strokeColor("#D9CFEC").moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(1);
}

function writePdfCitation(doc: PDFKit.PDFDocument, items: Citation[] | undefined) {
  const text = citationText(items);
  if (!text) return;
  doc.moveDown(0.3).fillColor("#725AC1").font("Helvetica-Oblique").fontSize(8).text(`Sources: ${text}`);
  doc.moveDown(0.5);
}

export async function buildPdfStudyPack(input: { subjectName: string; kind: "summary" | "quiz"; payload: unknown }) {
  const title = input.kind === "summary" ? "Summary Sheet" : "Quiz Pack & Answer Key";
  if (input.kind === "summary" && !(input.payload as SummaryPayload).summary) throw new Error("Generate a summary before exporting it.");
  if (input.kind === "quiz" && !((input.payload as QuizPayload).questions || []).length) throw new Error("Generate a quiz before exporting it.");
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 54, bottom: 54, left: 54, right: 54 }, info: { Title: `${input.subjectName} — ${title}`, Author: "Kevin" } });
    const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    writePdfHeading(doc, input.subjectName, title);
    if (input.kind === "summary") {
      const payload = input.payload as SummaryPayload;
      doc.fillColor("#473C5A").font("Helvetica-Bold").fontSize(15).text("Grounded summary");
      doc.moveDown(0.5).fillColor("#34313B").font("Helvetica").fontSize(11).lineGap(4).text(payload.summary!);
      writePdfCitation(doc, payload.citations);
    } else {
      const payload = input.payload as QuizPayload;
      const questions = payload.questions || [];
      doc.fillColor("#473C5A").font("Helvetica-Bold").fontSize(15).text("Practice quiz");
      questions.forEach((question, index) => {
        doc.moveDown(0.7).fillColor("#473C5A").font("Helvetica-Bold").fontSize(11).text(`${index + 1}. ${question.prompt || "Review the source material."}`);
        if (question.options?.length) doc.moveDown(0.25).fillColor("#34313B").font("Helvetica").fontSize(10).text(question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join("\n"), { indent: 14 });
        writePdfCitation(doc, question.citations);
      });
      doc.addPage();
      writePdfHeading(doc, input.subjectName, "Answer Key");
      questions.forEach((question, index) => {
        doc.moveDown(0.6).fillColor("#473C5A").font("Helvetica-Bold").fontSize(11).text(`${index + 1}. ${question.answer || "Review the cited material."}`);
        if (question.explanation) doc.moveDown(0.25).fillColor("#34313B").font("Helvetica").fontSize(10).lineGap(3).text(question.explanation);
        writePdfCitation(doc, question.citations);
      });
    }
    doc.end();
  });
  if (buffer.length < 100) throw new Error(`Generate ${input.kind === "summary" ? "a summary" : "a quiz"} before exporting it.`);
  return { fileName: `${slug(input.subjectName)}-${input.kind}-study-pack.pdf`, dataBase64: buffer.toString("base64"), contentType: "application/pdf" };
}
