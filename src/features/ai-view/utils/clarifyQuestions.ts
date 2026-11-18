import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';

/**
 * Questions under a set proposal or exercise results that let the assistant pick better. They are built
 * from what was asked for: each is one full question about one thing with a short topic for the answer, names the body part where that
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

/** What a chip shows (`label`) and what a tap puts in the message field, followed by „: ” (`topic`, as in T-0036). */
export interface ClarifyQuestion {
  label: string;
  topic: string;
}

const SIDE_TOPIC = 'Strona ciała';
const AREA: ClarifyQuestion = { label: 'Której okolicy ciała ma dotyczyć zestaw?', topic: 'Okolica ciała' };
const SYMPTOM_Q: ClarifyQuestion = {
  label: 'Jaki jest główny problem: ból, sztywność czy osłabienie?',
  topic: 'Główny objaw',
};
const CAUSE_Q: ClarifyQuestion = {
  label: 'Czy to po urazie, po operacji czy bez wyraźnej przyczyny?',
  topic: 'Przyczyna',
};
const DURATION_Q: ClarifyQuestion = { label: 'Od jak dawna trwają dolegliwości?', topic: 'Czas trwania' };
const PAIN_Q: ClarifyQuestion = { label: 'Czy przy ćwiczeniach pojawia się ból?', topic: 'Ból przy ćwiczeniach' };
const LEVEL_Q: ClarifyQuestion = {
  label: 'Jaki poziom zaawansowania pacjenta: początkujący, średni czy wysoki?',
  topic: 'Poziom zaawansowania',
};
const EQUIPMENT_Q: ClarifyQuestion = { label: 'Jaki sprzęt jest pod ręką?', topic: 'Dostępny sprzęt' };
const AGE_Q: ClarifyQuestion = { label: 'Ile lat ma pacjent?', topic: 'Wiek' };
const GOAL_Q: ClarifyQuestion = { label: 'Jaki jest cel: siła, rozciąganie czy stabilizacja?', topic: 'Cel ćwiczeń' };
const LIMITS_Q: ClarifyQuestion = {
  label: 'Czy trzeba uważać na ból albo ograniczenia ruchu?',
  topic: 'Ból i ograniczenia',
};
const TOPICS = [AREA, SYMPTOM_Q, CAUSE_Q, DURATION_Q, PAIN_Q, LEVEL_Q, EQUIPMENT_Q, AGE_Q, GOAL_Q, LIMITS_Q]
  .map((question) => question.topic)
  .concat(SIDE_TOPIC);

interface ReadRequest {
  /** What was written, without the topic prefixes: only the therapist's own words count as facts. */
  text: string;
  /** Topics answered in the form a chip starts („Strona ciała: prawa”), whatever the answer says. */
  answered: ReadonlySet<string>;
}

function readRequest(raw: string): ReadRequest {
  let text = normalizeSearchText(raw);
  const answered = new Set<string>();
  for (const topic of TOPICS) {
    const prefix = new RegExp(`${normalizeSearchText(topic)}\\s*:\\s*(?=\\S)`, 'g');
    if (prefix.test(text)) answered.add(topic);
    text = text.replace(prefix, ' ');
  }
  return { text, answered };
}

function sideQuestion(text: string): ClarifyQuestion | undefined {
  if (SIDE.test(text)) return undefined;
  const label = PAIRED_AREAS.find(([area]) => area.test(text))?.[1];
  return label ? { label, topic: SIDE_TOPIC } : undefined;
}

function pick(request: ReadRequest, candidates: ReadonlyArray<ClarifyQuestion | false | undefined>): ClarifyQuestion[] {
  return candidates
    .filter(
      (question): question is ClarifyQuestion =>
        Boolean(question) && !request.answered.has((question as ClarifyQuestion).topic)
    )
    .slice(0, MAX_QUESTIONS);
}

/**
 * Under a set proposal. `request` is what the therapist wrote before the proposal (`requestBefore`),
 * `note` what the set is for (model's note or the search query it was composed from).
 */
export function draftClarifyQuestions(input: { request?: string; note?: string }): ClarifyQuestion[] {
  const request = readRequest(`${input.request ?? ''} ${input.note ?? ''}`);
  const { text } = request;
  const hasArea = UNPAIRED_AREA.test(text) || PAIRED_AREAS.some(([area]) => area.test(text));
  const hasSymptom = SYMPTOM.test(text);
  const hasCause = CAUSE.test(text);
  const hasGoal = GOAL.test(text);
  const hasComplaint = hasSymptom || hasCause;
  return pick(request, [
    !hasArea && AREA,
    sideQuestion(text),
    !hasSymptom && !hasGoal && SYMPTOM_Q,
    // „Na wzmocnienie biodra” names a goal, not a complaint: its cause and duration are not asked for.
    !hasCause && (hasComplaint || !hasGoal) && CAUSE_Q,
    hasComplaint && !DURATION.test(text) && DURATION_Q,
    hasGoal && !PAIN.test(text) && PAIN_Q,
    !LEVEL.test(text) && LEVEL_Q,
    !EQUIPMENT.test(text) && EQUIPMENT_Q,
    !AGE.test(text) && AGE_Q,
  ]);
}

/** Under exercise results: what narrows the choice before a set is made from them. */
export function exerciseClarifyQuestions(query: string, request?: string): ClarifyQuestion[] {
  const read = readRequest(`${request ?? ''} ${query}`);
  const { text } = read;
  return pick(read, [
    !GOAL.test(text) && GOAL_Q,
    sideQuestion(text),
    !EQUIPMENT.test(text) && EQUIPMENT_Q,
    !LEVEL.test(text) && LEVEL_Q,
    !PAIN.test(text) && LIMITS_Q,
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
