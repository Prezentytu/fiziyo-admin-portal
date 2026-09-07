import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function loadSource(relativePath: string): ts.SourceFile {
  return ts.createSourceFile(
    relativePath,
    readFileSync(path.resolve(relativePath), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
}

function findElement(source: ts.SourceFile, name: string): ts.JsxElement {
  let match: ts.JsxElement | undefined;
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === name) match = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!match) throw new Error(`Missing ${name}`);
  return match;
}

function childNames(element: ts.JsxElement, source: ts.SourceFile): string[] {
  return element.children.flatMap((child) => {
    if (ts.isJsxElement(child)) return child.openingElement.tagName.getText(source);
    if (ts.isJsxSelfClosingElement(child)) return child.tagName.getText(source);
    return [];
  });
}

describe('preview integration boundaries', () => {
  it('keeps Apollo and toast siblings inside one unconditional preview provider under accessibility', () => {
    const source = loadSource('src/app/layout.tsx');
    expect(childNames(findElement(source, 'AccessibilityProvider'), source)).toEqual(['DesignVariantProvider']);
    expect(childNames(findElement(source, 'DesignVariantProvider'), source)).toEqual(['ApolloWrapper', 'Toaster']);
    const provider = findElement(source, 'DesignVariantProvider');
    expect(provider.openingElement.attributes.properties).toHaveLength(0);
  });

  it('retains the existing shell provider order without variant keys or conditional owners', () => {
    const source = loadSource('src/components/layout/DashboardShell.tsx');
    expect(childNames(findElement(source, 'OrganizationGuard'), source)).toEqual(['ErrorBoundary']);
    expect(childNames(findElement(source, 'ErrorBoundary'), source)).toEqual(['OrganizationProvider']);
    expect(childNames(findElement(source, 'OrganizationProvider'), source)).toEqual(['CurrentUserProvider']);
    expect(childNames(findElement(source, 'CurrentUserProvider'), source)).toEqual(['ExerciseBuilderProvider']);
    expect(childNames(findElement(source, 'ExerciseBuilderProvider'), source)).toEqual(['div']);
  });

  it.each(readdirSync(path.resolve('src/redesign/styles')).filter((file) => file.endsWith('.css')))(
    'requires variant AND explicit surface for every selector in %s',
    (file) => {
      const stylesheet = postcss.parse(readFileSync(path.resolve('src/redesign/styles', file), 'utf8'));
      stylesheet.walkRules((rule) => {
        for (const selector of rule.selectors) {
          expect(selector).toMatch(/^html\[data-fiziyo-design=(['"])redesign\1\]/);
          expect(selector).toContain('[data-redesign-surface=');
        }
      });
      stylesheet.walkDecls((declaration) => {
        if (declaration.prop.startsWith('--')) expect(declaration.prop).toMatch(/^--redesign-/);
      });
    }
  );
});
