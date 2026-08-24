import { PDFParse } from "pdf-parse";
import { invokeLLM, listLLMModels } from "./_core/llm";

export type SourceChunk = {
  id: number;
  materialId: number;
  materialTitle: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
};

export type Citation = {
  chunkId: number;
  materialId: number;
  materialTitle: string;
  pageNumber: number | null;
  excerpt: string;
};

export const MAX_PDF_PAGES = 60;
const MAX_OCR_PAGES = MAX_PDF_PAGES;
const OCR_CONCURRENCY = 6;
let preferredModel: string | undefined;
let preferredOcrModel: string | undefined;

async function getPreferredStudyModel() {
  if (preferredModel) return preferredModel;
  try {
    const catalog = await listLLMModels();
    preferredModel = catalog.data.find(model => model.id === "gpt-5-mini")?.id
      ?? catalog.data.find(model => model.id.startsWith("gpt-5-mini"))?.id
      ?? catalog.data.find(model => model.id.startsWith("gpt-5"))?.id;
  } catch {
    // The platform's configured default remains a safe fallback if its model
    // catalog is temporarily unavailable.
    preferredModel = undefined;
  }
  return preferredModel;
}

async function getPreferredOcrModel() {
  if (preferredOcrModel) return preferredOcrModel;
  try {
    const catalog = await listLLMModels();
    preferredOcrModel = catalog.data.find(model => model.id === "gemini-3-flash-preview")?.id
      || catalog.data.find(model => model.id === "gpt-5-mini")?.id
      || catalog.data[0]?.id;
  } catch {
    preferredOcrModel = "gpt-5-mini";
  }
  return preferredOcrModel;
}

export function makeChunks(text: string, pageNumber: number | null, startIndex: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks: Array<{ pageNumber: number | null; chunkIndex: number; content: string }> = [];
  const chunkSize = 1_250;
  const overlap = 160;
  for (let start = 0; start < cleaned.length; start += chunkSize - overlap) {
    const content = cleaned.slice(start, start + chunkSize).trim();
    if (content.length >= 80) chunks.push({ pageNumber, chunkIndex: startIndex + chunks.length, content });
    if (start + chunkSize >= cleaned.length) break;
  }
  return chunks;
}

export function hasUsablePdfText(text: string) {
  return text.replace(/\s+/g, " ").trim().length >= 80;
}

export async function extractPdf(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const info = await parser.getInfo();
    const totalPages = Math.max(1, info.total || 1);
    const pages: Array<{ pageNumber: number; text: string }> = [];
    for (let pageNumber = 1; pageNumber <= Math.min(totalPages, MAX_PDF_PAGES); pageNumber += 1) {
      const result = await parser.getText({ partial: [pageNumber] });
      const text = result.text?.trim() ?? "";
      if (text) pages.push({ pageNumber, text });
    }
    return { totalPages, pages, truncated: totalPages > MAX_PDF_PAGES };
  } finally {
    await parser.destroy();
  }
}

