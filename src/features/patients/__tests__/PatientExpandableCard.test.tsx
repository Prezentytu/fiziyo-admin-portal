import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientExpandableCard, type Patient } from '../PatientExpandableCard';

const state = vi.hoisted(() => ({ push: vi.fn(), canManageTeam: false }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@/hooks/useRoleAccess', () => ({ useRoleAccess: () => ({ canManageTeam: state.canManageTeam }) }));
vi.mock('@/hooks/usePatientPremium', () => ({ usePatientPremium: () => ({}) }));
vi.mock('../EditContextLabelDialog', () => ({ EditContextLabelDialog: () => null }));
vi.mock('../EditPatientDialog', () => ({ EditPatientDialog: () => null }));
vi.mock('../ActivatePremiumDialog', () => ({ ActivatePremiumDialog: () => null }));
vi.mock('../PremiumStatusBadge', () => ({ PremiumStatusBadge: () => <span>Premium</span> }));
vi.mock('../TherapistBadge', () => ({ TherapistBadge: () => null }));

const patient: Patient = { id: 'patient-1', fullname: 'Test Patient', therapist: { id: 'therapist-1' } };

function renderCard(currentPatient = patient) {
  const handlers = {
    onAssignSet: vi.fn(), onShowQR: vi.fn(), onUnassign: vi.fn(),
    onRemoveFromOrganization: vi.fn(), onTakeOver: vi.fn(),
  };
  render(<PatientExpandableCard patient={currentPatient} organizationId="org-1" therapistId="therapist-1" {...handlers} />);
  return handlers;
}

describe('PatientExpandableCard interactions', () => {
  beforeEach(() => { vi.clearAllMocks(); state.canManageTeam = false; });

  it('offers a real profile link and preserves background navigation', async () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'Test Patient' })).toHaveAttribute('href', '/patients/patient-1');
    expect(screen.getByTestId('patient-expandable-patient-1')).toHaveAttribute('role', 'group');
    await userEvent.click(screen.getByTestId('patient-expandable-patient-1'));
    expect(state.push).toHaveBeenCalledWith('/patients/patient-1');
  });

  it('activates assignment and QR with the keyboard without navigating', async () => {
    const handlers = renderCard();
    screen.getByTestId('patient-expandable-patient-1-assign-btn').focus();
    await userEvent.keyboard('{Enter}');
    expect(handlers.onAssignSet).toHaveBeenCalledExactlyOnceWith(patient);
    screen.getByRole('button', { name: 'Pokaż zalecenia (QR)' }).focus();
    await userEvent.keyboard(' ');
    expect(handlers.onShowQR).toHaveBeenCalledExactlyOnceWith(patient);
    expect(state.push).not.toHaveBeenCalled();
  });

  it('keeps takeover and management visibility unchanged for another therapist', async () => {
    const otherPatient = { ...patient, therapist: { id: 'therapist-2' } };
    const handlers = renderCard(otherPatient);
    expect(screen.queryByTestId('patient-expandable-patient-1-assign-btn')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Przejmij opiekę' }));
    expect(handlers.onTakeOver).toHaveBeenCalledExactlyOnceWith(otherPatient);
    await userEvent.click(screen.getByRole('button', { name: 'Opcje pacjenta' }));
    expect(screen.queryByRole('menuitem', { name: 'Usuń z organizacji' })).not.toBeInTheDocument();
    expect(state.push).not.toHaveBeenCalled();
  });
});