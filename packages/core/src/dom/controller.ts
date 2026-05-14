/**
 * BambiController — universal interface all bambi controllers implement.
 *
 * sync()    Read current DOM state and apply it. Called on mount and on forced re-sync.
 * update()  Incrementally apply changed options. Unknown keys are ignored.
 * destroy() Detach listeners, release resources. Must be idempotent.
 */
export interface BambiController {
  sync(): void;
  update?(options?: unknown): void;
  destroy(): void;
}
