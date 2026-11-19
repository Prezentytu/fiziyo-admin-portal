import { gql } from '@apollo/client';

import { SUPPORT_THREAD_FIELDS_FRAGMENT } from '@/graphql/queries/support.queries';

export const SUPPORT_CREATE_CONVERSATION_MUTATION = gql`
  mutation SupportCreateConversation($subject: String!, $category: SupportThreadCategory!, $body: String!) {
    supportCreateConversation(subject: $subject, category: $category, body: $body) {
      ...SupportThreadFields
    }
  }
  ${SUPPORT_THREAD_FIELDS_FRAGMENT}
`;

export const SUPPORT_REPLY_MUTATION = gql`
  mutation SupportReply($threadId: String!, $body: String!) {
    supportReply(threadId: $threadId, body: $body) {
      ...SupportThreadFields
    }
  }
  ${SUPPORT_THREAD_FIELDS_FRAGMENT}
`;

export const SUPPORT_MARK_READ_MUTATION = gql`
  mutation SupportMarkRead($threadId: String!) {
    supportMarkRead(threadId: $threadId)
  }
`;
