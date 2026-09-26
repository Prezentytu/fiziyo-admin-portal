import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PatientQRCodeDialog } from './PatientQRCodeDialog';
import { PATIENT_START_URL } from '@/lib/patientJoinUrl';

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'clerk_therapist' } }),
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: {
      organizationById: { id: 'org-9', name: 'Gabinet Test' },
      userByClerkId: { id: 'th-2', fullname: 'Ada Terapeutka' },
      patientAssignments: [],
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
  resolvePdfExerciseImageUrl: vi.fn(() => undefined),
}));

const patient = { id: 'pat-1', name: 'Jan Testowy', email: 'jan@example.com' };

describe('PatientQRCodeDialog QR payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
