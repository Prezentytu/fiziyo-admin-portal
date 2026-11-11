import type { VerificationFact } from '../utils/verificationFacts';
import { StageSection } from './StageSection';

export const CONTRACT_FACTS_HINT = 'Tylko do odczytu. Te pola zmienisz w formularzu ćwiczenia.';

interface ContractFactsProps {
  title: string;
  facts: VerificationFact[];
  hint?: string;
  /** Folded by default: reference data the reviewer opens when needed. */
  collapsible?: boolean;
  'data-testid': string;
}

function FactList({ facts }: Readonly<{ facts: VerificationFact[] }>) {
  return (
    <dl className="flex flex-col gap-3">
      {facts.map((fact) => (
        <div key={fact.id} className="flex flex-col gap-1" data-testid={`verification-fact-${fact.id}`}>
          <dt className="text-[13px] text-label-secondary">{fact.label}</dt>
          <dd className="text-[15px] leading-[21px] text-foreground">
            {fact.lines.length === 0 ? (
              <span className="text-label-tertiary">Brak</span>
            ) : fact.lines.length === 1 ? (
              <span className="whitespace-pre-line break-words">{fact.lines[0]}</span>
            ) : (
              <ul className="flex list-disc flex-col gap-0.5 pl-5">
                {fact.lines.map((line, index) => (
                  <li key={index} className="break-words">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Contract v3.3 facts the verification center shows but does not edit. */
export function ContractFacts({
  title,
  facts,
  hint = CONTRACT_FACTS_HINT,
  collapsible = false,
  'data-testid': testId,
}: Readonly<ContractFactsProps>) {
  if (facts.length === 0) return null;
  if (!collapsible) {
    return (
      <StageSection title={title} hint={hint} data-testid={testId}>
        <FactList facts={facts} />
      </StageSection>
    );
  }
  return (
    <details className="group rounded-card bg-grouped-tertiary p-4" data-testid={testId}>
      <summary className="cursor-pointer text-[17px] font-semibold leading-[22px] text-foreground">{title}</summary>
      <p className="mb-3 mt-1 text-[13px] leading-[18px] text-label-secondary">{hint}</p>
      <FactList facts={facts} />
    </details>
  );
}
