import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const source = ts.createSourceFile(
  'AssignmentWizard.tsx',
  readFileSync(path.resolve(process.cwd(), 'src/features/assignment/AssignmentWizard.tsx'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

type OpeningElement = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

function findNodes<NodeType extends ts.Node>(
  root: ts.Node,
  predicate: (node: ts.Node) => node is NodeType
): NodeType[] {
  const matches: NodeType[] = [];
  function visit(node: ts.Node): void {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return matches;
}

function elements(root: ts.Node, tag?: string): OpeningElement[] {
  return findNodes(
    root,
    (node): node is OpeningElement => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)
  ).filter((node) => !tag || node.tagName.getText() === tag);
}

function attributes(element: OpeningElement): Record<string, string | true> {
  return Object.fromEntries(
    element.attributes.properties.filter(ts.isJsxAttribute).map((attribute) => {
      const initializer = attribute.initializer;
      const value = !initializer
        ? true
        : ts.isStringLiteral(initializer)
          ? initializer.text
          : ts.isJsxExpression(initializer)
            ? (initializer.expression?.getText() ?? '')
            : initializer.getText();
      return [attribute.name.getText(), value];
    })
  );
}

function byTestId(testId: string): OpeningElement {
  const matches = elements(source).filter((node) => attributes(node)['data-testid'] === testId);
  expect(matches, testId).toHaveLength(1);
  return matches[0];
}

function renderGuard(element: OpeningElement): string | undefined {
  for (let parent = element.parent; parent; parent = parent.parent) {
    if (ts.isJsxExpression(parent) && parent.expression && ts.isBinaryExpression(parent.expression)) {
      if (parent.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        return parent.expression.left.getText();
      }
    }
  }
}

function variable(name: string): ts.VariableDeclaration {
  const matches = findNodes(source, ts.isVariableDeclaration).filter((node) => node.name.getText() === name);
  expect(matches, name).toHaveLength(1);
  return matches[0];
}

describe('AssignmentWizard visual frame contract', () => {
  it('preserves close, Escape and outside-interaction handlers', () => {
    const closeActions = elements(source).filter(
      (node) => attributes(node)['data-testid'] === 'assign-wizard-close-btn'
    );
    expect(closeActions).toHaveLength(2);
    for (const action of closeActions) expect(attributes(action).onClick).toBe('onCloseAttempt');
    const dialog = byTestId('assign-wizard');
    expect(attributes(dialog).hideCloseButton).toBe(true);
    expect(attributes(dialog).onInteractOutside).toBe('(e) => e.preventDefault()');
    const calls = findNodes(dialog, ts.isCallExpression).map((call) => call.expression.getText());
    expect(calls).toEqual(['e.preventDefault', 'e.preventDefault', 'onCloseAttempt']);
  });

  it('keeps exactly one primary action with the original submit, next, back and disabled semantics', () => {
    const footer = elements(source, 'DialogFooter')[0].parent;
    const primary = elements(footer, 'Button').filter((node) => !attributes(node).variant);
    expect(primary).toHaveLength(1);
    expect(attributes(primary[0])).toMatchObject({
      onClick: 'isLastStep ? handleFinalSubmit : goNext',
      disabled: 'isLoading || !canProceed()',
      'data-testid': "isLastStep ? 'assign-summary-submit-btn' : 'assign-wizard-next-btn'",
    });
    const back = byTestId('assign-wizard-back-btn');
    expect(attributes(back).onClick).toBe('goBack');
    expect(renderGuard(back)).toBe('!isFirstStep');
    expect(variable('handleFinalSubmit').initializer?.getText()).toBe('isEditMode ? handleEditSubmit : handleSubmit');
  });

  it('retains dynamic steps, navigation guards and the compact indicator test IDs', () => {
    const steps = variable('steps');
    const stepCalls = findNodes(steps, ts.isCallExpression);
    expect(stepCalls.map((call) => call.expression.getText())).toEqual(['useMemo', 'getWizardSteps']);
    expect(stepCalls[1].arguments.map((argument) => argument.getText())).toEqual([
      'mode',
      '!!preselectedSet',
      '!!preselectedPatient',
      'isCreatingNewSet',
      'isEditMode',
    ]);
    const progress = byTestId('assign-wizard-step-indicator');
    expect(progress.tagName.getText()).toBe('nav');
    const step = byTestId('wizardstepindicator-button-79');
    expect(attributes(step)).toMatchObject({
      onClick: '() => canClick && goToStep(step.id)',
      disabled: '!canClick',
      title: 'step.label',
      'aria-current': "isCurrent ? 'step' : undefined",
    });
    expect(variable('canClick').initializer?.getText().replace(/\s+/g, ' ')).toBe(
      'completedSteps.size > 0 && (isCompleted || index < steps.findIndex((entry) => entry.id === currentStep))'
    );
  });

  it('preserves editable name and AI handlers without layout shifts on input focus', () => {
    expect(attributes(byTestId('wizard-plan-name-input'))).toMatchObject({
      value: 'planName',
      onChange: '(e) => setPlanName(e.target.value)',
      type: 'text',
    });
    const ai = byTestId('wizard-plan-name-ai-btn');
    expect(attributes(ai).disabled).toBe('isGeneratingName');
    expect(findNodes(ai, ts.isCallExpression).map((call) => call.expression.getText())).toEqual([
      'cn',
      'e.preventDefault',
      'handleGenerateAIName',
    ]);
    expect(attributes(elements(source, 'Pencil')[0]).className).toContain('peer-focus:invisible');
  });

  it('keeps schedule-only organization-copy visibility, state and all its test IDs', () => {
    const toggle = byTestId('assign-schedule-save-template-toggle');
    expect(renderGuard(toggle)).toBe("currentStep === 'schedule' && !isEditMode");
    expect(attributes(byTestId('assign-schedule-save-template-switch'))).toMatchObject({
      checked: 'saveAsOrganizationSet',
      onCheckedChange: 'setSaveAsOrganizationSet',
    });
    byTestId('assign-schedule-save-template-label');
    expect(attributes(elements(source, 'ScheduleSummary')[0])).toMatchObject({
      startDate: 'startDate',
      endDate: 'endDate',
      frequency: 'frequency',
      variant: 'compact',
      showSessions: 'false',
      showStartInDays: 'false',
      testIdPrefix: 'assign-wizard-header',
    });
    expect(renderGuard(elements(source, 'ScheduleSummary')[0])).toBe(
      "(currentStep === 'schedule' || currentStep === 'summary')"
    );
  });

  it('uses bounded viewport height, wrapping frame controls and visible patient identity', () => {
    expect(attributes(byTestId('assign-wizard')).className).toContain('100dvh');
    const header = elements(source, 'header')[0];
    expect(attributes(header).className).toContain('overflow-y-auto');
    const patient = byTestId('assign-wizard-patient-context');
    expect(renderGuard(patient)).toBe('selectedPatients.length > 0');
    expect(patient.parent.getText()).toContain('selectedPatients[0].name');
    expect(patient.parent.getText()).toContain('wrap-anywhere');
    expect(patient.parent.getText()).not.toContain('hidden sm:');
    const footer = elements(source, 'DialogFooter')[0];
    expect(attributes(footer).className).toContain('flex-row');
    expect(footer.parent.getText()).toContain('flex-wrap');
    const frameClasses = [...elements(header.parent), ...elements(footer.parent)]
      .map((node) => attributes(node).className ?? '')
      .join(' ');
    expect(frameClasses).not.toMatch(
      /bg-linear-|bg-gradient-|shadow-primary|backdrop-blur|tracking-wid|rounded-(?:xl|2xl|3xl)|text-\[10px\]|min-w-\[160px\]/
    );
  });
});
