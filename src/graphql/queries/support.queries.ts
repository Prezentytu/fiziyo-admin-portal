import { gql } from '@apollo/client';

// Wsparcie (SPEC-056 w fizjo-app): rozmowy i zgłoszenia gabinetu z zespołem FiziYo. Starsze API nie zna tych pól,
// więc wołający czytają je z errorPolicy 'all' i ukrywają funkcję po cichu.
const SUPPORT_THREAD_FIELDS_FRAGMENT = gql`
  fragment SupportThreadFields on SupportThreadView {
    id
    subject
    category
    status
    source
    isReport
    requiresReply
    feedbackType
    referenceCode
    createdAt
    lastMessageAt
    unread
    lastMessagePreview
    lastMessageFromTeam
  }
`;

export const GET_SUPPORT_UNREAD_COUNT_QUERY = gql`
  query GetSupportUnreadCount {
    supportUnreadCount {
      conversations
      reports
      total
      replyRequested
      enabled
    }
  }
`;

export const GET_SUPPORT_THREADS_QUERY = gql`
  query GetSupportThreads($tab: SupportTab!) {
    supportThreads(tab: $tab) {
      ...SupportThreadFields
    }
  }
  ${SUPPORT_THREAD_FIELDS_FRAGMENT}
`;

export const GET_SUPPORT_THREAD_QUERY = gql`
  query GetSupportThread($id: String!) {
    supportThread(id: $id) {
      thread {
        ...SupportThreadFields
      }
      messages {
        id
        authorKind
        authorName
        isMine
        body
        ctaLabel
        ctaKind
        ctaUrl
        ctaHost
        createdAt
      }
    }
  }
  ${SUPPORT_THREAD_FIELDS_FRAGMENT}
`;

export { SUPPORT_THREAD_FIELDS_FRAGMENT };
