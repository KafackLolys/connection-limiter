
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Quota = {
  id: string;
  name: string;
  limitMB: number;
  period: "daily" | "weekly" | "monthly";
  action: "alert" | "block";
  enabled: boolean;
  alertThresholds: number[];
};

const STORAGE_KEY = "@connection_limiter/quotas";

const COLORS = {
  background: "#F5F7FB",
  primary: "#3478F6",
  dark: "#101828",
  secondary: "#667085",
  white: "#FFFFFF",
  border: "#EAECF0",
  red: "#DC2626",
  green: "#16A36A",
};

const PERIODS = [
  { label: "Jour", value: "daily" },
  { label: "Semaine", value: "weekly" },
  { label: "Mois", value: "monthly" },
] as const;

export default function QuotasScreen() {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("2");
  const [unit, setUnit] = useState<"MB" | "GB">("GB");
  const [period, setPeriod] =
    useState<Quota["period"]>("daily");
  const [action, setAction] =
    useState<Quota["action"]>("alert");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotas();
  }, []);

  async function loadQuotas() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setQuotas(JSON.parse(stored));
      }
    } catch {
      Alert.alert("Erreur", "Impossible de charger les quotas.");
    } finally {
      setLoading(false);
    }
  }

  async function persistQuotas(updated: Quota[]) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );
      setQuotas(updated);
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer les quotas.");
    }
  }

  function resetForm() {
    setName("");
    setLimit("2");
    setUnit("GB");
    setPeriod("daily");
    setAction("alert");
    setEditingId(null);
  }

  async function saveQuota() {
    const value = Number(limit.replace(",", "."));

    if (!name.trim()) {
      Alert.alert("Nom manquant", "Donnez un nom à votre quota.");
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert("Limite invalide", "Entrez une limite supérieure à zéro.");
      return;
    }

    const quota: Quota = {
      id: editingId ?? Date.now().toString(),
      name: name.trim(),
      limitMB: Math.round(value * (unit === "GB" ? 1024 : 1)),
      period,
      action,
      enabled: true,
      alertThresholds: [50, 80, 100],
    };

    const updated = editingId
      ? quotas.map((item) =>
          item.id === editingId ? quota : item
        )
      : [...quotas, quota];

    await persistQuotas(updated);
    resetForm();
  }

  function editQuota(quota: Quota) {
    setEditingId(quota.id);
    setName(quota.name);
    setUnit(quota.limitMB < 1024 ? "MB" : "GB");
    setLimit((quota.limitMB / (quota.limitMB < 1024 ? 1 : 1024)).toString());
    setPeriod(quota.period);
    setAction(quota.action);
  }

  function deleteQuota(id: string) {
    Alert.alert(
      "Supprimer ce quota ?",
      "Cette opération est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            void persistQuotas(
              quotas.filter((item) => item.id !== id)
            );
            if (editingId === id) resetForm();
          },
        },
      ]
    );
  }

  async function toggleQuota(quota: Quota) {
    const updated = quotas.map((item) =>
      item.id === quota.id
        ? { ...item, enabled: !item.enabled }
        : item
    );
    await persistQuotas(updated);
  }

  function periodLabel(value: Quota["period"]) {
    return PERIODS.find((item) => item.value === value)?.label ?? value;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Mes quotas</Text>
        <Text style={styles.subtitle}>
          Configurez vos limites de consommation Internet.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {editingId ? "Modifier le quota" : "Nouveau quota"}
          </Text>

          <Text style={styles.label}>Nom du quota</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : Mon forfait Internet"
            placeholderTextColor="#98A2B3"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Limite de consommation</Text>
          <View style={styles.limitInputRow}><TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ex : 2"
            placeholderTextColor="#98A2B3"
            keyboardType="decimal-pad"
            value={limit}
            onChangeText={setLimit}
          /><View style={styles.options}>{(["MB", "GB"] as const).map((item) => <Pressable key={item} onPress={() => setUnit(item)} style={[styles.unitOption, unit === item && styles.optionActive]}><Text style={[styles.optionText, unit === item && styles.optionTextActive]}>{item}</Text></Pressable>)}</View></View>

          <Text style={styles.label}>Période</Text>
          <View style={styles.options}>
            {PERIODS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setPeriod(item.value)}
                style={[
                  styles.option,
                  period === item.value && styles.optionActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    period === item.value && styles.optionTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Action au dépassement</Text>
          <View style={styles.options}>
            <Pressable
              onPress={() => setAction("alert")}
              style={[
                styles.option,
                action === "alert" && styles.optionActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  action === "alert" && styles.optionTextActive,
                ]}
              >
                Alerter
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setAction("block")}
              style={[
                styles.option,
                action === "block" && styles.optionActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  action === "block" && styles.optionTextActive,
                ]}
              >
                Bloquer*
              </Text>
            </Pressable>
          </View>

          {action === "block" && (
            <Text style={styles.warning}>
              * Le blocage global de la connexion n'est pas disponible
              dans cette version iOS sans VPN.
            </Text>
          )}

          <Pressable style={styles.saveButton} onPress={saveQuota}>
            <Text style={styles.saveButtonText}>
              {editingId ? "Enregistrer les modifications" : "Ajouter le quota"}
            </Text>
          </Pressable>

          {editingId && (
            <Pressable onPress={resetForm} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Annuler la modification</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          Quotas enregistrés ({quotas.length})
        </Text>

        {loading ? (
          <Text style={styles.emptyText}>Chargement...</Text>
        ) : quotas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Aucun quota configuré</Text>
            <Text style={styles.emptyText}>
              Ajoutez votre premier quota pour commencer.
            </Text>
          </View>
        ) : (
          quotas.map((quota) => (
            <View key={quota.id} style={styles.quotaCard}>
              <View style={styles.quotaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quotaName}>{quota.name}</Text>
                  <Text style={styles.quotaDetails}>
              {quota.limitMB >= 1024 ? `${(quota.limitMB / 1024).toFixed(2)} Go` : `${quota.limitMB} Mo`} ·{" "}
                    {periodLabel(quota.period)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.status,
                    { color: quota.enabled ? COLORS.green : COLORS.secondary },
                  ]}
                >
                  {quota.enabled ? "Actif" : "Inactif"}
                </Text>
              </View>

              <Text style={styles.actionText}>
                Action : {quota.action === "alert" ? "Alerte" : "Blocage demandé"}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => editQuota(quota)}
                  style={styles.editButton}
                >
                  <Text style={styles.editText}>Modifier</Text>
                </Pressable>

                <Pressable
                  onPress={() => void toggleQuota(quota)}
                  style={styles.toggleButton}
                >
                  <Text style={styles.editText}>
                    {quota.enabled ? "Désactiver" : "Activer"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => deleteQuota(quota.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteText}>Supprimer</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.disclaimer}>
          Les quotas sont sauvegardés localement sur votre appareil.
          La mesure réelle de la consommation globale iOS reste à intégrer.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.dark },
  subtitle: { color: COLORS.secondary, marginTop: 7, marginBottom: 22 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: COLORS.dark, marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.dark, marginBottom: 8, marginTop: 14 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    color: COLORS.dark,
    backgroundColor: "#FFFFFF",
  },
  limitInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  unitOption: { paddingHorizontal: 13, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, alignItems: "center" },
  options: { flexDirection: "row", gap: 9 },
  option: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
  },
  optionActive: { backgroundColor: "#E5EDFF", borderColor: COLORS.primary },
  optionText: { color: COLORS.secondary, fontWeight: "600" },
  optionTextActive: { color: COLORS.primary },
  warning: { color: COLORS.red, fontSize: 11, lineHeight: 17, marginTop: 10 },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 22,
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "800" },
  cancelButton: { alignItems: "center", padding: 12 },
  cancelText: { color: COLORS.secondary, fontWeight: "600" },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: COLORS.dark, marginTop: 28, marginBottom: 14 },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 30, marginBottom: 10 },
  emptyTitle: { color: COLORS.dark, fontWeight: "800", fontSize: 16 },
  emptyText: { color: COLORS.secondary, fontSize: 12, marginTop: 8, textAlign: "center" },
  quotaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quotaHeader: { flexDirection: "row", alignItems: "center" },
  quotaName: { fontSize: 16, fontWeight: "800", color: COLORS.dark },
  quotaDetails: { color: COLORS.secondary, marginTop: 5, fontSize: 12 },
  status: { fontWeight: "700", fontSize: 12 },
  actionText: { color: COLORS.secondary, fontSize: 12, marginTop: 13 },
  actions: { flexDirection: "row", gap: 8, marginTop: 15, flexWrap: "wrap" },
  editButton: { backgroundColor: "#E5EDFF", padding: 10, borderRadius: 9 },
  toggleButton: { backgroundColor: "#F2F4F7", padding: 10, borderRadius: 9 },
  deleteButton: { backgroundColor: "#FEF2F2", padding: 10, borderRadius: 9 },
  editText: { color: COLORS.primary, fontWeight: "700", fontSize: 11 },
  deleteText: { color: COLORS.red, fontWeight: "700", fontSize: 11 },
  disclaimer: { color: COLORS.secondary, fontSize: 11, lineHeight: 17, marginTop: 20, textAlign: "center" },
});
