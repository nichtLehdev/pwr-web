# Course Registration Form Refactoring

## Completed
- ✅ Created `types.ts` - Shared types and interfaces
- ✅ Created `utils.ts` - Utility functions (calculations, validation)
- ✅ Created `step-1-registrant-info.tsx` - Step 1 component (~320 lines extracted)
- ✅ Updated main form to use Step 1 component

## Remaining Work

### Step 2: Participants (largest section, ~750 lines)
Needs to be broken into:
1. `participant-library-popup.tsx` - Participant library popup component
2. `participant-card.tsx` - Individual participant form component
3. `step-2-participants.tsx` - Main Step 2 orchestrator

### Step 3: Summary (~200 lines)
- `step-3-summary.tsx` - Step 3 component

### Main Form
- Update to use all extracted components
- Should be reduced to ~400-500 lines (orchestration only)