export async function ocrScannedPdfPages(buffer: Buffer, pageNumbers: number[]) {
  const parser = new PDFParse({ data: buffer });
  const pages: Array<{ pageNumber: number; text: string }> = [];
  try {
    const model = await getPreferredOcrModel();
    const work = pageNumbers.slice(0, MAX_OCR_PAGES);
    const renderedPages: Array<{ pageNumber: number; dataUrl: string }> = [];
    for (const pageNumber of work) {
      try {
        const screenshot = await parser.getScreenshot({ partial: [pageNumber], imageDataUrl: true });
        const page = screenshot.pages?.[0] as { dataUrl?: string } | undefined;
        if (page?.dataUrl) renderedPages.push({ pageNumber, dataUrl: page.dataUrl });
      } catch (error) {
        console.warn(`[OCR] Could not render scanned PDF page ${pageNumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    let nextIndex = 0;
    const transcribeNextPage = async () => {
      while (nextIndex < renderedPages.length) {
        const page = renderedPages[nextIndex++];
        try {
          const response = await invokeLLM({
            model,
            max_tokens: 2200,
            messages: [
              { role: "system", content: "You are an exact OCR assistant for handwritten and printed study notes. Transcribe all readable text faithfully. Preserve headings, bullets, formulas, definitions, notation, and page structure. Do not summarize or invent missing words; use [illegible] only for text you cannot read. Return only the transcription. If no readable text is present, return an empty response." },
              { role: "user", content: [{ type: "image_url", image_url: { url: page.dataUrl, detail: "high" } }] },
            ],
          });
          const content = response.choices[0]?.message.content;
          const text = typeof content === "string"
            ? content.trim()
            : (content || []).filter(item => item.type === "text").map(item => item.text).join("\n").trim();
          if (text.length >= 40) pages.push({ pageNumber: page.pageNumber, text });
        } catch (error) {
          console.warn(`[OCR] Could not recover scanned PDF page ${page.pageNumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
          // OCR is best-effort; extracted text from other pages remains usable.
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(OCR_CONCURRENCY, renderedPages.length) }, () => transcribeNextPage()));
    return pages.sort((a, b) => a.pageNumber - b.pageNumber);
  } finally {
    await parser.destroy();
  }
}

function tokenise(value: string) {
  return value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
}

export function selectRelevantSources(sources: SourceChunk[], query: string, limit = 8) {
  const tokens = Array.from(new Set(tokenise(query))).slice(0, 20);
  return sources
    .map(source => {
      const content = source.content.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (content.includes(token) ? 1 : 0), 0);
      return { source, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.source.chunkIndex - b.source.chunkIndex)
    .slice(0, limit)
    .map(item => item.source);
}

/**
 * Select a compact, diverse set of excerpts when a study-set request has no
 * user query. The selection favours material coverage and lexical novelty so
 * the LLM receives bounded context rather than simply the first document pages.
 */
export function selectRepresentativeSources(sources: SourceChunk[], limit = 12) {
  const selected: SourceChunk[] = [];
  const selectedTerms = new Set<string>();
  const perMaterial = new Map<number, number>();
  const candidates = sources.filter(source => source.content.trim().length >= 80);

  while (selected.length < limit && candidates.length) {
    let bestIndex = -1;
    let bestScore = -1;
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const terms = Array.from(new Set(tokenise(candidate.content))).slice(0, 180);
      const novelTerms = terms.filter(term => !selectedTerms.has(term)).length;
      const materialCount = perMaterial.get(candidate.materialId) ?? 0;
      const coverageBonus = materialCount === 0 ? 24 : Math.max(0, 8 - materialCount * 3);
      const score = novelTerms + coverageBonus + Math.min(candidate.content.length / 600, 2);
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    }
    if (bestIndex < 0) break;
    const [next] = candidates.splice(bestIndex, 1);
    selected.push(next);
    perMaterial.set(next.materialId, (perMaterial.get(next.materialId) ?? 0) + 1);
    tokenise(next.content).forEach(term => selectedTerms.add(term));
  }
  return selected;
}

function formatContext(sources: SourceChunk[]) {
  return sources.map(source => `[SOURCE ${source.id} | ${source.materialTitle}${source.pageNumber ? ` | page ${source.pageNumber}` : ""}]\n${source.content}`).join("\n\n");
}

export function resolveCitations(ids: unknown, allowedSources: SourceChunk[]) {
  const allowed = new Map(allowedSources.map(source => [source.id, source]));
  const validIds = Array.isArray(ids) ? ids.filter((id): id is number => typeof id === "number" && allowed.has(id)) : [];
  const chosen = validIds.length ? Array.from(new Set(validIds)).slice(0, 3) : allowedSources.slice(0, 1).map(source => source.id);
  return chosen.map(chunkId => {
    const source = allowed.get(chunkId)!;
    return {
      chunkId,
      materialId: source.materialId,
      materialTitle: source.materialTitle,
      pageNumber: source.pageNumber,
      excerpt: source.content.slice(0, 220).trim(),
    } satisfies Citation;
  });
}

async function requestStructured(system: string, prompt: string, name: string, schema: Record<string, unknown>) {
  const model = await getPreferredStudyModel();
  const response = await invokeLLM({
    model,
    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
  });
  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Kevin could not validate the AI response. Please try again.");
  return JSON.parse(content) as Record<string, unknown>;
}

export async function answerGroundedly(question: string, availableSources: SourceChunk[]) {
  const sources = selectRelevantSources(availableSources, question);
  if (!sources.length) {
    return { answer: "I couldn't find a grounded answer in the materials currently available for this subject. Try adding a more relevant source or rephrasing your question.", citations: [] as Citation[] };
  }
  const output = await requestStructured(
    "You are Kevin, a careful study assistant. Answer only from the supplied source excerpts. If the excerpts do not answer the question, say that clearly. Never add outside facts. Keep the answer concise and include the source IDs that directly support it.",
    `Question: ${question}\n\nSource excerpts:\n${formatContext(sources)}`,
    "grounded_answer",
    {
      type: "object",
      properties: { answer: { type: "string" }, citationChunkIds: { type: "array", items: { type: "integer" } } },
      required: ["answer", "citationChunkIds"],
      additionalProperties: false,
    },
  );
  const citations = resolveCitations(output.citationChunkIds, sources);
  const answer = typeof output.answer === "string" && output.answer.trim()
    ? output.answer.trim()
    : "I couldn't form a reliable answer from the selected source excerpts.";
  return { answer, citations };
}

export async function makeSummary(sources: SourceChunk[]) {
  const selected = selectRepresentativeSources(sources, 12);
  if (!selected.length) throw new Error("Add material with readable text before generating a summary.");
  const output = await requestStructured(
    "You are Kevin, a careful study assistant. Summarize only the supplied study material. Highlight core ideas, definitions, relationships, and one compact review checklist. Do not introduce facts not in the excerpts.",
    `Source excerpts:\n${formatContext(selected)}`,
    "study_summary",
    {
      type: "object",
      properties: { summary: { type: "string" }, citationChunkIds: { type: "array", items: { type: "integer" } } },
      required: ["summary", "citationChunkIds"],
      additionalProperties: false,
    },
  );
  return { summary: String(output.summary || ""), citations: resolveCitations(output.citationChunkIds, selected) };
}

export async function makeFlashcards(sources: SourceChunk[], count: number) {
  const selected = selectRepresentativeSources(sources, 14);
  if (!selected.length) throw new Error("Add material with readable text before generating flashcards.");
  const output = await requestStructured(
    "You are Kevin, a careful study assistant. Create concise recall-focused flashcards using only the source excerpts. Each card must test a single idea. Never use outside knowledge.",
    `Create ${count} flashcards from these excerpts:\n${formatContext(selected)}`,
    "flashcard_set",
    {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: { front: { type: "string" }, back: { type: "string" }, citationChunkIds: { type: "array", items: { type: "integer" } } },
            required: ["front", "back", "citationChunkIds"],
            additionalProperties: false,
          },
        },
      },
      required: ["cards"],
      additionalProperties: false,
    },
  );
  const rawCards = Array.isArray(output.cards) ? output.cards.slice(0, count) : [];
  return rawCards.map((card, index) => {
    const item = card as Record<string, unknown>;
    return { id: `card-${index + 1}`, front: String(item.front || "Review this concept"), back: String(item.back || "No reliable answer generated."), citations: resolveCitations(item.citationChunkIds, selected) };
  });
}

