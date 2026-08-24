# Kevin AI Configuration

Kevin's server-side study generation currently prefers **`gpt-5-mini`** from the live built-in model catalog. It is used for grounded answers, summaries, flashcards, and structured quizzes. If that exact identifier is unavailable, Kevin selects another available GPT-5 family model. If the catalog cannot be reached temporarily, the request falls back to the platform's configured default model rather than exposing a client-side key or failing before a study request can be attempted.

All model calls occur only on the server. Source excerpts are selected before each request, structured JSON is validated before it is shown, and citations are filtered to the allowed source chunks for that request.
