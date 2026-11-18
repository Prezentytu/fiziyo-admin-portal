/** One line of field help: a short bold term followed by its explanation. */
export interface FieldHelpPoint {
  term?: string;
  text: string;
}

/**
 * Field help shown behind the "i" icon: one sentence that says what the field does,
 * optional points (bold term + short explanation) and an optional example.
 */
export interface FieldHelp {
  summary: string;
  points?: readonly FieldHelpPoint[];
  example?: string;
}

export type FieldHelpInput = FieldHelp | string;

export function toFieldHelp(help: FieldHelpInput): FieldHelp {
  return typeof help === 'string' ? { summary: help } : help;
}

/** Plain-text form for `title` attributes and accessible descriptions. */
export function fieldHelpToText(help: FieldHelpInput): string {
  const { summary, points = [], example } = toFieldHelp(help);
  const parts = [summary, ...points.map((point) => (point.term ? `${point.term}: ${point.text}` : point.text))];
  if (example) parts.push(`Przykład: ${example}`);
  return parts.join(' ');
}
