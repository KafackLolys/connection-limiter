import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { QuotaSettings, UsageEntry } from "../../features/quota/quota.types";
import { calculateQuotaStatus, formatData } from "../../features/quota/quota.utils";
import { getCellularBaseline, getPeriodKey, getQuotas, getUsage, saveCellularBaseline, saveUsage } from "../../services/storage.service";
import { sendQuotaAlert } from "../../services/notification.service";
import { getCellularCounters } from "../../services/cellular-usage";

const C = { bg: "#F5F7FB", blue: "#3478F6", dark: "#101828", muted: "#667085", white: "#FFFFFF", border: "#EAECF0", green: "#16A36A", red: "#DC2626" };

export default function DashboardScreen() {
  const [quotas, setQuotas] = useState<QuotaSettings[]>([]);
  const [entries, setEntries] = useState<UsageEntry[]>([]);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [cellularStatus, setCellularStatus] = useState("Initialisation du compteur cellulaire…");
  const collecting = useRef(false);
  const refresh = useCallback(async () => {
    try { setQuotas(await getQuotas()); setEntries(await getUsage()); }
    catch { Alert.alert("Erreur", "Impossible de charger vos données."); }
  }, []);

  const collectCellularUsage = useCallback(async () => {
    if (Platform.OS !== "ios") return;
    if (collecting.current) return;
    collecting.current = true;
    try {
      const counters = await getCellularCounters();
      if (!counters) {
        setCellularStatus("Module iOS absent · installez un build natif, pas Expo Go");
        return;
      }
      if (!counters.available) {
        setCellularStatus("Compteur cellulaire indisponible sur cet appareil");
        return;
      }
      const totalBytes = counters.receivedBytes + counters.sentBytes;
      const now = new Date();
      const previous = await getCellularBaseline();
      if (!previous || totalBytes < previous.totalBytes) {
        await saveCellularBaseline({ totalBytes, updatedAt: now.toISOString() });
        setCellularStatus(previous ? "Compteur réinitialisé · nouvelle base" : "Compteur cellulaire prêt");
        return;
      }

      const deltaBytes = totalBytes - previous.totalBytes;
      await saveCellularBaseline({ totalBytes, updatedAt: now.toISOString() });
      if (deltaBytes < 1024) {
        setCellularStatus("Comptage cellulaire actif · vérifié toutes les 30 s");
        return;
      }

      const activeQuota = (await getQuotas()).find((item) => item.enabled);
      if (!activeQuota) {
        setCellularStatus("Compteur actif · créez un quota pour suivre les Mo");
        return;
      }

      const allEntries = await getUsage();
      const periodKey = getPeriodKey(activeQuota.period, now);
      const usedBefore = allEntries
        .filter((item) => item.quotaId === activeQuota.id && item.periodKey === periodKey)
        .reduce((sum, item) => sum + item.consumedMB, 0);
      const addedMB = deltaBytes / (1024 * 1024);
      const usedAfter = usedBefore + addedMB;
      const hourKey = Math.floor(now.getTime() / 3_600_000);
      const entryId = `cell-${activeQuota.id}-${periodKey}-${hourKey}`;
      const existing = allEntries.find((item) => item.id === entryId);
      const cellularEntry: UsageEntry = {
        id: entryId,
        quotaId: activeQuota.id,
        consumedMB: (existing?.consumedMB ?? 0) + addedMB,
        updatedAt: now.toISOString(),
        periodKey,
        source: "cellular",
      };
      const next: UsageEntry[] = existing
        ? allEntries.map((item) => item.id === entryId ? cellularEntry : item)
        : [cellularEntry, ...allEntries];
      await saveUsage(next);
      setEntries(next);
      setCellularStatus("Données cellulaires ajoutées au suivi");

      const beforePercent = usedBefore / activeQuota.limitMB * 100;
      const afterPercent = usedAfter / activeQuota.limitMB * 100;
      for (const threshold of activeQuota.alertThresholds ?? [50, 80, 100]) {
        if (beforePercent < threshold && afterPercent >= threshold) {
          await sendQuotaAlert(threshold, usedAfter, activeQuota.limitMB);
        }
      }
    } catch {
      setCellularStatus("Lecture cellulaire momentanément indisponible");
    } finally {
      collecting.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const updateOnOpen = async () => {
      await collectCellularUsage();
      await refresh();
    };
    void updateOnOpen();
    const timer = setInterval(() => { void collectCellularUsage(); }, 30_000);
    const appState = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") { void updateOnOpen(); }
    });
    return () => { clearInterval(timer); appState.remove(); };
  }, [collectCellularUsage, refresh]));

  const quota = quotas.find((item) => item.enabled);
  const key = quota ? getPeriodKey(quota.period) : "";
  const used = quota ? entries.filter((item) => item.quotaId === quota.id && item.periodKey === key).reduce((sum, item) => sum + item.consumedMB, 0) : 0;
  const status = quota ? calculateQuotaStatus(used, quota) : null;

  async function addUsage() {
    const value = Number(amount.replace(",", "."));
    if (!quota) { Alert.alert("Aucun quota actif", "Créez d’abord un quota dans l’onglet Quotas."); return; }
    if (!Number.isFinite(value) || value <= 0) { Alert.alert("Valeur invalide", "Saisissez une quantité supérieure à zéro."); return; }
    if (busy) return;
    setBusy(true);
    try {
      const addedMB = value * 1024;
      const before = used / quota.limitMB * 100;
      const nextUsed = used + addedMB;
      const after = nextUsed / quota.limitMB * 100;
      const now = new Date();
      const next: UsageEntry[] = [{ id: `${now.getTime()}`, quotaId: quota.id, consumedMB: addedMB, updatedAt: now.toISOString(), periodKey: key, source: "manual" }, ...entries];
      await saveUsage(next);
      setEntries(next); setAmount("");
      for (const threshold of quota.alertThresholds ?? [50, 80, 100]) {
        if (before < threshold && after >= threshold) await sendQuotaAlert(threshold, nextUsed, quota.limitMB);
      }
    } catch { Alert.alert("Erreur", "La consommation n’a pas pu être enregistrée."); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
    <View style={s.header}><View><Text style={s.eyebrow}>VOTRE SUIVI INTERNET</Text><Text style={s.title}>Tableau de bord</Text></View><View style={s.avatar}><Text style={s.avatarText}>CL</Text></View></View>
    {quota && status ? <>
      <View style={s.card}><View style={s.cardHead}><Text style={s.cardLabel}>QUOTA {quota.period === "daily" ? "JOURNALIER" : quota.period === "weekly" ? "HEBDOMADAIRE" : "MENSUEL"}</Text><Text style={s.badge}>{quota.name}</Text></View>
        <View style={s.amountRow}><Text style={s.amount}>{formatData(used)}</Text><Text style={s.limit}>/ {formatData(quota.limitMB)}</Text></View>
        <View style={s.track}><View style={[s.fill, { width: `${Math.min(status.percentage, 100)}%`, backgroundColor: status.reached ? C.red : C.blue }]} /></View>
        <View style={s.between}><Text style={s.muted}>{status.percentage.toFixed(0)} % consommé</Text><Text style={[s.remaining, status.reached && { color: C.red }]}>{formatData(status.remainingMB)} restants</Text></View>
        <View style={s.divider}/><Text style={s.hint}>{status.reached ? "Votre limite est atteinte." : "Compteur cellulaire système, quand le module iOS est installé."}</Text>
      </View>
      <Text style={s.section}>Ajouter une consommation</Text>
      <View style={s.card}><Text style={s.muted}>Ajustement en Go si le compteur iOS n’est pas disponible. Évitez de saisir une consommation déjà incluse dans le compteur automatique.</Text><View style={s.entryRow}><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Ex. 0,25" placeholderTextColor="#98A2B3" style={s.input}/><Text style={s.inputUnit}>Go</Text></View><Pressable onPress={() => void addUsage()} disabled={busy} style={({ pressed }) => [s.button, pressed && { opacity: 0.85 }, busy && { opacity: 0.6 }]}><Text style={s.buttonText}>{busy ? "Enregistrement…" : "Enregistrer l’ajustement"}</Text></Pressable></View>
    </> : <View style={s.empty}><Text style={s.emptyIcon}>◉</Text><Text style={s.emptyTitle}>Commencez votre suivi</Text><Text style={s.muted}>Créez un quota dans l’onglet Quotas pour voir votre consommation ici.</Text></View>}
    <Text style={s.section}>Alertes</Text><View style={s.alertRow}>{[50, 80, 100].map((n) => <View key={n} style={s.alertChip}><Text style={s.alertText}>{n} %</Text></View>)}</View>
    {Platform.OS === "ios" && <View style={s.meterStatus}><View style={s.liveDot}/><Text style={s.meterStatusText}>{cellularStatus}</Text></View>}
    <Text style={s.disclaimer}>Le compteur iOS agrège les interfaces cellulaires lorsqu’il est disponible. Il peut se réinitialiser (notamment au redémarrage) et l’alerte peut attendre la prochaine ouverture de l’app. Il ne coupe pas Internet.</Text>
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, container: { padding: 20, paddingBottom: 32 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }, eyebrow: { color: C.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4 }, title: { color: C.dark, fontSize: 25, fontWeight: "800", marginTop: 5 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E5EDFF", alignItems: "center", justifyContent: "center" }, avatarText: { color: C.blue, fontWeight: "800" }, card: { backgroundColor: C.white, borderRadius: 20, padding: 19, borderWidth: 1, borderColor: C.border }, cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, cardLabel: { color: C.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, badge: { color: C.blue, backgroundColor: "#EEF4FF", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, fontSize: 10, fontWeight: "700" }, amountRow: { flexDirection: "row", alignItems: "baseline", marginTop: 19, marginBottom: 18 }, amount: { color: C.dark, fontSize: 38, fontWeight: "800" }, limit: { color: C.muted, fontSize: 15, marginLeft: 7 }, track: { height: 9, borderRadius: 8, backgroundColor: "#E9EDF5", overflow: "hidden" }, fill: { height: "100%", borderRadius: 8 }, between: { flexDirection: "row", justifyContent: "space-between", marginTop: 11 }, muted: { color: C.muted, fontSize: 12, lineHeight: 18 }, remaining: { color: C.green, fontSize: 12, fontWeight: "700" }, divider: { height: 1, backgroundColor: C.border, marginVertical: 16 }, hint: { color: C.muted, fontSize: 12, lineHeight: 18 }, section: { color: C.dark, fontSize: 18, fontWeight: "800", marginTop: 25, marginBottom: 12 }, entryRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }, input: { flex: 1, height: 48, borderWidth: 1, borderColor: C.border, borderRadius: 11, paddingHorizontal: 13, color: C.dark, backgroundColor: C.white }, inputUnit: { color: C.muted, fontWeight: "700" }, button: { marginTop: 13, backgroundColor: C.blue, padding: 14, borderRadius: 12, alignItems: "center" }, buttonText: { color: C.white, fontWeight: "800" }, alertRow: { flexDirection: "row", gap: 10 }, alertChip: { backgroundColor: "#FFF", borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 12, flex: 1, alignItems: "center" }, alertText: { color: C.dark, fontWeight: "800" }, meterStatus: { flexDirection: "row", gap: 9, alignItems: "center", marginTop: 19, alignSelf: "center" }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }, meterStatusText: { color: C.muted, fontSize: 11 }, disclaimer: { color: C.muted, textAlign: "center", fontSize: 11, lineHeight: 16, marginTop: 14 }, empty: { backgroundColor: C.white, padding: 25, alignItems: "center", borderRadius: 18, borderWidth: 1, borderColor: C.border }, emptyIcon: { color: C.blue, fontSize: 30, marginBottom: 10 }, emptyTitle: { color: C.dark, fontSize: 16, fontWeight: "800", marginBottom: 6 } });
