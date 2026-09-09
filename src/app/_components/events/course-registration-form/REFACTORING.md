# Course Registration Form Refactoring

## Completed

- ✅ `types.ts` — shared types and interfaces
- ✅ `utils.ts` — utility functions (calculations, validation)
- ✅ `step-1-registrant-info.tsx` — Step 1
- ✅ `step-3-summary.tsx` — Step 3
- ✅ `participant-library-popup.tsx` — participant library popup
- ✅ `participant-card.tsx` — collapsed summary of one participant
- ✅ `participant-editor.tsx` — the field set of one participant
- ✅ `participant-sheet.tsx` — full-screen (mobile) / dialog (`sm:`+) frame
- ✅ `step-2-participants.tsx` — Step 2 orchestrator, now a list of cards

## Step 2 shape

Step 2 shows one `ParticipantCard` per participant and opens
`ParticipantEditor` inside `ParticipantSheet` on tap. Edits write straight
through to `registrationData`, so closing the sheet commits nothing extra and
there is no draft state to reconcile.

Validation is owned by the effect in `course-registration-form.tsx`, which
recomputes `validationErrors` and `missingFields` for every participant on each
change. The card reads them for its "Angaben fehlen" badge and the editor for
its per-field red borders — neither re-derives the rules.

`ParticipantCard` and `ParticipantEditor` take `priceOptions` + `customFields`
rather than a whole course, and a structural `ParticipantFields` participant, so
both the registration form (keyed by list index) and the edit page (keyed by
database id) can render them.

## Shared with the edit page

`src/app/registrations/[id]/edit/page.tsx` renders the same three components.
Its extras ride on props: `badge="Neu"` for unsaved participants, `canRemove`
for the last-one-must-stay rule, and `priceOptionField` for sold-out
categories. It computes its own `participantMissingFields` /
`participantError`, since it has no step-2 validation effect to read from.

## Remaining work

- The dashboard registration detail page shows participants read-only and could
  use `ParticipantCard` without an editor.
- `variant="modal"` on the registration form is unreachable — both call sites
  pass `variant="page"` — so the modal branch and the `stickyToolbar` /
  `headerHeight` plumbing it feeds could go.
