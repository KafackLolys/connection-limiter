
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CellularUsageBaseline, QuotaSettings, UsageEntry } from "../features/quota/quota.types";

const QUOTA_KEY = "@connection_limiter/quotas";
const USAGE_KEY = "@connection_limiter/usage";
const CELLULAR_BASELINE_KEY = "@connection_limiter/cellular_baseline";

export async function saveQuotas(
  quotas: QuotaSettings[]
): Promise<void> {
  await AsyncStorage.setItem(
    QUOTA_KEY,
    JSON.stringify(quotas)
  );
}

export async function getQuotas(): Promise<QuotaSettings[]> {
  const data = await AsyncStorage.getItem(QUOTA_KEY);

  if (!data) return [];

  try {
    return JSON.parse(data) as QuotaSettings[];
  } catch {
    return [];
  }
}

export async function saveUsage(entries: UsageEntry[]): Promise<void> {
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(entries));
}

export async function getUsage(): Promise<UsageEntry[]> {
  const data = await AsyncStorage.getItem(USAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as UsageEntry[];
  } catch {
    return [];
  }
}

export async function saveCellularBaseline(baseline: CellularUsageBaseline): Promise<void> {
  await AsyncStorage.setItem(CELLULAR_BASELINE_KEY, JSON.stringify(baseline));
}

export async function getCellularBaseline(): Promise<CellularUsageBaseline | null> {
  const data = await AsyncStorage.getItem(CELLULAR_BASELINE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as CellularUsageBaseline;
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
