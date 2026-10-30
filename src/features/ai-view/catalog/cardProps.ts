import type { ChatCardSpec } from '../utils/chatCards';

export type CardSpec<C extends ChatCardSpec['component']> = Extract<ChatCardSpec, { component: C }>;

export interface CardProps<C extends ChatCardSpec['component']> {
  readonly spec: CardSpec<C>;
  readonly testId: string;
  /** Message the card belongs to; a flow step marks it chosen so its actions are spent. */
  readonly messageId: string;
  readonly chosen?: string;
}
