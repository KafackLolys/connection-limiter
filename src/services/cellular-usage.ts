export interface CellularCounters {
  available: boolean;
  receivedBytes: number;
  sentBytes: number;
}

export function getCellularCounters(): CellularCounters | null {
  return null;
}
