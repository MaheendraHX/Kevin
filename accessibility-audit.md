# Kevin Accessibility Audit

The interface uses a global two-pixel keyboard focus ring with a three-pixel offset for buttons, links, inputs, textareas, and explicit button-role controls. The audit script at `scripts/audit-accessibility.mjs` checks the key text-and-surface color pairs used by the lavender, blush, and mint design system against the 4.5:1 contrast target for ordinary text. The review also covers keyboard-visible custom cards, source chips, navigation controls, material actions, flashcard controls, and quiz answer choices through the shared focus treatment.

The scripted check is part of the project verification workflow and should be re-run whenever theme tokens change.
