import type { ExerciseSourceFilter } from './exerciseSourceFilter';

export interface CatalogEmptyCopy {
  title: string;
  description: string;
  showBrowseCatalog: boolean;
  showCreate: boolean;
  showImport: boolean;
}

export function resolveCatalogEmptyCopy(input: {
  sourceFilter: ExerciseSourceFilter;
  isSearch: boolean;
  fiziyoCount: number;
  ownCount: number;
}): CatalogEmptyCopy {
  if (input.isSearch) {
    return {
      title: 'Nie znaleziono ćwiczeń',
      description: 'Spróbuj zmienić kryteria wyszukiwania.',
      showBrowseCatalog: false,
      showCreate: false,
      showImport: false,
    };
  }

  if (input.sourceFilter === 'fiziyo') {
    return {
      title: 'Katalog FiziYo jest pusty',
      description: 'Nie ma jeszcze opublikowanych ćwiczeń FiziYo. Utwórz własne albo zaimportuj paczkę.',
      showBrowseCatalog: false,
      showCreate: true,
      showImport: true,
    };
  }

  if (input.sourceFilter === 'organization' && input.fiziyoCount > 0) {
    return {
      title: 'Nie masz jeszcze własnych ćwiczeń',
      description: 'Przeglądaj katalog FiziYo albo utwórz pierwsze ćwiczenie gabinetu.',
      showBrowseCatalog: true,
      showCreate: true,
      showImport: true,
    };
  }

  return {
    title: 'Biblioteka ćwiczeń jest pusta',
    description: 'Przeglądaj katalog FiziYo, utwórz ćwiczenie albo zaimportuj paczkę.',
    showBrowseCatalog: input.fiziyoCount > 0,
    showCreate: true,
    showImport: true,
  };
}
