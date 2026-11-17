export function isItCallout(text: string) {
  return /\b(?:is|was) IT\b/i.test(text);
}
