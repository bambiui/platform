import { useEffect, useRef, type DependencyList, type RefObject } from "react";
import { autoInit, destroyAll } from "../auto-init";

export function useBambi<T extends HTMLElement>(
  deps: DependencyList = [],
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current ?? document;
    autoInit(root);

    return () => {
      destroyAll(root);
    };
  }, deps);

  return ref;
}
