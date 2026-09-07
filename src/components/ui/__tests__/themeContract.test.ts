import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { compile } from 'tailwindcss';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const stylesheet = postcss.parse(readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8'));

function declarations(selector: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  stylesheet.walkRules(selector, (rule) => {
    rule.walkDecls((declaration) => {
      tokens[declaration.prop] = declaration.value;
    });
  });
  return tokens;
}

function resolveToken(tokens: Record<string, string>, name: string): string {
  const value = tokens[`--${name}`];
  const alias = /^var\(--([\w-]+)\)$/.exec(value);
  return alias ? resolveToken(tokens, alias[1]) : value;
}

function luminance(hex: string): number {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error(`Expected a six-digit hex color: ${hex}`);
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

const textPairs = [
  ['foreground', 'background'],
  ['foreground', 'surface'],
  ['foreground', 'surface-light'],
  ['foreground', 'surface-hover'],
  ['foreground', 'surface-elevated'],
  ['foreground', 'input'],
  ['foreground', 'selection'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['accent-foreground', 'accent'],
  ['muted-foreground', 'muted'],
  ['muted-foreground', 'card'],
  ['text-secondary', 'background'],
  ['text-tertiary', 'background'],
  ['primary-foreground', 'primary'],
  ['primary-foreground', 'primary-dark'],
  ['primary', 'primary-muted'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['secondary-foreground', 'secondary'],
  ['secondary', 'secondary-muted'],
  ['violet-foreground', 'violet'],
  ['violet', 'violet-muted'],
  ['destructive-foreground', 'destructive'],
  ['destructive', 'background'],
  ['destructive', 'surface'],
  ...['success', 'error', 'warning', 'info'].flatMap((status) => [
    [status, `${status}-muted`],
    [status, 'background'],
    [status, 'surface'],
    [`${status}-foreground`, status],
  ]),
];

const themes = [
  { name: 'dark', selectors: [':root'], minimum: 4.5 },
  { name: 'light', selectors: [':root', '.light-theme'], minimum: 4.5 },
  { name: 'dark high contrast', selectors: [':root', '.dark-theme.high-contrast'], minimum: 7 },
  { name: 'light high contrast', selectors: [':root', '.light-theme', '.light-theme.high-contrast'], minimum: 7 },
];

describe('explicit theme CSS contract', () => {
  it('lets component focus styles replace the default outline without disabling the fallback', () => {
    const focusRules: postcss.Rule[] = [];
    stylesheet.walkRules(':focus-visible', (rule) => {
      focusRules.push(rule);
    });
    expect(focusRules).toHaveLength(1);
    expect(focusRules[0].parent).toMatchObject({ type: 'atrule', name: 'layer', params: 'base' });
    expect(declarations(':focus-visible').outline).toBe('2px solid var(--primary)');
    expect(declarations('.high-contrast :focus-visible').outline).toBe('3px solid var(--ring)');
  });

  it('keeps the default border in the base layer so state utilities can override it', () => {
    const borderRules: postcss.Rule[] = [];
    stylesheet.walkRules('*', (rule) => {
      rule.walkDecls('border-color', () => {
        borderRules.push(rule);
      });
    });
    expect(borderRules).toHaveLength(1);
    expect(borderRules[0].parent).toMatchObject({ type: 'atrule', name: 'layer', params: 'base' });
  });

  it.each([
    ['src/components/layout/MobileSidebar.tsx', 'bg-destructive', 'text-destructive-foreground'],
    ['src/features/exercises/ExerciseCard.tsx', 'bg-violet', 'text-violet-foreground'],
    ['src/features/verification/VerificationTaskCard.tsx', 'bg-info', 'text-info-foreground'],
    ['src/features/verification/VerificationTaskCard.tsx', 'bg-warning', 'text-warning-foreground'],
  ])('uses paired opaque status colors in %s (%s)', (file, background, foreground) => {
    const source = readFileSync(path.resolve(process.cwd(), file), 'utf8');
    const syntaxTree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const matchingClasses: string[][] = [];
    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const classes = node.text.split(/\s+/);
        if (classes.includes(background)) matchingClasses.push(classes);
      }
      ts.forEachChild(node, visit);
    }
    visit(syntaxTree);
    expect(matchingClasses.length).toBeGreaterThan(0);
    for (const classes of matchingClasses) expect(classes).toContain(foreground);
  });

  it('compiles dark utilities for the selected class, independently of the OS theme', async () => {
    const variants: string[] = [];
    stylesheet.walkAtRules('custom-variant', (rule) => {
      variants.push(`${rule.toString()};`);
    });

    const compiler = await compile(`
      @theme { --color-background: #ffffff; }
      ${variants.join('\n')}
      @tailwind utilities;
    `);
    const output = compiler.build(['dark:bg-background']);

    expect(output).toContain('&:where(.dark-theme, .dark-theme *)');
    expect(output).not.toContain('prefers-color-scheme');
  });

  it.each(themes)('keeps text and focus pairs readable in $name', ({ selectors, minimum }) => {
    const tokens = Object.assign({}, ...selectors.map(declarations)) as Record<string, string>;
    for (const [foreground, background] of textPairs) {
      expect(
        contrast(resolveToken(tokens, foreground), resolveToken(tokens, background)),
        `${foreground} on ${background}`
      ).toBeGreaterThanOrEqual(minimum);
    }
    for (const background of ['background', 'surface', 'card', 'input']) {
      expect(contrast(resolveToken(tokens, 'ring'), resolveToken(tokens, background))).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(['.light-theme.high-contrast', '.dark-theme.high-contrast'])(
    'overrides both sides of every high contrast pair in %s',
    (selector) => {
      const tokens = declarations(selector);
      for (const name of new Set(textPairs.flat())) {
        expect(tokens, name).toHaveProperty(`--${name}`);
      }
      expect(tokens).toHaveProperty('--ring');
      expect(tokens).toHaveProperty('--border');
    }
  );

  it('scopes native date controls and high contrast focus to the explicit preference', () => {
    expect(declarations('.dark-theme input[type="date"]')['color-scheme']).toBe('dark');
    expect(declarations('.light-theme input[type="date"]')['color-scheme']).toBe('light');
    expect(declarations(':not(.light-theme) input[type="date"]')).toEqual({});
    expect(declarations('.high-contrast :focus-visible').outline).toBe('3px solid var(--ring)');
  });
});

describe('contrast calculation', () => {
  it('uses the WCAG sRGB luminance ratio', () => {
    expect(contrast('#ffffff', '#000000')).toBe(21);
    expect(contrast('#26745d', '#26745d')).toBe(1);
  });
});