export async function makeQuiz(sources: SourceChunk[], count: number, difficulty: "gentle" | "standard" | "challenging" = "standard") {
  const selected = selectRepresentativeSources(sources, 14);
  if (!selected.length) throw new Error("Add material with readable text before generating a quiz.");
  const output = await requestStructured(
    "You are Kevin, a careful study assistant. Write a fair quiz using only the supplied source excerpts. Mix multiple-choice and short-answer questions. Every question must be answerable from the excerpts and have a compact explanation.",
    `Create ${count} ${difficulty} difficulty questions from these excerpts. ${difficulty === "gentle" ? "Favor direct recall and clear definitions." : difficulty === "challenging" ? "Favor careful comparison, application, and distinctions stated in the excerpts." : "Balance recall with simple application."}\n${formatContext(selected)}`,
    "grounded_quiz",
    {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              prompt: { type: "string" },
              type: { type: "string", enum: ["multiple_choice", "short_answer"] },
              options: { type: "array", items: { type: "string" } },
              answer: { type: "string" },
              explanation: { type: "string" },
              citationChunkIds: { type: "array", items: { type: "integer" } },
            },
            required: ["prompt", "type", "options", "answer", "explanation", "citationChunkIds"],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  );
  const rawQuestions = Array.isArray(output.questions) ? output.questions.slice(0, count) : [];
  return rawQuestions.map((question, index) => {
    const item = question as Record<string, unknown>;
    const options = Array.isArray(item.options) ? item.options.map(String).slice(0, 4) : [];
    return {
      id: `q-${index + 1}`,
      prompt: String(item.prompt || "Review the source material."),
      type: item.type === "short_answer" ? "short_answer" : "multiple_choice",
      options,
      answer: String(item.answer || ""),
      explanation: String(item.explanation || "Review the cited source material."),
      citations: resolveCitations(item.citationChunkIds, selected),
    };
  });
}

