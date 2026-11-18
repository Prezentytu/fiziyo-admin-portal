import { gql } from '@apollo/client';

// „Co nowego” w panelu: wydania z Ops dla odbiorcy PORTAL (fizjo-app ReleaseNote). Starsze API nie zna tych pól,
// więc wołający czytają je z errorPolicy 'all' i ukrywają funkcję po cichu.
const RELEASE_NOTE_FIELDS_FRAGMENT = gql`
  fragment ReleaseNoteFields on ReleaseNoteView {
    id
    title
    lead
    publishedAt
    notified
    items {
      kind
      title
      body
      linkLabel
      deeplink
      screenshotUrl
    }
    fixes
  }
`;

export const GET_RELEASE_NOTES_QUERY = gql`
  query GetReleaseNotes($take: Int!) {
    releaseNotes(audience: PORTAL, take: $take) {
      ...ReleaseNoteFields
    }
  }
  ${RELEASE_NOTE_FIELDS_FRAGMENT}
`;

export const GET_UNSEEN_RELEASE_NOTE_QUERY = gql`
  query GetUnseenReleaseNote {
    unseenReleaseNote(audience: PORTAL) {
      ...ReleaseNoteFields
    }
  }
  ${RELEASE_NOTE_FIELDS_FRAGMENT}
`;
