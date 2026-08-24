import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
  getInfo: vi.fn(),
  getText: vi.fn(),
  getScreenshot: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM, listLLMModels: mocks.listLLMModels }));
vi.mock("pdf-parse", () => ({
  PDFParse: class {
    getInfo = mocks.getInfo;
    getText = mocks.getText;
    getScreenshot = mocks.getScreenshot;
    destroy = mocks.destroy;
  },
}));

import { answerGroundedly, extractPdf, hasUsablePdfText, makeFlashcards, makeQuiz, makeSummary, ocrScannedPdfPages, selectRepresentativeSources, type SourceChunk } from "./study";

const sources: SourceChunk[] = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
  materialId: 1,
  materialTitle: "Lecture notes",
  pageNumber: index + 1,
  chunkIndex: index,
  content: `Concept topic${index + 1} includes a distinct explanation and supporting detail for student review. `.repeat(4),
}));

function citationIds(value: { citations: Array<{ chunkId: number }> } | Array<{ citations: Array<{ chunkId: number }> }>) {
  return Array.isArray(value) ? value.flatMap(item => item.citations.map(citation => citation.chunkId)) : value.citations.map(citation => citation.chunkId);
}

describe("grounded AI output boundaries", () => {
  beforeEach(() => {
    mocks.invokeLLM.mockReset(); mocks.listLLMModels.mockReset(); mocks.getInfo.mockReset(); mocks.getText.mockReset(); mocks.getScreenshot.mockReset(); mocks.destroy.mockReset();
    mocks.listLLMModels.mockResolvedValue({ data: [{ id: "gemini-3-flash-preview", object: "model", created: 0, owned_by: "google" }, { id: "gpt-5-mini", object: "model", created: 0, owned_by: "openai" }] });
    mocks.invokeLLM.mockImplementation(async (params: { response_format?: { json_schema: { name: string } } }) => {
      if (!params.response_format) return { choices: [{ message: { content: "Scanned page transcription with a readable definition and supporting context." } }] };
      const name = params.response_format.json_schema.name;
      const response = name === "grounded_answer" ? { answer: "A grounded answer.", citationChunkIds: [1, 999] }
        : name === "study_summary" ? { summary: "A grounded summary.", citationChunkIds: [1, 16, 999] }
        : name === "flashcard_set" ? { cards: [{ front: "What is topic one?", back: "A source-bound answer.", citationChunkIds: [1, 16, 999] }] }
        : { questions: [{ prompt: "What is topic one?", type: "multiple_choice", options: ["One", "Two"], answer: "One", explanation: "The source says so.", citationChunkIds: [1, 16, 999] }] };
      return { choices: [{ message: { content: JSON.stringify(response) } }] };
    });
  });

  it("keeps answer citations inside the retrieved question sources", async () => {
    const result = await answerGroundedly("What does topic1 explain?", sources);
    expect(citationIds(result).every(id => id === 1)).toBe(true);
  });

  it("keeps summaries, flashcards, and quizzes inside representative source selection", async () => {
    const selectedIds = new Set(selectRepresentativeSources(sources, 14).map(source => source.id));
    const [summary, cards, questions] = await Promise.all([makeSummary(sources), makeFlashcards(sources, 4), makeQuiz(sources, 3)]);
    [...citationIds(summary), ...citationIds(cards), ...citationIds(questions)].forEach(id => expect(selectedIds.has(id)).toBe(true));
  });

  it("honors the requested quiz difficulty without expanding beyond the selected sources", async () => {
    const selectedIds = new Set(selectRepresentativeSources(sources, 14).map(source => source.id));
    const questions = await makeQuiz(sources, 3, "challenging");
    expect(JSON.stringify(mocks.invokeLLM.mock.calls.at(-1)?.[0])).toContain("challenging");
    citationIds(questions).forEach(id => expect(selectedIds.has(id)).toBe(true));
  });

  it("extracts each available PDF page and cleans up the parser", async () => {
    mocks.getInfo.mockResolvedValue({ total: 2 });
    mocks.getText.mockImplementation(async ({ partial }: { partial: number[] }) => ({ text: `Page ${partial[0]} text` }));
    const result = await extractPdf(Buffer.from("pretend-pdf"));
    expect(result.pages).toEqual([{ pageNumber: 1, text: "Page 1 text" }, { pageNumber: 2, text: "Page 2 text" }]);
    expect(mocks.getText).toHaveBeenCalledTimes(2);
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });

  it("does not mistake short scan metadata for readable study text", () => {
    expect(hasUsablePdfText("TOC Module 2")).toBe(false);
    expect(hasUsablePdfText("A complete study explanation with enough meaningful source content to create a grounded chunk for later review.")).toBe(true);
  });

  it("uses a handwriting-aware vision model across every supplied scanned page", async () => {
    mocks.getScreenshot.mockResolvedValue({ pages: [{ dataUrl: "data:image/png;base64,scan" }] });
    const scannedPages = Array.from({ length: 13 }, (_, index) => index + 1);
    const result = await ocrScannedPdfPages(Buffer.from("pretend-pdf"), scannedPages);
    expect(result).toHaveLength(13);
    expect(result[0]).toMatchObject({ pageNumber: 1 });
    expect(mocks.getScreenshot).toHaveBeenCalledTimes(13);
    expect(mocks.invokeLLM.mock.calls.at(-1)?.[0]).toMatchObject({ model: "gemini-3-flash-preview", max_tokens: 2200 });
    expect(JSON.stringify(mocks.invokeLLM.mock.calls.at(-1)?.[0])).toContain("handwritten");
  });
});
