import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';

/**
 * Questions under a set proposal or exercise results that let the assistant pick better. They are built
 * from what was asked for: each is one question about one thing with its ready answers, names the body part where that
 * reads naturally, and is left out when the request already answers it (demo 18.11: „Która strona i od
 * kiedy?” under a hip strengthening set told nobody what to answer).
 */

const MAX_QUESTIONS = 4;

// Paired body parts with the question about the side, as the therapist would ask it. Normalized stems.
const NEUTER_SIDES = ['lewe', 'prawe', 'oba'];
const MASCULINE_SIDES = ['lewy', 'prawy', 'oba'];
const FEMININE_SIDES = ['lewa', 'prawa', 'obie'];
const PAIRED_AREAS: ReadonlyArray<[RegExp, string, readonly string[]]> = [
  [/biodr/, 'Które biodro?', NEUTER_SIDES],
  [/kolan/, 'Które kolano?', NEUTER_SIDES],
  [/bark|ramie|ramien|rotator/, 'Który bark?', MASCULINE_SIDES],
  [/lokc|lokiec/, 'Który łokieć?', MASCULINE_SIDES],
  [/nadgarst/, 'Który nadgarstek?', MASCULINE_SIDES],
  [/skokow|kostk/, 'Który staw skokowy?', MASCULINE_SIDES],
  [/\bstop(?:a|y|e|ie|ami)?\b|rozciegn/, 'Która stopa?', FEMININE_SIDES],
  [
    /czworoglow|dwuglow|lydk|\bud(?:o|a|zie)\b|achilles|kulszow|\bnog(?:a|i|e|ami)?\b|\bacl\b/,
    'Która noga?',
    FEMININE_SIDES,
  ],
  [/\brek(?:a|i|e|ami)\b|dlon/, 'Która ręka?', FEMININE_SIDES],
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

/**
 * `label` is the question, `options` its ready answers shown as chips, `topic` the line they fill in the
 * message field („Cel ćwiczeń: siła, stabilizacja”, as in T-0036). `multi` lets more than one answer be chosen.
 */
export interface ClarifyQuestion {
  label: string;
  topic: string;
  options: readonly string[];
  multi?: boolean;
}

const SIDE_TOPIC = 'Strona ciała';
const AREA: ClarifyQuestion = {
  label: 'Której okolicy ciała ma dotyczyć zestaw?',
  topic: 'Okolica ciała',
  options: ['odcinek lędźwiowy', 'szyja', 'bark', 'biodro', 'kolano', 'staw skokowy'],
  multi: true,
};
const SYMPTOM_Q: ClarifyQuestion = {
  label: 'Jaki jest główny problem?',
  topic: 'Główny objaw',
  options: ['ból', 'sztywność', 'osłabienie'],
  multi: true,
};
const CAUSE_Q: ClarifyQuestion = {
  label: 'Skąd się wzięło?',
  topic: 'Przyczyna',
  options: ['po urazie', 'po operacji', 'bez wyraźnej przyczyny'],
};
const DURATION_Q: ClarifyQuestion = {
  label: 'Od jak dawna trwają dolegliwości?',
  topic: 'Czas trwania',
  options: ['do 2 tygodni', '2–6 tygodni', '6–12 tygodni', 'ponad 3 miesiące'],
};
const PAIN_Q: ClarifyQuestion = {
  label: 'Czy przy ćwiczeniach pojawia się ból?',
  topic: 'Ból przy ćwiczeniach',
  options: ['nie', 'lekki', 'wyraźny'],
};
const LEVEL_Q: ClarifyQuestion = {
  label: 'Poziom zaawansowania pacjenta?',
  topic: 'Poziom zaawansowania',
  options: ['początkujący', 'średni', 'wysoki'],
};
const EQUIPMENT_Q: ClarifyQuestion = {
  label: 'Jaki sprzęt jest pod ręką?',
  topic: 'Dostępny sprzęt',
  options: ['bez sprzętu', 'guma', 'hantle', 'piłka', 'mata'],
  multi: true,
};
const AGE_Q: ClarifyQuestion = {
  label: 'Ile lat ma pacjent?',
  topic: 'Wiek',
  options: ['do 18 lat', '18–40 lat', '41–65 lat', 'ponad 65 lat'],
};
const GOAL_Q: ClarifyQuestion = {
  label: 'Jaki jest cel?',
  topic: 'Cel ćwiczeń',
  options: ['siła', 'rozciąganie', 'stabilizacja', 'mobilność'],
  multi: true,
};
const LIMITS_Q: ClarifyQuestion = {
  label: 'Czy trzeba na coś uważać?',
  topic: 'Ból i ograniczenia',
  options: ['bez ograniczeń', 'ból przy ruchu', 'ograniczony zakres ruchu'],
  multi: true,
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
  const paired = PAIRED_AREAS.find(([area]) => area.test(text));
  return paired ? { label: paired[1], topic: SIDE_TOPIC, options: paired[2] } : undefined;
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

/** The message the chosen answers make: one „Temat: odpowiedź” line per answered question, in question order. */
export function composeClarifyAnswers(
  questions: readonly ClarifyQuestion[],
  chosen: Readonly<Record<string, readonly string[]>>
): string {
  return questions
    .map((question) => {
      const answers = question.options.filter((option) => chosen[question.topic]?.includes(option));
      return answers.length > 0 ? `${question.topic}: ${answers.join(', ')}` : undefined;
    })
    .filter(Boolean)
    .join('\n');
}

/** The chosen answers alone, in question and option order: the short summary next to „Dobierz ponownie”. */
export function chosenClarifyAnswers(
  questions: readonly ClarifyQuestion[],
  chosen: Readonly<Record<string, readonly string[]>>
): string[] {
  return questions.flatMap((question) => question.options.filter((option) => chosen[question.topic]?.includes(option)));
}

/**
 * What „Dobierz ponownie” sends: the request the card answered and the chosen answers under it. The
 * answers alone („Strona ciała: lewe”) lose what the set is for, and the assistant asks again instead of
 * picking (26.11). An earlier line on a topic answered now gives way to the new answer.
 */
export function composeRepickMessage(
  request: string | undefined,
  questions: readonly ClarifyQuestion[],
  chosen: Readonly<Record<string, readonly string[]>>
): string {
  const answers = composeClarifyAnswers(questions, chosen);
  if (!answers) return '';
  const answered = questions.filter((question) => (chosen[question.topic]?.length ?? 0) > 0);
  const context = (request ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !answered.some((question) => line.startsWith(`${question.topic}:`)));
  return [...context, answers].join('\n');
}
