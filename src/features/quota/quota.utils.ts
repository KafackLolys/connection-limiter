
import type {
  QuotaSettings,
  QuotaStatus,
} from "./quota.types";

export function calculateQuotaStatus(
  consumedMB: number,
  settings: QuotaSettings
): QuotaStatus {
  const limitMB = settings.limitMB;

  const percentage =
    limitMB > 0
      ? Math.min((consumedMB / limitMB) * 100, 100)
      : 0;

  return {
    consumedMB,
    limitMB,
    remainingMB: Math.max(limitMB - consumedMB, 0),
    percentage,
    reached: consumedMB >= limitMB,
  };
}

export function formatData(valueMB: number): string {
  if (valueMB >= 1024) {
    return `${(valueMB / 1024).toFixed(2)} Go`;
  }

  return `${valueMB.toFixed(0)} Mo`;
}
