import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GeneratePDFDialog } from './GeneratePDFDialog';
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
  QRCodeCanvas: ({ value }: { value: string }) => <div data-testid="set-pdf-qr-canvas" data-value={value} />,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@react-pdf/renderer', () => ({
  pdf: () => ({ toBlob: async () => new Blob() }),
  Font: { register: vi.fn() },
}));

vi.mock('@/components/pdf', () => ({
  ExerciseSetPDF: () => null,
  formatExercises: (count: number) => `${count} ćwiczeń`,
  preloadPdfExerciseImages: vi.fn(async () => ({ total: 0, loaded: 0 })),
  resolvePdfExerciseImageUrl: vi.fn(() => undefined),
}));

vi.mock('@/components/pdf/pdfImagePreloader', () => ({
  preloadPdfImages: vi.fn(async () => new Map()),
}));

const baseSet = {
  id: 'set-1',
  name: 'Plan testowy',
  exerciseMappings: [],
};

describe('GeneratePDFDialog QR payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encodes patient+org+therapist connect URL when ids are known', () => {
    render(
      <GeneratePDFDialog
        open
        onOpenChange={vi.fn()}
        exerciseSet={baseSet}
        organizationId="org-9"
        therapistId="th-2"
        patient={{ id: 'pat-1', name: 'Jan Testowy', email: 'jan@example.com' }}
      />
    );

    const payload = screen.getByTestId('set-pdf-qr-payload');
    expect(payload).toHaveAttribute(
      'data-qr-url',
      'https://fiziyo.pl/start?patient=pat-1&org=org-9&therapist=th-2'
    );
    expect(screen.getByTestId('set-pdf-qr-canvas')).toHaveAttribute(
      'data-value',
      'https://fiziyo.pl/start?patient=pat-1&org=org-9&therapist=th-2'
    );
    expect(payload.getAttribute('data-qr-url')).not.toBe(PATIENT_START_URL);
    expect(screen.queryByTestId('set-pdf-qr-unavailable')).not.toBeInTheDocument();
  });

  it('does not render a connect QR without patient id', () => {
    render(
      <GeneratePDFDialog
        open
        onOpenChange={vi.fn()}
        exerciseSet={baseSet}
        organizationId="org-9"
        therapistId="th-2"
      />
    );

    expect(screen.queryByTestId('set-pdf-qr-payload')).not.toBeInTheDocument();
    expect(screen.getByTestId('set-pdf-qr-unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('set-pdf-show-qr')).toBeDisabled();
  });
});
