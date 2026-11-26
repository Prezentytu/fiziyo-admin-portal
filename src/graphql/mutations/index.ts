// Eksport wszystkich mutations

// Clinics
export * from './clinics.mutations';

// Exercises
export * from './exercises.mutations';

// Organizations
export * from './organizations.mutations';

// Therapists
export * from './therapists.mutations';

// Users
export * from './users.mutations';

// Revenue Share (Stripe Connect, zaproszenia pacjentów, kody partnerskie)
export * from './revenue.mutations';

// Billing (dane firmy do fakturowania)
export * from './billing.mutations';

// Admin Exercises (weryfikacja ćwiczeń - Centrum Weryfikacji)
export * from './adminExercises.mutations';

// Co nowego (wydania portalu z Ops)
export * from './releaseNotes.mutations';

// Zestaw na start (dla wszystkich pacjentów gabinetu, SPEC-066 w fizjo-app)
export * from './starterSets.mutations';
