import { Kind } from 'graphql';
import { describe, expect, it } from 'vitest';

import { VERIFICATION_QUEUE_ITEM_FRAGMENT } from '../queries/adminExercises.queries';

function selectedFieldNames(): string[] {
  const fragment = VERIFICATION_QUEUE_ITEM_FRAGMENT.definitions.find(
    (definition) => definition.kind === Kind.FRAGMENT_DEFINITION,
  );
  if (fragment?.kind !== Kind.FRAGMENT_DEFINITION) throw new Error('Missing VerificationQueueItemFragment');
  return fragment.selectionSet.selections.flatMap((selection) =>
    selection.kind === Kind.FIELD ? [selection.name.value] : [],
  );
}

describe('VerificationQueueItemFragment (D-M-034)', () => {
  it('pobiera pola mediów, z których VerificationTaskCard liczy plakietki „Brak wideo” i „Brak obrazu”', () => {
    expect(selectedFieldNames()).toEqual(
      expect.arrayContaining(['videoUrl', 'gifUrl', 'imageUrl', 'images', 'thumbnailUrl']),
    );
  });
});
