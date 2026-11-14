import { requireNativeModule } from "expo";

export interface CellularCounters {
  available: boolean;
  receivedBytes: number;
  sentBytes: number;
}

interface CellularUsageNativeModule {
  getCounters(): CellularCounters;
}

let nativeModule: CellularUsageNativeModule | undefined;

export function getCellularCounters(): CellularCounters | null {
  try {
    nativeModule ??= requireNativeModule<CellularUsageNativeModule>("CellularUsageModule");
    return nativeModule.getCounters();
  } catch {
    return null;
  }
}
