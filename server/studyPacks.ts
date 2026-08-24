export type StudyPackKind = "summary" | "flashcards" | "quiz";

type Citation = { materialTitle: string; pageNumber: number | null; excerpt: string };
type SummaryPayload = { summary?: string; citations?: Citation[] };
type FlashcardPayload = { cards?: Array<{ front?: string; back?: string; citations?: Citation[] }> };
type QuizPayload = { questions?: Array<{ prompt?: string; type?: string; options?: string[]; answer?: string; explanation?: string; citations?: Citation[] }> };

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "study-pack"; }
function citationLines(items: Citation[] | undefined) { return (items || []).map(item => `- ${item.materialTitle}${item.pageNumber ? `, page ${item.pageNumber}` : ""}: ${item.excerpt}`).join("\n"); }
function heading(subjectName: string, title: string) { return `# ${subjectName} — ${title}\n\n> Created by Kevin from your own source-grounded study material.\n\n`; }

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
