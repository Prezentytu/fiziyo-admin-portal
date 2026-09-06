let disposeHandler: (() => void) | null = null;

export function registerGraphqlWsDispose(handler: () => void): void {
  disposeHandler = handler;
}

export function disposeGraphqlWs(): void {
  disposeHandler?.();
}
