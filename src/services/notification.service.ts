
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const result = await Notifications.requestPermissionsAsync();

  return result.granted;
}

export async function sendQuotaAlert(
  percentage: number,
  consumedMB: number,
  limitMB: number
) {
  const allowed = await requestNotificationPermission();

  if (!allowed) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Connection Limiter",
      body:
        percentage >= 100
          ? "Votre quota Internet est atteint."
          : `Vous avez utilisé ${percentage.toFixed(0)} % de votre quota.`,
      data: {
        consumedMB,
        limitMB,
        percentage,
      },
    },
    trigger: null,
  });

  return true;
}
