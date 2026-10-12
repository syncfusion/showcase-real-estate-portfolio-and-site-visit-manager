// A validation message goes under its field, not in the editor's own tooltip (placed for its default
// table layout, it covered the start of the input).
export const placeErrorUnderField = (input: HTMLElement, error: HTMLElement) => {
  error.classList.add('rep-field-error');
  input.closest('[data-editor-field]')?.appendChild(error);
};
