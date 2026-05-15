import type { BambiComponentContract } from "./types.js";

export function defineContract<const TContract extends BambiComponentContract>(
  contract: TContract,
): Readonly<TContract> {
  return contract;
}
