import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssignmentSuccessDialog } from './AssignmentSuccessDialog';
import { PATIENT_START_URL } from '@/lib/patientJoinUrl';

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'clerk_therapist' } }),
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: {
      organizationById: { id: 'org-9', name: 'Gabinet Test' },
      userByClerkId: { id: 'th-2', fullname: 'Ada Terapeutka' },
    },
    loading: false,
  }),
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="assign-success-qr-svg" data-value={value} />,
  QRCodeCanvas: ({ value }: { value: string }) => <div data-testid="assign-success-qr-canvas" data-value={value} />,
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

vi.mock('@/components/shared', () => ({
  ScheduleSummary: () => null,
}));

const download = vi.hoisted(() => ({ clickDownloadLink: vi.fn() }));
vi.mock('@/lib/download', () => download);

const patients = [{ id: 'pat-1', name: 'Jan Testowy', email: 'jan@example.com' }];

describe('AssignmentSuccessDialog QR payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encodes patient+org+therapist connect URL when ids are known', () => {
    render(
      <AssignmentSuccessDialog
        open
        onOpenChange={vi.fn()}
        patients={patients}
        setName="Plan testowy"
        organizationId="org-9"
        therapistId="th-2"
      />
    );

    const expected = 'https://fiziyo.pl/start?patient=pat-1&org=org-9&therapist=th-2';
    expect(screen.getByTestId('assign-success-qr')).toHaveAttribute('data-qr-url', expected);
    expect(screen.getByTestId('assign-success-qr-payload')).toHaveAttribute('data-qr-url', expected);
    expect(screen.getByTestId('assign-success-qr-canvas')).toHaveAttribute('data-value', expected);
    expect(screen.getByTestId('assign-success-qr').getAttribute('data-qr-url')).not.toBe(PATIENT_START_URL);
    expect(screen.queryByTestId('assign-success-qr-unavailable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assign-success-qr-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('assign-success-copy-link-btn')).toBeEnabled();
  });

  it('shows send link and PDF without opening more options', () => {
    render(
      <AssignmentSuccessDialog
        open
        onOpenChange={vi.fn()}
        patients={patients}
        setName="Plan testowy"
        organizationId="org-9"
        therapistId="th-2"
      />
    );

    expect(screen.getByTestId('assign-success-share-btn')).toBeEnabled();
    expect(screen.getByTestId('assign-success-download-pdf-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('assign-success-download-qr-btn')).not.toBeInTheDocument();
  });

  it('shows unavailable QR instead of a spinner when therapist is missing', async () => {
    const user = userEvent.setup();
    render(
      <AssignmentSuccessDialog
        open
        onOpenChange={vi.fn()}
        patients={patients}
        setName="Plan testowy"
        organizationId="org-9"
      />
    );

    expect(screen.queryByTestId('assign-success-qr')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assign-success-qr-payload')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assign-success-qr-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('assign-success-qr-unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('assign-success-copy-link-btn')).toBeDisabled();

    expect(screen.getByTestId('assign-success-share-btn')).toBeDisabled();

    await user.click(screen.getByTestId('assign-success-more-options-trigger'));
    expect(screen.getByTestId('assign-success-download-qr-btn')).toBeDisabled();
  });

  it('pobiera kartę z nazwą planu z kreatora i imieniem pacjenta', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:karta');
    render(
      <AssignmentSuccessDialog
        open
        onOpenChange={vi.fn()}
        patients={patients}
        setName="Plan testowy"
        organizationId="org-9"
        therapistId="th-2"
        exerciseSet={{
          id: 'set-1',
          name: 'Zestaw',
          exerciseMappings: [{ id: 'm-1', exerciseId: 'e-1', order: 1, exercise: { id: 'e-1', name: 'Przysiad' } }],
        }}
      />
    );

    await user.click(screen.getByTestId('assign-success-download-pdf-btn'));

    await waitFor(() =>
      expect(download.clickDownloadLink).toHaveBeenCalledWith('blob:karta', 'Karta_Pacjenta_Plan_testowy_Jan.pdf')
    );
  });
});
