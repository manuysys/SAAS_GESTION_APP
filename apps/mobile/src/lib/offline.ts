import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { api } from "@/src/lib/api";

export type PendingAction =
  | {
      id: string;
      type: "note";
      orderId: string;
      notes: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "material";
      orderId: string;
      description: string;
      quantity: string;
      unit: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "photo";
      orderId: string;
      uri: string;
      name: string;
      mimeType: string;
      createdAt: string;
    };

function key(tenantId: string) {
  return `arreglo.offline.${tenantId}`;
}

export async function getPendingActions(tenantId: string): Promise<PendingAction[]> {
  const raw = await AsyncStorage.getItem(key(tenantId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingAction[];
  } catch {
    return [];
  }
}

async function savePendingActions(tenantId: string, actions: PendingAction[]) {
  await AsyncStorage.setItem(key(tenantId), JSON.stringify(actions));
}

export async function enqueueAction(tenantId: string, action: PendingAction) {
  const actions = await getPendingActions(tenantId);
  actions.push(action);
  await savePendingActions(tenantId, actions);
}

export async function pendingCount(tenantId: string) {
  return (await getPendingActions(tenantId)).length;
}

/** Intenta enviar la cola. Si falla por red, deja el resto para el próximo intento. */
export async function flushPendingActions(tenantId: string): Promise<number> {
  const actions = await getPendingActions(tenantId);
  if (actions.length === 0) return 0;

  const remaining: PendingAction[] = [];
  let sent = 0;

  for (const action of actions) {
    try {
      if (action.type === "note") {
        await api.techNote(tenantId, action.orderId, action.notes, action.id);
      } else if (action.type === "material") {
        await api.techCreateMaterial(
          tenantId,
          action.orderId,
          {
            description: action.description,
            quantity: action.quantity,
            unit: action.unit,
          },
          action.id,
        );
      } else {
        await api.techUploadAttachment(
          tenantId,
          action.orderId,
          { uri: action.uri, name: action.name, type: action.mimeType },
          action.id,
        );
        await FileSystem.deleteAsync(action.uri, { idempotent: true }).catch(
          () => undefined,
        );
      }
      sent += 1;
    } catch {
      remaining.push(action);
    }
  }

  await savePendingActions(tenantId, remaining);
  return sent;
}
