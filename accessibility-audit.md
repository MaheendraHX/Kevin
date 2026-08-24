# Kevin Accessibility Audit

The interface uses a global two-pixel keyboard focus ring with a three-pixel offset for buttons, links, inputs, textareas, and explicit button-role controls. The audit script at `scripts/audit-accessibility.mjs` checks the key text-and-surface color pairs used by the light lavender, blush, and mint system as well as the dark theme against the 4.5:1 contrast target for ordinary text. The review also covers keyboard-visible custom cards, source chips, navigation controls, material actions, flashcard controls, quiz answer choices, and both theme toggles through the shared focus treatment.

The scripted check is part of the project verification workflow and should be re-run whenever theme tokens change.
