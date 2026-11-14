import { requireOptionalNativeModule } from "expo-modules-core";

export interface CellularCounters {
  available: boolean;
  receivedBytes: number;
  sentBytes: number;
}

type NativeCellularUsageModule = {
  getCounters(): Promise<CellularCounters>;
};

const CellularUsage = requireOptionalNativeModule<NativeCellularUsageModule>("CellularUsage");

export async function getCellularCounters(): Promise<CellularCounters | null> {
  if (!CellularUsage) return null;

  try {
    const result = await CellularUsage.getCounters();
    if (
      typeof result?.available !== "boolean" ||
      !Number.isFinite(result.receivedBytes) ||
      !Number.isFinite(result.sentBytes)
    ) {
      return null;
    }

    return {
      available: result.available,
      receivedBytes: Math.max(0, result.receivedBytes),
      sentBytes: Math.max(0, result.sentBytes),
    };
  } catch {
    return null;
  }
}
