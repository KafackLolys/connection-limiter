
export type QuotaPeriod = "daily" | "weekly" | "monthly";

export type QuotaAction = "alert" | "block";

export interface QuotaSettings {
  id: string;
  name: string;
  limitMB: number;
  period: QuotaPeriod;
  action: QuotaAction;
  alertThresholds: number[];
  enabled: boolean;
}

export interface UsageData {
  consumedMB: number;
  updatedAt: string;
}

export interface UsageEntry extends UsageData {
  id: string;
  quotaId: string;
  periodKey: string;
  source: "manual" | "cellular";
}

export interface CellularUsageBaseline {
  totalBytes: number;
  updatedAt: string;
}

export interface QuotaStatus {
  consumedMB: number;
  limitMB: number;
  remainingMB: number;
  percentage: number;
  reached: boolean;
}
