# Feature Spec 14: Contact

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- Same sheet grammar as the home: 1px frame with plus marks, giant tight display heading, ruled grid, mono labels, one dense royal-accented illustration.
- A hairline form with labels, inline validation, a submit with the roll/fill button and a success state replacing the form.

## Measured facts (from the reference)
- No dedicated page in the corpus: the model is the reference's page template (pricing-style page, shots/pricing-top) plus the site-wide grammar in reference-map.md. Recorded as derived, not measured.

## States and motion
- Form idle, focus, error, submitting, success, network error; reveals; reduced motion static.

## Responsive and theme
- Composed stacked sections, no scaled desktop.
- RTL and light/dark parity checked 320 to 1920.

## Content that may differ (the 1%)
All copy ULARA Arabic.

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Success state?
  A: Swap in place as the reference w-form success state (REFERENCE.md section 8).
