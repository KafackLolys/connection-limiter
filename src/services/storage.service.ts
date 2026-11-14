import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CellularUsageBaseline, QuotaSettings, UsageEntry } from "../features/quota/quota.types";

const QUOTA_KEY = "@connection_limiter/quotas";
const USAGE_KEY = "@connection_limiter/usage";
const CELLULAR_BASELINE_KEY = "@connection_limiter/cellular_baseline";

function parseArray<T>(raw: string | null, validate: (value: unknown) => value is T): T[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(validate) : [];
  } catch {
    return [];
  }
}

function isQuota(value: unknown): value is QuotaSettings {
  if (!value || typeof value !== "object") return false;
  const q = value as Partial<QuotaSettings>;
  return typeof q.id === "string" && typeof q.name === "string" &&
    typeof q.limitMB === "number" && Number.isFinite(q.limitMB) && q.limitMB > 0 &&
    ["daily", "weekly", "monthly"].includes(String(q.period)) &&
    ["alert", "block"].includes(String(q.action)) &&
    typeof q.enabled === "boolean";
}

function isUsageEntry(value: unknown): value is UsageEntry {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<UsageEntry>;
  return typeof e.id === "string" && typeof e.quotaId === "string" &&
    typeof e.periodKey === "string" && typeof e.consumedMB === "number" &&
    Number.isFinite(e.consumedMB) && e.consumedMB >= 0 &&
    typeof e.updatedAt === "string" && ["manual", "cellular"].includes(String(e.source));
}

export async function saveQuotas(quotas: QuotaSettings[]): Promise<void> {
  await AsyncStorage.setItem(QUOTA_KEY, JSON.stringify(quotas));
}

export async function getQuotas(): Promise<QuotaSettings[]> {
  const quotas = parseArray(await AsyncStorage.getItem(QUOTA_KEY), isQuota);
  // Older stored quotas may not have custom thresholds.
  return quotas.map((quota) => ({
    ...quota,
    alertThresholds: Array.isArray(quota.alertThresholds)
      ? quota.alertThresholds.filter((n) => Number.isFinite(n) && n > 0 && n <= 100)
      : [50, 80, 100],
  }));
}

export async function saveUsage(entries: UsageEntry[]): Promise<void> {
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(entries));
}

export async function getUsage(): Promise<UsageEntry[]> {
  return parseArray(await AsyncStorage.getItem(USAGE_KEY), isUsageEntry);
}

export async function saveCellularBaseline(baseline: CellularUsageBaseline): Promise<void> {
  await AsyncStorage.setItem(CELLULAR_BASELINE_KEY, JSON.stringify(baseline));
}

export async function getCellularBaseline(): Promise<CellularUsageBaseline | null> {
  const raw = await AsyncStorage.getItem(CELLULAR_BASELINE_KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const baseline = value as Partial<CellularUsageBaseline>;
    if (typeof baseline.totalBytes !== "number" || !Number.isFinite(baseline.totalBytes) ||
        typeof baseline.updatedAt !== "string") return null;
    return baseline as CellularUsageBaseline;
  } catch {
    return null;
  }
}

export function getPeriodKey(period: QuotaSettings["period"], date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (period === "daily") return `${year}-${month}-${day}`;
  if (period === "monthly") return `${year}-${month}`;
  const weekStart = new Date(year, date.getMonth(), date.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
}
