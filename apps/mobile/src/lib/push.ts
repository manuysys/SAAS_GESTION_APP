import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "@/src/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Registra el token de Expo Push. Si falla, no rompe el login. */
export async function registerForPush(tenantId: string): Promise<void> {
  try {
    if (Platform.OS === "web" || !Device.isDevice) {
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Trabajos",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0F766E",
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") {
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token) {
      await api.registerDevice(tenantId, token, Platform.OS);
    }
  } catch {
    // Push es opcional: la app sigue funcionando sin notificaciones.
  }
}
