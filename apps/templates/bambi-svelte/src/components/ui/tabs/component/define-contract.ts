import type { BambiComponentContract } from "./types";

export function defineContract<const TContract extends BambiComponentContract>(
  contract: TContract,
): Readonly<TContract> {
  return contract;
}
