import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { UsageEntry } from "../../features/quota/quota.types";
import { formatData } from "../../features/quota/quota.utils";
import { getQuotas, getUsage } from "../../services/storage.service";

export default function HistoryScreen() {
  const [entries, setEntries] = useState<UsageEntry[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([getUsage(), getQuotas()]).then(([usage, quotas]) => {
      if (active) { setEntries(usage); setNames(Object.fromEntries(quotas.map((q) => [q.id, q.name]))); }
    }).catch(() => { if (active) setEntries([]); });
    return () => { active = false; };
  }, []));

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.container}>
    <Text style={s.eyebrow}>VOS DONNÉES</Text><Text style={s.title}>Historique</Text><Text style={s.subtitle}>Saisies de consommation enregistrées sur cet appareil.</Text>
    {entries.length === 0 ? <View style={s.empty}><Text style={s.icon}>◷</Text><Text style={s.emptyTitle}>Aucune consommation</Text><Text style={s.subtitle}>Les consommations comptabilisées apparaîtront ici.</Text></View> : entries.map((entry) => <View key={entry.id} style={s.row}><View style={s.dot}/><View style={s.details}><Text style={s.name}>{names[entry.quotaId] ?? "Quota supprimé"}</Text><Text style={s.date}>{entry.source === "cellular" ? "Cellulaire · automatique" : "Saisie manuelle"} · {new Date(entry.updatedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</Text></View><Text style={s.value}>+{formatData(entry.consumedMB)}</Text></View>)}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F5F7FB" }, container: { padding: 20, paddingBottom: 35 }, eyebrow: { color: "#667085", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginTop: 8 }, title: { fontSize: 27, fontWeight: "800", color: "#101828", marginTop: 5 }, subtitle: { color: "#667085", marginTop: 7, fontSize: 13, lineHeight: 19 }, empty: { marginTop: 28, backgroundColor: "#FFF", padding: 24, alignItems: "center", borderRadius: 18, borderWidth: 1, borderColor: "#EAECF0" }, icon: { color: "#3478F6", fontSize: 30, marginBottom: 9 }, emptyTitle: { fontSize: 16, fontWeight: "800", color: "#101828" }, row: { flexDirection: "row", alignItems: "center", padding: 16, marginTop: 12, backgroundColor: "#FFF", borderRadius: 15, borderWidth: 1, borderColor: "#EAECF0" }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#3478F6", marginRight: 12 }, details: { flex: 1 }, name: { color: "#101828", fontSize: 14, fontWeight: "700" }, date: { color: "#667085", fontSize: 11, marginTop: 5 }, value: { color: "#3478F6", fontWeight: "800", fontSize: 13 } });
