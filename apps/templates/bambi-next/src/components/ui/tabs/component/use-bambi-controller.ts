import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export interface BambiController {
  sync(): void;
  update?(options?: unknown): void;
  destroy(): void;
}

export type BambiControllerConstructor<TOptions> = new (
  root: Element,
  options?: TOptions,
) => BambiController;

export function useBambiController<TOptions>(
  rootRef: RefObject<Element | null>,
  Controller: BambiControllerConstructor<TOptions> | undefined,
  options: TOptions,
): void {
  const controllerRef = useRef<BambiController | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !Controller) return;

    const controller = new Controller(root, options);
    controller.sync();
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [Controller, rootRef]);

  useEffect(() => {
    controllerRef.current?.update?.(options);
  }, [options]);
}
