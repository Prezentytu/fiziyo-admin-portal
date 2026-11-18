import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';

/**
 * Questions under a set proposal or exercise results that let the assistant pick better. They are built
 * from what was asked for: each is one full question about one thing, names the body part where that
 * reads naturally, and is left out when the request already answers it (demo 18.11: „Która strona i od
 * kiedy?” under a hip strengthening set told nobody what to answer).
 */

const MAX_QUESTIONS = 4;

// Paired body parts with the question about the side, as the therapist would ask it. Normalized stems.
const PAIRED_AREAS: ReadonlyArray<[RegExp, string]> = [
  [/biodr/, 'Które biodro: lewe, prawe czy oba?'],
  [/kolan/, 'Które kolano: lewe, prawe czy oba?'],
  [/bark|ramie|ramien|rotator/, 'Który bark: lewy, prawy czy oba?'],
  [/lokc|lokiec/, 'Który łokieć: lewy, prawy czy oba?'],
  [/nadgarst/, 'Który nadgarstek: lewy, prawy czy oba?'],
  [/skokow|kostk/, 'Który staw skokowy: lewy, prawy czy oba?'],
  [/\bstop(?:a|y|e|ie|ami)?\b|rozciegn/, 'Która stopa: lewa, prawa czy obie?'],
  [
    /czworoglow|dwuglow|lydk|\bud(?:o|a|zie)\b|achilles|kulszow|\bnog(?:a|i|e|ami)?\b|\bacl\b/,
    'Która noga: lewa, prawa czy obie?',
  ],
  [/\brek(?:a|i|e|ami)\b|dlon/, 'Która ręka: lewa, prawa czy obie?'],
];
const UNPAIRED_AREA = /kregoslup|ledzw|szyj|kark|plec|brzuch|\bcore\b|tulow|miednic|piersiow|posladk|postaw|oddech/;

const SIDE = /(?:^|[^a-z])(?:lew|praw)(?:[aey]|ego|ej|ym)\b|(?:^|[^a-z])(?:obu|oba|obie|obydw|obustron)/;
const DURATION =
  /od \d|\d+ ?(?:dni|tygodni|tydzien|miesi|lat|rok)|od (?:wczoraj|tygodnia|miesiaca|roku|pol roku|dawna|kilku)|przewlekl|\bostr(?:y|a|e|ym)\b|swiez/;
const CAUSE =
  /uraz|operac|zabieg|rekonstrukc|endoprotez|zlaman|skrecen|zerwan|przeciazen|kontuzj|wypadk|artroskop|\bacl\b|porodzie|zwyrodn|dyskopat|\brw(?:a|ie|y)\b/;
const SYMPTOM = /\bbol|sztywn|oslabi|dretw|obrzek|niestabiln|utyk/;
const GOAL =
  /wzmocni|wzmacni|rozciag|mobiliz|mobilnos|stabiliz|rozgrzew|kondycj|\bsil(?:a|e|y|owe|owy)\b|wytrzymal|profilakty|ogolnorozw/;
const PAIN = /\bbol|bez bolu/;
const LEVEL = /poczatkuj|zaawansowan|sportow|senior|aktywn|siedzac|sprawn|trenuj|biega/;
const EQUIPMENT = /sprzet|gum|tasm|hantl|pilk|\bmat(?:a|y|e)\b|roller|walek|kettl|sztang|ciezar/;
const AGE = /\d+ ?(?:lat|l\.)|wiek|senior|dziec|nastolat|mlod|starsz/;

const AREA_QUESTION = 'Której okolicy ciała ma dotyczyć zestaw?';
const SYMPTOM_QUESTION = 'Jaki jest główny problem: ból, sztywność czy osłabienie?';
const CAUSE_QUESTION = 'Czy to po urazie, po operacji czy bez wyraźnej przyczyny?';
const DURATION_QUESTION = 'Od jak dawna trwają dolegliwości?';
const PAIN_QUESTION = 'Czy przy ćwiczeniach pojawia się ból?';
const LEVEL_QUESTION = 'Jaki poziom zaawansowania pacjenta: początkujący, średni czy wysoki?';
const EQUIPMENT_QUESTION = 'Jaki sprzęt jest pod ręką?';
const AGE_QUESTION = 'Ile lat ma pacjent?';
const GOAL_QUESTION = 'Jaki jest cel: siła, rozciąganie czy stabilizacja?';
const LIMITS_QUESTION = 'Czy trzeba uważać na ból albo ograniczenia ruchu?';

function sideQuestion(text: string): string | undefined {
  if (SIDE.test(text)) return undefined;
  return PAIRED_AREAS.find(([area]) => area.test(text))?.[1];
}

function pick(candidates: ReadonlyArray<string | false | undefined>): string[] {
  return candidates.filter((question): question is string => Boolean(question)).slice(0, MAX_QUESTIONS);
}

/**
 * Under a set proposal. `request` is the therapist's message the proposal answers, `note` what the
 * set is for (model's note or the search query it was composed from).
 */
export function draftClarifyQuestions(input: { request?: string; note?: string }): string[] {
  const text = normalizeSearchText(`${input.request ?? ''} ${input.note ?? ''}`);
  const hasArea = UNPAIRED_AREA.test(text) || PAIRED_AREAS.some(([area]) => area.test(text));
  const hasSymptom = SYMPTOM.test(text);
  const hasCause = CAUSE.test(text);
  const hasGoal = GOAL.test(text);
  const hasComplaint = hasSymptom || hasCause;
  return pick([
    !hasArea && AREA_QUESTION,
    sideQuestion(text),
    !hasSymptom && !hasGoal && SYMPTOM_QUESTION,
    // „Na wzmocnienie biodra” names a goal, not a complaint: its cause and duration are not asked for.
    !hasCause && (hasComplaint || !hasGoal) && CAUSE_QUESTION,
    hasComplaint && !DURATION.test(text) && DURATION_QUESTION,
    hasGoal && !PAIN.test(text) && PAIN_QUESTION,
    !LEVEL.test(text) && LEVEL_QUESTION,
    !EQUIPMENT.test(text) && EQUIPMENT_QUESTION,
    !AGE.test(text) && AGE_QUESTION,
  ]);
}

/** Under exercise results: what narrows the choice before a set is made from them. */
export function exerciseClarifyQuestions(query: string, request?: string): string[] {
  const text = normalizeSearchText(`${request ?? ''} ${query}`);
  return pick([
    !GOAL.test(text) && GOAL_QUESTION,
    sideQuestion(text),
    !EQUIPMENT.test(text) && EQUIPMENT_QUESTION,
    !LEVEL.test(text) && LEVEL_QUESTION,
    !PAIN.test(text) && LIMITS_QUESTION,
  ]);
}

interface ThreadMessageLike {
  role: 'user' | 'assistant';
  text?: string;
  spec?: { component: string };
}

// A card that ends a flow: what was said before it was about another set or another patient.
const FLOW_END = new Set(['Sent', 'SetSaved', 'PatientAdded']);

/**
 * What the therapist wrote before the card at `index`, back to the last finished flow: the request
 * and the answers given since, so a question answered two messages ago does not come back.
 */
export function requestBefore(messages: readonly ThreadMessageLike[], index: number): string | undefined {
  const texts: string[] = [];
  for (let position = index - 1; position >= 0; position -= 1) {
    const message = messages[position];
    if (message.role === 'user') {
      if (message.text) texts.unshift(message.text);
    } else if (message.spec && FLOW_END.has(message.spec.component)) break;
  }
  return texts.length > 0 ? texts.join('\n') : undefined;
}
