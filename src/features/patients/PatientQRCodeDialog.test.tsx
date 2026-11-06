import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PatientQRCodeDialog } from './PatientQRCodeDialog';
import { PATIENT_START_URL } from '@/lib/patientJoinUrl';

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'clerk_therapist' } }),
}));

const queryState = vi.hoisted(() => ({ patientAssignments: [] as unknown[] }));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: {
      organizationById: { id: 'org-9', name: 'Gabinet Test' },
      userByClerkId: { id: 'th-2', fullname: 'Ada Terapeutka' },
      patientAssignments: queryState.patientAssignments,
    },
    loading: false,
  }),
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="patient-qr-svg" data-value={value} />,
  QRCodeCanvas: ({ value }: { value: string }) => <div data-testid="patient-qr-canvas" data-value={value} />,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@react-pdf/renderer', () => ({
  pdf: () => ({ toBlob: async () => new Blob() }),
  Font: { register: vi.fn() },
}));

vi.mock('@/components/pdf', () => ({
  ExerciseSetPDF: () => null,
  preloadPdfExerciseImages: vi.fn(async () => ({ total: 0, loaded: 0 })),
}));

const download = vi.hoisted(() => ({ clickDownloadLink: vi.fn() }));
vi.mock('@/lib/download', () => download);

const patient = { id: 'pat-1', name: 'Jan Testowy', email: 'jan@example.com' };

const MAPPINGS = [{ id: 'm-1', order: 1, sets: 3, reps: 10, exercise: { name: 'Przysiad', type: 'REPS' } }];

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a-1',
    status: 'assigned',
    exerciseSet: { id: 'set-1', name: 'Plan kolano', exerciseMappings: MAPPINGS },
    ...overrides,
  };
}

function renderDialog() {
  return render(
    <PatientQRCodeDialog open onOpenChange={vi.fn()} patient={patient} organizationId="org-9" therapistId="th-2" />
  );
}

describe('PatientQRCodeDialog QR payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.patientAssignments = [];
  });

  it('encodes patient+org+therapist connect URL when ids are known', () => {
    render(
      <PatientQRCodeDialog
        open
        onOpenChange={vi.fn()}
        patient={patient}
        organizationId="org-9"
        therapistId="th-2"
      />
    );

    const expected = 'https://fiziyo.pl/start?patient=pat-1&org=org-9&therapist=th-2';
    expect(screen.getByTestId('patient-qr-code')).toHaveAttribute('data-qr-url', expected);
    expect(screen.getByTestId('patient-qr-payload')).toHaveAttribute('data-qr-url', expected);
    expect(screen.getByTestId('patient-qr-canvas')).toHaveAttribute('data-value', expected);
    expect(screen.getByTestId('patient-qr-code').getAttribute('data-qr-url')).not.toBe(PATIENT_START_URL);
    expect(screen.queryByTestId('patient-qr-unavailable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('patient-qr-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('patient-qr-copy-btn')).toBeEnabled();
  });

  it('shows unavailable QR instead of a spinner when therapist is missing', () => {
    render(
      <PatientQRCodeDialog
        open
        onOpenChange={vi.fn()}
        patient={patient}
        organizationId="org-9"
        therapistId="  "
      />
    );

    expect(screen.queryByTestId('patient-qr-code')).not.toBeInTheDocument();
    expect(screen.queryByTestId('patient-qr-payload')).not.toBeInTheDocument();
    expect(screen.queryByTestId('patient-qr-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('patient-qr-unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('patient-qr-copy-btn')).toBeDisabled();
    expect(screen.getByTestId('patient-qr-download-btn')).toBeDisabled();
    expect(screen.getByTestId('patient-qr-share-btn')).toBeDisabled();
  });
});

describe('PatientQRCodeDialog karta pacjenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.patientAssignments = [];
  });

  it('bez planu „Personalizuj i przypisz” otwiera kreator przypisania', () => {
    const onCreatePlan = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <PatientQRCodeDialog
        open
        onOpenChange={onOpenChange}
        patient={patient}
        organizationId="org-9"
        therapistId="th-2"
        onCreatePlan={onCreatePlan}
      />
    );

    fireEvent.click(screen.getByTestId('patient-qr-create-plan-btn'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCreatePlan).toHaveBeenCalledTimes(1);
  });

  it('podgląd otwiera kartę od razu w geście kliknięcia', () => {
    queryState.patientAssignments = [assignment()];
    const pending = { document: { title: '', body: { textContent: '' } }, close: vi.fn(), closed: false };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(pending as unknown as Window);

    render(
      <PatientQRCodeDialog open onOpenChange={vi.fn()} patient={patient} organizationId="org-9" therapistId="th-2" />
    );

    fireEvent.click(screen.getByTestId('patient-qr-preview-btn'));
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    openSpy.mockRestore();
  });

  it('jedyny plan nieaktywny jest oznaczony także bez listy wyboru', () => {
    queryState.patientAssignments = [assignment({ status: 'completed' })];
    renderDialog();

    expect(screen.queryByTestId('patient-qr-plan-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('patient-qr-plan-inactive')).toBeInTheDocument();
  });

  it('plan z samymi ukrytymi ćwiczeniami nie drukuje pustej karty', () => {
    queryState.patientAssignments = [assignment({ exerciseOverrides: '{"m-1":{"hidden":true}}' })];
    renderDialog();

    expect(screen.getByTestId('patient-qr-plan-empty')).toBeInTheDocument();
    expect(screen.getByTestId('patient-qr-print-btn')).toBeDisabled();
    expect(screen.getByTestId('patient-qr-download-pdf-btn')).toBeDisabled();
    expect(screen.getByTestId('patient-qr-preview-btn')).toBeDisabled();
  });

  it('pobiera kartę wybranego planu z nazwą pliku z planu i imienia', async () => {
    queryState.patientAssignments = [assignment()];
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:karta');
    renderDialog();

    fireEvent.click(screen.getByTestId('patient-qr-download-pdf-btn'));

    await waitFor(() =>
      expect(download.clickDownloadLink).toHaveBeenCalledWith('blob:karta', 'Karta_Pacjenta_Plan_kolano_Jan.pdf')
    );
  });
});

describe('PatientQRCodeDialog konto pacjenta i udostępnianie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.patientAssignments = [];
  });

  it.each([
    [true, 'waiting', /Czeka na pierwsze logowanie/],
    [false, 'active', /Ma konto w aplikacji/],
  ])('isShadowUser=%s pokazuje stan konta %s', (isShadowUser, state, text) => {
    render(
      <PatientQRCodeDialog
        open
        onOpenChange={vi.fn()}
        patient={{ ...patient, isShadowUser }}
        organizationId="org-9"
        therapistId="th-2"
      />
    );

    const status = screen.getByTestId('patient-qr-account-status');
    expect(status).toHaveAttribute('data-state', state);
    expect(status).toHaveTextContent(text);
  });

  it('bez informacji o koncie nie zgaduje stanu', () => {
    renderDialog();
    expect(screen.queryByTestId('patient-qr-account-status')).not.toBeInTheDocument();
  });

  it('„Udostępnij link” wysyła wiadomość z nazwą gabinetu i wskazówką, czym założyć konto', async () => {
    const share = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    try {
      renderDialog();
      fireEvent.click(screen.getByTestId('patient-qr-share-btn'));

      await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://fiziyo.pl/start?patient=pat-1&org=org-9&therapist=th-2',
          text: expect.stringContaining('Gabinet Test'),
        })
      );
    } finally {
      Reflect.deleteProperty(navigator, 'share');
    }
  });
});
