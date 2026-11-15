import { describe, expect, it, vi } from 'vitest';
import { saveAssignmentOverridesOrRollback } from '../saveAssignmentOverridesOrRollback';

describe('saveAssignmentOverridesOrRollback', () => {
  it('nie cofa przypisania, gdy personalizacja się zapisała', async () => {
    const rollbackAssignment = vi.fn().mockResolvedValue(undefined);

    await saveAssignmentOverridesOrRollback({
      patientName: 'Jan',
      saveOverrides: vi.fn().mockResolvedValue(undefined),
      rollbackAssignment,
    });

    expect(rollbackAssignment).not.toHaveBeenCalled();
  });

  it('cofa przypisanie i przerywa zapis, gdy personalizacja padła', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const rollbackAssignment = vi.fn().mockResolvedValue(undefined);

    await expect(
      saveAssignmentOverridesOrRollback({
        patientName: 'Jan',
        saveOverrides: vi.fn().mockRejectedValue(new Error('network')),
        rollbackAssignment,
      })
    ).rejects.toThrow('Plan nie został przypisany');

    expect(rollbackAssignment).toHaveBeenCalledTimes(1);
  });

  it('zgłasza, że plan został przypisany, gdy cofnięcie też padło', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      saveAssignmentOverridesOrRollback({
        patientName: 'Jan',
        saveOverrides: vi.fn().mockRejectedValue(new Error('network')),
        rollbackAssignment: vi.fn().mockRejectedValue(new Error('network')),
      })
    ).rejects.toThrow('Odpisz plan ręcznie');
  });
});