export function checkAnswer(expected: string, submitted: string, options: string[]) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const answer = normalize(expected);
  const user = normalize(submitted);
  if (!user) return false;
  const optionIndex = options.findIndex(option => normalize(option) === answer);
  const letterMatch = optionIndex >= 0 && user === String.fromCharCode(97 + optionIndex);
  return user === answer || letterMatch || (answer.length > 8 && (user.includes(answer) || answer.includes(user)));
}

export type GradableQuizQuestion = {
  id: string;
  answer: string;
  options: string[];
  explanation: string;
  citations: Citation[];
};

export function gradeQuizAnswers(questions: GradableQuizQuestion[], answers: Record<string, string>) {
  const feedback = questions.map(question => {
    const submitted = answers[question.id] || "";
    const correct = checkAnswer(question.answer, submitted, question.options);
    return { questionId: question.id, correct, submitted, answer: question.answer, explanation: question.explanation, citations: question.citations };
  });
  return { score: feedback.filter(item => item.correct).length, feedback };
}

export type FlashcardScheduleState = {
  repetition: number;
  intervalDays: number;
  easeFactor: number;
};

export function scheduleFlashcardReview(current: FlashcardScheduleState | undefined, rating: "easy" | "hard" | "review_again", reviewedAt = new Date()) {
  const previous = current ?? { repetition: 0, intervalDays: 0, easeFactor: 250 };
  let repetition = previous.repetition;
  let intervalDays = previous.intervalDays;
  let easeFactor = previous.easeFactor;
  let dueAt: Date;

  if (rating === "review_again") {
    repetition = 0;
    intervalDays = 0;
    easeFactor = Math.max(130, easeFactor - 20);
    dueAt = new Date(reviewedAt.getTime() + 10 * 60 * 1000);
  } else if (rating === "hard") {
    repetition += 1;
    easeFactor = Math.max(130, easeFactor - 15);
    intervalDays = Math.max(1, previous.intervalDays ? Math.round(previous.intervalDays * 1.2) : 1);
    dueAt = new Date(reviewedAt.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  } else {
    repetition += 1;
    easeFactor = Math.min(300, easeFactor + 10);
    intervalDays = previous.intervalDays === 0 ? 1 : previous.intervalDays === 1 ? 4 : Math.max(5, Math.round(previous.intervalDays * (easeFactor / 100)));
    dueAt = new Date(reviewedAt.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  }
  return { repetition, intervalDays, easeFactor, dueAt, lastReviewedAt: reviewedAt };
}
