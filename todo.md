# Project TODO

- [x] Define ownership-aware data models for subjects, materials, source chunks, conversations, flashcards, quizzes, attempts, and study activity.
- [x] Add database migrations and server-side authorization checks for every protected operation.
- [x] Create subject management, material upload, pasted-text intake, and durable document metadata storage.
- [x] Build bounded source-grounded retrieval for citations, questions, summaries, flashcards, and structured quizzes.
- [x] Persist generated study sets, conversations, quiz attempts, and progress for each signed-in student.
- [x] Select representative source chunks for summary, flashcard, and quiz generation before asking the AI model.
- [x] Test that every grounded AI output cites only the source chunks selected for its request.
- [x] Implement the responsive dashboard and subject workspace with clear empty, loading, error, and retry states.
- [x] Apply the dreamy lavender, blush, and mint editorial visual system with accessible contrast and focus states.
- [x] Add unit tests for authorization, document processing, grounded output validation, quiz scoring, and key user flows.
- [x] Verify the application through type checks, automated tests, and desktop/mobile visual review.
- [x] Add output-path tests confirming grounded answers, summaries, flashcards, and quizzes only return selected-source citations.
- [x] Add explicit retry controls for failed data loads and failed AI generation requests.
- [x] Audit custom interactions for visible keyboard focus treatment and reinforce accessible contrast.
- [x] Add protected-router, document processing, and full quiz scoring tests for the primary study flow.
- [x] Perform and document a contrast and keyboard-focus audit for custom interactive elements and pastel surfaces.
- [x] Create a final project checkpoint with the completed workspace.
