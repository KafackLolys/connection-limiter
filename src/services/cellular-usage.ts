import { getCellularCounters as readNativeCounters, type CellularCounters } from "../../modules/cellular-usage";

export type { CellularCounters };

/**
 * Returns aggregate bytes reported by iOS cellular interfaces.
 * Requires a native iOS build containing the local Expo module.
 * Expo Go and unsupported devices return null.
 */
export async function getCellularCounters(): Promise<CellularCounters | null> {
  return readNativeCounters();
}
