import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function parseSource(filename: string): ts.SourceFile {
  return ts.createSourceFile(
    filename,
    readFileSync(path.resolve(process.cwd(), 'src/features/patients', filename), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
}

const page = parseSource('PatientDetailPage.tsx');
const skeleton = parseSource('PatientDetailSkeleton.tsx');
const assignmentCard = parseSource('PatientAssignmentCard.tsx');
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
  const matches = elements(page).filter((node) => {
    const props = attributes(node);
    return props['data-testid'] === testId || props.testId === testId;
  });
  expect(matches, testId).toHaveLength(1);
  return matches[0];
}

function calls(element: OpeningElement): string[][] {
  return findNodes(element, ts.isCallExpression).map((call) => [
    call.expression.getText(),
    ...call.arguments.map((argument) => argument.getText()),
  ]);
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

describe('PatientDetailPage visual contract', () => {
  it('lets plan names and schedules use separate rows without truncating the title', () => {
    const title = elements(assignmentCard, 'p').find((element) =>
      element.parent.getText().includes("exerciseSet?.name || 'Nieznany zestaw'")
    );
    expect(title).toBeDefined();
    expect(attributes(title!).className).toContain('wrap-anywhere');
    expect(attributes(title!).className).not.toContain('truncate');
    const summary = elements(assignmentCard, 'ScheduleSummary')[0];
    expect(attributes(summary).className).toContain('col-span-full');
    expect(attributes(summary).testIdPrefix).toBe('`patient-assignment-${assignment.id}`');
  });

  it('uses the default shared page width for profile, error and loading states', () => {
    const shells = [...elements(page, 'PageShell'), ...elements(skeleton, 'PageShell')];
    expect(shells).toHaveLength(3);
    for (const shell of shells) expect(attributes(shell)).toEqual({});
    const loading = elements(skeleton).find((node) => attributes(node)['aria-busy'] === 'true');
    expect(loading).toBeDefined();
  });

  it('keeps all existing identity, contact, menu and action test IDs', () => {
    for (const testId of [
      'patient-detail-back-btn',
      'patient-detail-name',
      'patient-patient-detail-page-btn-415',
      'patient-patient-detail-page-btn-424',
      'patient-detail-menu-trigger',
      'patient-detail-qr-btn',
      'patient-detail-settings-btn',
      'patient-detail-assign-btn',
      'patient-detail-qr-btn-hero',
    ]) {
      byTestId(testId);
    }
  });

  it('keeps assignment as a compact shared action and clears visit context before opening', () => {
    const action = byTestId('patient-detail-assign-btn');
    expect(elements(page, 'PageHero')).toEqual([action]);
    expect(attributes(action).variant).toBe('toolbar');
    expect(attributes(action).disabled).toBe('!organizationId || !therapistId');
    expect(calls(action)).toEqual([
      ['setVisitExercises', 'undefined'],
      ['setIsAssignDialogOpen', 'true'],
    ]);
  });

  it('groups patient actions in the identity header and reserves a full-height section heading', () => {
    const header = elements(page, 'header')[0];
    expect(elements(header.parent)).toContain(byTestId('patient-detail-assign-btn'));
    expect(elements(header.parent)).toContain(byTestId('patient-detail-qr-btn-hero'));
    expect(attributes(header).className).toContain('xl:grid-cols-[auto_minmax(0,1fr)_auto_auto]');
    const heading = elements(page, 'h2').find(
      (element) => attributes(element).id === 'patient-detail-assignments-heading'
    );
    expect(heading).toBeDefined();
    expect(attributes(heading!).className).toContain('min-h-11');
  });

  it('keeps the secondary QR button and QR menu entry wired to the existing dialog', () => {
    const action = byTestId('patient-detail-qr-btn-hero');
    expect(action.tagName.getText()).toBe('Button');
    expect(attributes(action)).toMatchObject({ variant: 'outline', disabled: '!organizationId || !therapistId' });
    expect(calls(action)).toEqual([['setIsQRCodeDialogOpen', 'true']]);
    expect(calls(byTestId('patient-detail-qr-btn'))).toEqual([['setIsQRCodeDialogOpen', 'true']]);
    expect(renderGuard(elements(page, 'PatientQRCodeDialog')[0])).toBe('organizationId && therapistId');
  });

  it('preserves navigation, settings and conditional contact links while allowing long text to wrap', () => {
    expect(calls(byTestId('patient-detail-back-btn'))).toEqual([['router.push', "'/patients'"]]);
    expect(calls(byTestId('patient-detail-settings-btn'))).toEqual([['setIsEditPatientOpen', 'true']]);
    for (const [testId, guard, href] of [
      ['patient-patient-detail-page-btn-415', 'patient.email', '`mailto:${patient.email}`'],
      ['patient-patient-detail-page-btn-424', 'patient.contactData?.phone', '`tel:${patient.contactData.phone}`'],
    ]) {
      const link = byTestId(testId);
      expect(attributes(link).href).toBe(href);
      expect(renderGuard(link)).toBe(guard);
      expect(attributes(link).className).toContain('focus-visible:ring-2');
    }
    const name = byTestId('patient-detail-name');
    expect(attributes(name).className).toContain('wrap-anywhere');
    expect(attributes(name).className).not.toContain('truncate');
    expect(attributes(elements(page, 'header')[0]).className).toContain('minmax(0,1fr)');
  });

  it('uses shared statistics with the existing computed values', () => {
    const stats = elements(page, 'StatTiles');
    expect(stats).toHaveLength(1);
    expect(attributes(stats[0]).variant).toBe('summary');
    const tiles = findNodes(stats[0], ts.isObjectLiteralExpression).map((tile) =>
      Object.fromEntries(
        tile.properties
          .filter(ts.isPropertyAssignment)
          .map((property) => [
            property.name.getText(),
            ts.isStringLiteral(property.initializer) ? property.initializer.text : property.initializer.getText(),
          ])
      )
    );
    expect(tiles).toEqual([
      { id: 'active-sets', label: 'Aktywne plany', value: 'activeAssignments.length' },
      { id: 'completions', label: 'Wykona\u0144 \u0142\u0105cznie', value: 'totalCompletions' },
    ]);
  });

  it('keeps plans and activity in labelled unframed sections without local decorative effects', () => {
    expect(elements(page, 'Card')).toHaveLength(0);
    for (const section of elements(page, 'section')) {
      expect(attributes(section).className).not.toMatch(/\bbg-|\bshadow-|\brounded-|\bborder-/);
      const headingId = attributes(section)['aria-labelledby'];
      expect(elements(section.parent, 'h2').some((heading) => attributes(heading).id === headingId)).toBe(true);
    }
    expect(elements(page, 'section')).toHaveLength(2);
    for (const source of [page, skeleton]) {
      const strings = findNodes(source, ts.isStringLiteral).map((literal) => literal.text);
      expect(strings.join(' ')).not.toMatch(
        /(?:bg-linear-|bg-gradient-|blur-3xl|scale-|animate-stagger|\btext-white\b|\bbg-white)/
      );
    }
  });

  it('keeps workspace panels mounted and recording reachable outside the visit tab', () => {
    expect(attributes(elements(page, 'Tabs')[0])).toMatchObject({ value: 'activeTab', onValueChange: 'setActiveTab' });
    expect(attributes(elements(page, 'TabsList')[0])).toMatchObject({
      variant: 'underline',
      'aria-label': 'Widok pacjenta',
    });
    const panels = elements(page, 'TabsContent');
    expect(panels.map((panel) => attributes(panel).value)).toEqual(['overview', 'activity', 'visit']);
    for (const panel of panels) {
      expect(attributes(panel).forceMount).toBe(true);
      expect(attributes(panel).className).toContain('data-[state=inactive]:hidden');
    }
    expect(attributes(elements(page, 'VisitPanel')[0]).onListeningChange).toBe('setIsVisitListening');
    const recordingAction = byTestId('patient-detail-listening-btn');
    expect(calls(recordingAction)).toEqual([['setActiveTab', "'visit'"]]);
    expect(renderGuard(recordingAction)).toBe('isVisitListening && organizationId && therapistId');
    expect(elements(elements(page, 'Tabs')[0].parent, 'Button')).not.toContain(recordingAction);
    for (const trigger of elements(page, 'TabsTrigger')) expect(attributes(trigger).activeVariant).toBe('underline');
  });

  it('preserves plan card inputs, clinical callbacks and premium context', () => {
    expect(attributes(elements(page, 'PatientAssignmentCard')[0])).toMatchObject({
      key: 'assignment.id',
      assignment: 'assignment',
      patientId: 'id',
      patientPremiumValidUntil: 'patientPremiumValidUntil',
      onEditPlan: 'handleEditPlan',
      onEditExercise: 'handleEditExercise',
      onPreviewExercise: 'handlePreviewExercise',
      onAddExercise: 'handleAddExerciseToAssignment',
      onExtend: 'handleExtend',
      onGeneratePDF: 'handleGeneratePDF',
    });
    expect(calls(elements(page, 'PatientAssignmentCard')[0])).toContainEqual([
      'initiateActivation',
      'patient.id',
      'displayName',
      'patientPremiumValidUntil',
    ]);
    expect(attributes(elements(page, 'ActivityReport')[0])).toMatchObject({
      patientId: 'id',
      patientName: 'displayName',
      heatmapDays: '21',
      journalDays: '3',
      onCall: 'therapyActions.handleCall',
      onEditPlan: 'therapyActions.handleEditPlan',
      onSendMessage: 'therapyActions.handleSendMessage',
      onSendPraise: 'therapyActions.handleSendPraise',
    });
    expect(renderGuard(elements(page, 'ClinicalNotesList')[0])).toBe('therapistId && organizationId');
    expect(renderGuard(elements(page, 'PatientJournalNotes')[0])).toBe('therapistId && organizationId');
    expect(renderGuard(elements(page, 'VisitPanel')[0])).toBe('organizationId && therapistId');
    expect(renderGuard(elements(page, 'PremiumStatusBadge')[0])).toBe('organizationId');
  });

  it('retains create and edit wizard authorization, patient prefill and assignment parameters', () => {
    const wizards = elements(page, 'AssignmentWizard');
    expect(wizards).toHaveLength(2);
    expect(renderGuard(wizards[0])).toBe('organizationId && therapistId && patient');
    expect(renderGuard(wizards[1])).toBe('organizationId && therapistId && editingAssignmentInput');
    for (const wizard of wizards) {
      expect(attributes(wizard)).toMatchObject({
        mode: 'from-patient',
        preselectedPatient: 'assignmentWizardPatient',
        organizationId: 'organizationId',
        therapistId: 'therapistId',
      });
    }
    expect(attributes(wizards[0])).toMatchObject({ visitExercises: 'visitExercises', open: 'isAssignDialogOpen' });
    expect(attributes(wizards[1])).toMatchObject({ editMode: true, initialAssignment: 'editingAssignmentInput' });
  });
});
