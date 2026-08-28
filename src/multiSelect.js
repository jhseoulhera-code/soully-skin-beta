// Pure helper for a capped multi-select question (currently only
// questionsV1.js's q48). Extracted out of App.jsx's chooseMulti so the
// "never exceed max" rule is unit-testable without mounting React — see
// scripts/testSkinV1.mjs.
//
// `current` is the array of already-picked option indices, `index` is the
// option just clicked, `max` is optional (undefined/null/0 = uncapped,
// preserving the exact pre-cap behavior every existing v4.0 multi_select
// call site already had — no current v4.0 question sets multiSelectMax, so
// this is a no-op for them).
export function applyMultiSelect(current, index, max) {
  const picked = Array.isArray(current) ? current : []
  const isSelected = picked.includes(index)
  if (!isSelected && max && picked.length >= max) return picked
  return isSelected ? picked.filter(x => x !== index) : [...picked, index]
}
