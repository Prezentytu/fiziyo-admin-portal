import { routeIntent, type IntentContext } from './intentRouter';
import type { ChatViewSpec } from './viewSpec';

export type DispatchFailure = 'unavailable' | 'insufficient_credits' | 'unauthorized';

export class ChatDispatchError extends Error {
  readonly reason: DispatchFailure;

  constructor(reason: DispatchFailure, message: string) {
    super(message);
    this.name = 'ChatDispatchError';
    this.reason = reason;
  }
}

export interface DispatchResult {
  sessionId: string;
  spec: ChatViewSpec;
  creditsUsed: number;
}

export type Dispatcher = (message: string, sessionId?: string) => Promise<DispatchResult>;

export interface ResolvedReply {
  spec: ChatViewSpec;
  source: 'ai' | 'rules';
  sessionId?: string;
  creditsUsed: number;
  /** Why the reply came from rules although AI was on; shown once as a quiet note. */
  fallbackReason?: DispatchFailure;
}

/**
 * AI first when allowed; any dispatcher failure falls back to the rule-based router,
 * so the therapist always gets a working card (architecture doc: "bez AI to ten sam renderer").
 */
export async function resolveReply(
  text: string,
  options: {
    useAi: boolean;
    sessionId?: string;
    context: IntentContext;
    dispatch: Dispatcher;
    /** The command a previous rules question was about; the model keeps its own history instead. */
    pendingCommand?: string;
  }
): Promise<ResolvedReply> {
  if (options.useAi) {
    try {
      const result = await options.dispatch(text, options.sessionId);
      return { spec: result.spec, source: 'ai', sessionId: result.sessionId, creditsUsed: result.creditsUsed };
    } catch (error) {
      const fallbackReason = error instanceof ChatDispatchError ? error.reason : 'unavailable';
      return {
        spec: routeIntent(text, options.context, options.pendingCommand),
        source: 'rules',
        creditsUsed: 0,
        fallbackReason,
      };
    }
  }
  return { spec: routeIntent(text, options.context, options.pendingCommand), source: 'rules', creditsUsed: 0 };
}
