import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const source = ts.createSourceFile(
  'PatientsPage.tsx',
  readFileSync(path.resolve(process.cwd(), 'src/features/patients/PatientsPage.tsx'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
type Element = ts.JsxOpeningElement | ts.JsxSelfClosingElement;
const elements: Element[] = [];
function visit(node: ts.Node): void {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) elements.push(node);
  ts.forEachChild(node, visit);
}
visit(source);
function props(element: Element): Record<string, string> {
  return Object.fromEntries(
    element.attributes.properties.filter(ts.isJsxAttribute).map((attribute) => {
      const initializer = attribute.initializer;
      return [
        attribute.name.getText(),
        initializer && ts.isStringLiteral(initializer)
          ? initializer.text
          : initializer && ts.isJsxExpression(initializer)
            ? (initializer.expression?.getText() ?? '')
            : '',
      ];
    })
  );
}
function component(tag: string): Element {
  const element = elements.find((node) => node.tagName.getText() === tag);
  if (!element) throw new Error(`Missing ${tag}`);
  return element;
}

describe('patient list workspace', () => {
  it('keeps creation in the header using a compact shared action', () => {
    expect(props(component('PageHeader')).actions).toContain('<PageHero');
    expect(props(component('PageHero'))).toMatchObject({
      variant: 'toolbar',
      testId: 'patient-create-btn',
      disabled: '!organizationId',
      onClick: '() => setIsDialogOpen(true)',
    });
  });
  it('preserves search and all four filter actions and counts', () => {
    expect(props(component('SearchInput'))).toMatchObject({
      value: 'searchQuery',
      onChange: 'setSearchQuery',
      testId: 'patient-search-input',
    });
    const filters = props(component('StatTiles'));
    expect(filters.variant).toBe('filters');
    for (const [filter, count, testId] of [
      ['my', 'myCount', 'my'],
      ['all', 'totalCount', 'all'],
      ['needs_attention', 'needsAttentionCount', 'attention'],
      ['subscription', 'subscriptionIssueCount', 'subscription'],
    ]) {
      expect(filters.tiles).toContain(`setPatientFilter('${filter}')`);
      expect(filters.tiles).toContain(`value: ${count}`);
      expect(filters.tiles).toContain(`patient-filter-${testId}-btn`);
    }
  });
  it('retains clinical cards and list states without a framed empty section', () => {
    expect(props(component('PatientExpandableCard'))).toMatchObject({
      patient: 'patient',
      onAssignSet: 'handleAssignSet',
      onShowQR: 'handleShowQR',
    });
    expect(component('ListSkeleton')).toBeDefined();
    expect(component('EmptyState')).toBeDefined();
    expect(elements.some((node) => node.tagName.getText() === 'Card')).toBe(false);
  });
});
