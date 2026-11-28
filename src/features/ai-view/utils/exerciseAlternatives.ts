import { exerciseReviewBadge, type ExerciseReviewFields } from './exerciseReviewBadge';
import { tokenizeWords, wordMatches } from './textMatch';

export interface AlternativeCandidate extends ExerciseReviewFields {
  id: string;
  name: string;
  mainTags?: Array<{ name?: string } | string>;
  additionalTags?: Array<{ name?: string } | string>;
  bodyPart?: string | null;
  region?: string | null;
  equipment?: string | null;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
}

const STOP_WORDS = new Set([
  'bez',
  'cwiczenie',
  'dla',
  'do',
  'jak',
  'jedna',
  'jednej',
  'jednym',
  'lewa',
  'lewej',
  'lewym',
  'lub',
  'nad',
  'na',
  'nie',
  'noga',
  'nogi',
  'obu',
  'od',
  'oraz',
  'po',
  'pod',
  'pozycja',
  'pozycji',
  'prawa',
  'prawej',
  'prawym',
  'przed',
  'przez',
  'przy',
  'reka',
  'reki',
  'strona',
  'strone',
  'strony',
  'w',
  'z',
  'za',
  'ze',
]);

// Kanoniczne grupy anatomiczne (rdzenie po normalizacji diakrytyków) — dopasowanie poziomu 2, gdy brak tagów.
const ANATOMICAL_REGIONS: ReadonlyArray<{ id: string; stems: readonly string[] }> = [
  {
    id: 'hip-glute',
    stems: ['biod', 'poslad', 'miednic', 'mostk', 'mostek', 'muszl', 'clamshell', 'odwodz', 'przywodz', 'gruszkow', 'zginacz'],
  },
  {
    id: 'knee-quad',
    stems: ['kolan', 'czworoglow', 'przysiad', 'wykrok', 'stopni', 'stopien', 'schodek', 'rzepk', 'kulszow', 'goleniow'],
  },
  {
    id: 'ankle-foot',
    stems: ['skokow', 'stop', 'lydk', 'piet', 'achilles', 'palc'],
  },
  {
    id: 'lumbar-core',
    stems: ['ledzwi', 'brzuch', 'tulowi', 'core', 'desk', 'plank', 'kregoslup', 'plec', 'bird', 'dead', 'koci', 'kot'],
  },
  {
    id: 'thoracic-scapula',
    stems: ['piersiow', 'lopatk', 'otwieran', 'rotacj'],
  },
  {
    id: 'shoulder',
    stems: ['bark', 'ramien', 'stozk', 'rotator', 'nadgrzebien', 'wznos'],
  },
  {
    id: 'cervical',
    stems: ['szyj', 'kark', 'glow', 'retrakcj', 'podbrodk', 'brod'],
  },
  {
    id: 'wrist-elbow',
    stems: ['nadgarst', 'lokci', 'przedram', 'dlon', 'chwyt'],
  },
  {
    id: 'breathing-pelvic',
    stems: ['oddech', 'przepon', 'dna', 'kegel', 'relaks'],
  },
];

const GOAL_FAMILIES: ReadonlyArray<{ id: string; stems: readonly string[] }> = [
  { id: 'mobility', stems: ['mobiliz', 'rozciag', 'stretch', 'otwier', 'elastycz', 'zakres'] },
  { id: 'strength', stems: ['wzmacn', 'sil', 'izometr', 'opor', 'most', 'przysiad', 'wykrok', 'unosz', 'wyprost'] },
  { id: 'stability', stems: ['stabiliz', 'rownowag', 'balans', 'propriocep', 'kontrol', 'core', 'desk', 'plank'] },
];

const POSITION_FAMILIES: ReadonlyArray<{ id: string; stems: readonly string[] }> = [
  { id: 'supine', stems: ['plec', 'tylem', 'lezeni'] },
  { id: 'prone', stems: ['brzuch', 'przodem'] },
  { id: 'side-lying', stems: ['bokiem', 'boku'] },
  { id: 'quadruped', stems: ['klek', 'czworak'] },
  { id: 'seated', stems: ['siad', 'siedz', 'krzesl'] },
  { id: 'standing', stems: ['stani', 'stojac', 'scian'] },
];

