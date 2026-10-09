/**
 * Loads `@react-pdf/renderer` and the PDF document (with font registration) on demand,
 * so the ~1.5 MB renderer stays out of page bundles until a user actually generates a PDF.
 */
export async function loadPdfRenderer() {
  const [{ pdf }, { ExerciseSetPDF }] = await Promise.all([import('@react-pdf/renderer'), import('./index')]);
  return { pdf, ExerciseSetPDF };
}
