
import { Tabs } from "expo-router";
import { Text } from "react-native";

const icons: Record<string, string> = {
  index: "⌂",
  quotas: "◉",
  history: "◷",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#3478F6",
        tabBarInactiveTintColor: "#98A2B3",
        tabBarStyle: {
          height: 84,
          paddingTop: 10,
          paddingBottom: 22,
          borderTopColor: "#EAECF0",
          backgroundColor: "#FFFFFF",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 22 }}>
            {icons[route.name] ?? "•"}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="quotas" options={{ title: "Quotas" }} />
      <Tabs.Screen name="history" options={{ title: "Historique" }} />
    </Tabs>
  );
}
