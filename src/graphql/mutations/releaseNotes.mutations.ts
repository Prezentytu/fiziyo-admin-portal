import { gql } from '@apollo/client';

export const MARK_RELEASE_NOTE_SEEN_MUTATION = gql`
  mutation MarkReleaseNoteSeen($releaseNoteId: String!) {
    markReleaseNoteSeen(audience: PORTAL, releaseNoteId: $releaseNoteId)
  }
`;