// Sprzęt specjalistyczny (zgodny z 3-klasowym podziałem SPEC-069: krzesło/ściana/poduszka/mata są domowe).
const SPECIALIZED_EQUIPMENT_PATTERNS = [
  /gum/i,
  /miniband/i,
  /ta[śs]m/i,
  /hantl/i,
  /kettle/i,
  /pi[łl]k/i,
  /pi[łl]eczk/i,
  /wa[łl]ek/i,
  /roller/i,
  /bosu/i,
  /\btrx\b/i,
  /ci[ęe][żz]ar/i,
  /obci[ąa][żz]nik/i,
  /odwa[żz]nik/i,
  /sztang/i,
  /dysk\s+senso/i,
  /poduszk\w*\s+senso/i,
  /beret/i,
  /klin\s+z\s+g[ąa]bk/i,
  /ekspander/i,
  /stepper/i,
];

function tagNames(tags: AlternativeCandidate['mainTags']): string[] {
  return (tags ?? [])
    .map((tag) => (typeof tag === 'string' ? tag : (tag.name ?? '')).trim().toLocaleLowerCase('pl-PL'))
    .filter(Boolean);
}

function meaningfulNameWords(name: string): string[] {
  return tokenizeWords(name).filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function combinedTokens(exercise: AlternativeCandidate): string[] {
  const parts = [
    exercise.name,
    exercise.bodyPart ?? '',
    exercise.region ?? '',
    ...tagNames(exercise.mainTags),
    ...tagNames(exercise.additionalTags),
    exercise.patientDescription ?? '',
    exercise.description ?? '',
    exercise.clinicalDescription ?? '',
  ];
  return tokenizeWords(parts.filter(Boolean).join(' '));
}

function matchFamilies(tokens: readonly string[], families: ReadonlyArray<{ id: string; stems: readonly string[] }>): Set<string> {
  const matched = new Set<string>();
  for (const family of families) {
    if (tokens.some((token) => family.stems.some((stem) => token.startsWith(stem)))) {
      matched.add(family.id);
    }
  }
  return matched;
}

function normalizedExplicitRegions(exercise: AlternativeCandidate): Set<string> {
  const regions = new Set<string>();
  for (const value of [exercise.bodyPart, exercise.region]) {
    const clean = value?.trim().toLocaleLowerCase('pl-PL');
    if (clean) regions.add(clean);
  }
  return regions;
}

export function requiresSpecializedEquipment(equipment: string | null | undefined): boolean {
  if (!equipment?.trim()) return false;
  return SPECIALIZED_EQUIPMENT_PATTERNS.some((pattern) => pattern.test(equipment));
}

function countOverlap(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function countSharedStems(sourceWords: readonly string[], candidateWords: readonly string[]): number {
  let shared = 0;
  for (const source of sourceWords) {
    if (candidateWords.some((candidate) => wordMatches(candidate, source))) {
      shared += 1;
    }
  }
  return shared;
}

/**
 * First keyword worth searching the server catalog with when the loaded picker page holds fewer than 3
 * local alternatives (SPEC-069 / W6). Uses the first main tag or the strongest anatomical/movement stem.
 */
export function alternativeSearchTerm(exercise: AlternativeCandidate): string | null {
  const firstTag = tagNames(exercise.mainTags)[0] ?? tagNames(exercise.additionalTags)[0];
  if (firstTag && firstTag.length >= 3) return firstTag;
  const explicitRegion = (exercise.bodyPart ?? exercise.region)?.trim();
  if (explicitRegion && explicitRegion.length >= 3) return explicitRegion;
  const words = meaningfulNameWords(exercise.name);
  if (words.length === 0) return null;
  const anatomical = words.find((word) =>
    ANATOMICAL_REGIONS.some((family) => family.stems.some((stem) => word.startsWith(stem)))
  );
  if (anatomical) return anatomical.slice(0, Math.min(anatomical.length, 6));
  const longest = [...words].sort((a, b) => b.length - a.length)[0];
  return longest && longest.length >= 4 ? longest.slice(0, Math.min(longest.length, 6)) : longest ?? null;
}

/**
 * 3-tier catalog alternatives for one row of a draft (SPEC-069 / W6):
 * 1. Shared main tags (×12) + additional tags (×4).
 * 2. Clinical attributes: shared body part / anatomical region, goal/position, equipment compatibility.
 * 3. Lexical name stem similarity (Polish inflection-tolerant).
 * Accepted exercises rank ahead of unverified/in-review ones within the same relevance tier.
 */
export function findAlternatives<T extends AlternativeCandidate>(
  exercise: AlternativeCandidate,
  pool: readonly T[],
  excludeIds: readonly string[],
  limit = 3
): T[] {
  const mainTags = new Set(tagNames(exercise.mainTags));
  const additionalTags = new Set(tagNames(exercise.additionalTags));
  const explicitRegions = normalizedExplicitRegions(exercise);
  const sourceTokens = combinedTokens(exercise);
  const sourceRegions = matchFamilies(sourceTokens, ANATOMICAL_REGIONS);
  const sourceGoals = matchFamilies(sourceTokens, GOAL_FAMILIES);
  const sourcePositions = matchFamilies(sourceTokens, POSITION_FAMILIES);
  const sourceNameWords = meaningfulNameWords(exercise.name);
  const sourceNeedsSpecialized = requiresSpecializedEquipment(exercise.equipment);

  if (
    mainTags.size === 0 &&
    additionalTags.size === 0 &&
    explicitRegions.size === 0 &&
    sourceRegions.size === 0 &&
    sourceNameWords.length === 0
  ) {
    return [];
  }

  const excluded = new Set([exercise.id, ...excludeIds]);
  return pool
    .filter((candidate) => !excluded.has(candidate.id))
    .map((candidate) => {
      // Poziom 1: tagi (najwyższa waga).
      const mainScore = tagNames(candidate.mainTags).filter((tag) => mainTags.has(tag)).length * 12;
      const additionalScore = tagNames(candidate.additionalTags).filter((tag) => additionalTags.has(tag)).length * 4;
      const tier1 = mainScore + additionalScore;

      // Poziom 2: atrybuty kliniczne (okolica ciała / grupa anatomiczna, cel, pozycja, zgodność sprzętu).
      const candidateExplicitRegions = normalizedExplicitRegions(candidate);
      const candidateTokens = combinedTokens(candidate);
      const explicitRegionHits = countOverlap(explicitRegions, candidateExplicitRegions);
      const inferredRegionHits = countOverlap(sourceRegions, matchFamilies(candidateTokens, ANATOMICAL_REGIONS));
      const regionScore = explicitRegionHits * 8 + inferredRegionHits * 6;

      // Poziom 3: podobieństwo leksykalne nazwy (rdzenie anatomiczne i ruchowe).
      const nameHits = countSharedStems(sourceNameWords, meaningfulNameWords(candidate.name));
      const tier3 = nameHits * 3;

      const baseRelevance = tier1 + regionScore + tier3;
      if (baseRelevance === 0) return { candidate, score: 0, verified: false };

      const goalBonus = countOverlap(sourceGoals, matchFamilies(candidateTokens, GOAL_FAMILIES)) > 0 ? 2 : 0;
      const positionBonus = countOverlap(sourcePositions, matchFamilies(candidateTokens, POSITION_FAMILIES)) > 0 ? 1 : 0;
      const candidateNeedsSpecialized = requiresSpecializedEquipment(candidate.equipment);
      const equipmentAdjustment = !sourceNeedsSpecialized
        ? candidateNeedsSpecialized
          ? -2
          : 1
        : 0;
      const verified = exerciseReviewBadge(candidate) === null;
      const verifiedBonus = verified ? 1.5 : 0;

      return {
        candidate,
        score: baseRelevance + goalBonus + positionBonus + equipmentAdjustment + verifiedBonus,
        verified,
      };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.verified) - Number(left.verified) ||
        left.candidate.name.localeCompare(right.candidate.name, 'pl')
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
