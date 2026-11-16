export interface SaveAssignmentOverridesOrRollbackInput {
  patientName: string;
  saveOverrides: () => Promise<unknown>;
  rollbackAssignment: () => Promise<unknown>;
}

/**
 * Przypisanie to łańcuch osobnych zapisów. Gdy padnie zapis personalizacji, plan zostałby
 * u pacjenta z ustawieniami katalogu, więc cofamy przypisanie i przerywamy cały zapis.
 */
export async function saveAssignmentOverridesOrRollback({
  patientName,
  saveOverrides,
  rollbackAssignment,
}: SaveAssignmentOverridesOrRollbackInput): Promise<void> {
  try {
    await saveOverrides();
  } catch (overrideError) {
    console.error('Błąd zapisu personalizacji ćwiczeń:', overrideError);
    try {
      await rollbackAssignment();
    } catch (rollbackError) {
      console.error('Błąd cofania przypisania po nieudanej personalizacji:', rollbackError);
      throw new Error(
        `Nie udało się zapisać personalizacji dla ${patientName}, a plan został przypisany z ustawieniami z katalogu. Odpisz plan ręcznie i spróbuj ponownie`
      );
    }
    throw new Error(
      `Nie udało się zapisać personalizacji dla ${patientName}. Plan nie został przypisany, spróbuj ponownie`
    );
  }
}
