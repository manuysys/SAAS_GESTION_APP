import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  Input,
  Loading,
  Muted,
  Screen,
  SectionTitle,
} from "@/src/components/ui";
import { api, ApiError } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { clientId } from "@/src/lib/id";
import { enqueueAction, flushPendingActions, pendingCount } from "@/src/lib/offline";
import { colors, radius, spacing, type } from "@/src/lib/theme";
import type { WorkOrderAttachment, WorkOrderMaterial } from "@/src/lib/types";

const statusLabels: Record<string, string> = {
  new: "Nueva",
  scheduled: "Programada",
  in_progress: "En ejecución",
  waiting: "En espera",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "teal"> = {
  new: "neutral",
  scheduled: "teal",
  in_progress: "warning",
  waiting: "teal",
  finished: "success",
  cancelled: "danger",
};

const actionsByStatus: Record<string, { to: string; label: string; variant: "primary" | "secondary" | "outline" }[]> = {
  scheduled: [{ to: "in_progress", label: "Iniciar trabajo", variant: "primary" }],
  in_progress: [
    { to: "waiting", label: "En espera", variant: "outline" },
    { to: "finished", label: "Finalizar", variant: "secondary" },
  ],
  waiting: [{ to: "in_progress", label: "Reanudar", variant: "primary" }],
};

export default function TechJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { techSession } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [material, setMaterial] = useState({ description: "", quantity: "1", unit: "u" });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [uploading, setUploading] = useState(false);

  const tenantId = techSession?.tenantId ?? "";

  const jobQuery = useQuery({
    queryKey: ["tech-job", tenantId, id],
    queryFn: () => api.techWorkOrder(tenantId, id),
    enabled: Boolean(tenantId && id),
  });
  const materialsQuery = useQuery({
    queryKey: ["tech-materials", tenantId, id],
    queryFn: () => api.techMaterials(tenantId, id),
    enabled: Boolean(tenantId && id),
  });
  const attachmentsQuery = useQuery({
    queryKey: ["tech-attachments", tenantId, id],
    queryFn: () => api.techAttachments(tenantId, id),
    enabled: Boolean(tenantId && id),
  });

  const transition = useMutation({
    mutationFn: (to: string) => api.techTransition(tenantId, id, to),
    onSuccess: () => {
      setMessage("Estado actualizado.");
      void queryClient.invalidateQueries({ queryKey: ["tech-job", tenantId, id] });
      void queryClient.invalidateQueries({ queryKey: ["tech-jobs"] });
    },
    onError: (error) => setMessage(error instanceof ApiError ? error.message : "No se pudo cambiar el estado."),
  });

  const noteMutation = useMutation({
    mutationFn: () => api.techNote(tenantId, id, note.trim(), clientId()),
    onSuccess: () => {
      setNote("");
      setMessage("Nota guardada.");
    },
    onError: async () => {
      const actionId = clientId();
      await enqueueAction(tenantId, {
        id: actionId,
        type: "note",
        orderId: id,
        notes: note.trim(),
        createdAt: new Date().toISOString(),
      });
      setNote("");
      setPending(await pendingCount(tenantId));
      setMessage("Sin conexión: la nota quedó guardada en el teléfono.");
    },
  });

  const materialMutation = useMutation({
    mutationFn: () =>
      api.techCreateMaterial(
        tenantId,
        id,
        {
          description: material.description.trim(),
          quantity: material.quantity,
          unit: material.unit,
        },
        clientId(),
      ),
    onSuccess: () => {
      setMaterial({ description: "", quantity: "1", unit: "u" });
      setMessage("Material registrado.");
      void queryClient.invalidateQueries({ queryKey: ["tech-materials", tenantId, id] });
    },
    onError: async () => {
      await enqueueAction(tenantId, {
        id: clientId(),
        type: "material",
        orderId: id,
        description: material.description.trim(),
        quantity: material.quantity,
        unit: material.unit,
        createdAt: new Date().toISOString(),
      });
      setMaterial({ description: "", quantity: "1", unit: "u" });
      setPending(await pendingCount(tenantId));
      setMessage("Sin conexión: el material quedó guardado en el teléfono.");
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    void (async () => {
      setPending(await pendingCount(tenantId));
      const sent = await flushPendingActions(tenantId);
      if (sent > 0) setPending(await pendingCount(tenantId));
    })();
  }, [tenantId]);

  if (!techSession) return <Redirect href="/tech" />;
  if (jobQuery.isLoading) return <Screen><Loading label="Cargando trabajo..." /></Screen>;
  if (jobQuery.isError || !jobQuery.data) {
    return (
      <Screen>
        <ErrorState message="No se pudo cargar el trabajo." onRetry={() => void jobQuery.refetch()} />
      </Screen>
    );
  }

  const job = jobQuery.data;
  const address = [job.customer_address, job.customer_city, job.customer_province, job.customer_postal_code]
    .filter(Boolean)
    .join(", ");
  const actions = actionsByStatus[job.operational_status] ?? [];

  async function takePhoto(fromCamera: boolean) {
    setMessage(null);
    let asset: { uri: string; fileName?: string | null; mimeType?: string } | null = null;
    try {
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara para subir fotos.");
          return;
        }
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
      if (result.canceled || !result.assets[0]) return;
      asset = result.assets[0];
      setUploading(true);
      const name = asset.fileName ?? `foto-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";
      await api.techUploadAttachment(
        tenantId,
        id,
        { uri: asset.uri, name, type: mimeType },
        clientId(),
      );
      setMessage("Foto subida.");
      void queryClient.invalidateQueries({ queryKey: ["tech-attachments", tenantId, id] });
    } catch (error) {
      const retryable =
        asset !== null &&
        !(error instanceof ApiError && error.status < 500) &&
        Boolean(FileSystem.documentDirectory);
      if (retryable && asset) {
        try {
          const actionId = clientId();
          const extension = (asset.fileName?.split(".").pop() ?? "jpg").toLowerCase();
          const target = `${FileSystem.documentDirectory}dovexo-${actionId}.${extension}`;
          await FileSystem.copyAsync({ from: asset.uri, to: target });
          await enqueueAction(tenantId, {
            id: actionId,
            type: "photo",
            orderId: id,
            uri: target,
            name: asset.fileName ?? `foto-${Date.now()}.jpg`,
            mimeType: asset.mimeType ?? "image/jpeg",
            createdAt: new Date().toISOString(),
          });
          setPending(await pendingCount(tenantId));
          setMessage("Sin conexión: la foto quedó guardada en el teléfono.");
        } catch {
          setMessage("No se pudo guardar la foto.");
        }
      } else {
        setMessage(error instanceof ApiError ? error.message : "No se pudo subir la foto.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>← Mis trabajos</Text>
      </Pressable>

      <Card>
        <View style={styles.rowBetween}>
          <Badge label={statusLabels[job.operational_status] ?? job.operational_status} tone={statusTones[job.operational_status] ?? "neutral"} />
          <Text style={styles.code}>{job.code}</Text>
        </View>
        <Text style={styles.title}>{job.title}</Text>
        {job.description ? <Muted>{job.description}</Muted> : null}
        <Divider />
        <Text style={styles.label}>Cliente</Text>
        <Text style={styles.value}>{job.customer_name ?? "Cliente"}</Text>
        {job.customer_phone ? (
          <Pressable onPress={() => void Linking.openURL(`tel:${job.customer_phone}`)}>
            <Text style={styles.link}>Llamar a {job.customer_phone}</Text>
          </Pressable>
        ) : null}
        {address ? <Text style={styles.value}>{address}</Text> : <Muted>Sin dirección cargada.</Muted>}
        {job.scheduled_at ? (
          <Muted>Programada: {new Date(job.scheduled_at).toLocaleString("es-AR")}</Muted>
        ) : (
          <Muted>Sin programar</Muted>
        )}
      </Card>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {pending > 0 ? <Badge label={`${pending} pendiente(s) de sincronizar`} tone="warning" /> : null}

      <Card>
        <SectionTitle>Acciones</SectionTitle>
        {actions.length === 0 ? (
          <Muted>No hay acciones disponibles para este estado.</Muted>
        ) : (
          actions.map((action) => (
            <Button
              key={action.to}
              title={action.label}
              variant={action.variant}
              loading={transition.isPending && transition.variables === action.to}
              onPress={() => transition.mutate(action.to)}
            />
          ))
        )}
      </Card>

      <Card>
        <SectionTitle>Agregar nota</SectionTitle>
        <Input
          value={note}
          onChangeText={setNote}
          placeholder="Qué pasó en la visita..."
          multiline
          style={{ minHeight: 90 }}
        />
        <Button
          title="Guardar nota"
          onPress={() => noteMutation.mutate()}
          loading={noteMutation.isPending}
          disabled={!note.trim()}
        />
      </Card>

      <Card>
        <SectionTitle>Materiales</SectionTitle>
        <Input
          label="Descripción"
          value={material.description}
          onChangeText={(value) => setMaterial((current) => ({ ...current, description: value }))}
          placeholder="Cable UTP"
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Input
              label="Cantidad"
              value={material.quantity}
              onChangeText={(value) => setMaterial((current) => ({ ...current, quantity: value }))}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <Input
              label="Unidad"
              value={material.unit}
              onChangeText={(value) => setMaterial((current) => ({ ...current, unit: value }))}
              placeholder="u, m, kg"
            />
          </View>
        </View>
        <Button
          title="Agregar material"
          variant="outline"
          onPress={() => materialMutation.mutate()}
          loading={materialMutation.isPending}
          disabled={!material.description.trim()}
        />
        <MaterialList items={materialsQuery.data ?? []} />
      </Card>

      <Card>
        <SectionTitle>Fotos</SectionTitle>
        <View style={styles.row}>
          <Button title="Cámara" onPress={() => void takePhoto(true)} loading={uploading} style={styles.flex} />
          <Button
            title="Galería"
            variant="outline"
            onPress={() => void takePhoto(false)}
            loading={uploading}
            style={styles.flex}
          />
        </View>
        <AttachmentList items={attachmentsQuery.data ?? []} />
      </Card>

      <Card>
        <SectionTitle>Historial</SectionTitle>
        <Muted>Creada: {new Date(job.created_at).toLocaleString("es-AR")}</Muted>
        {job.started_at ? <Muted>Iniciada: {new Date(job.started_at).toLocaleString("es-AR")}</Muted> : null}
        {job.finished_at ? <Muted>Finalizada: {new Date(job.finished_at).toLocaleString("es-AR")}</Muted> : null}
      </Card>
    </Screen>
  );
}

function MaterialList({ items }: { items: WorkOrderMaterial[] }) {
  if (items.length === 0) return <Muted>Todavía no hay materiales cargados.</Muted>;
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <Text style={styles.value}>{item.description}</Text>
          <Text style={styles.muted}>
            {item.quantity} {item.unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

function AttachmentList({ items }: { items: WorkOrderAttachment[] }) {
  if (items.length === 0) return <Muted>Todavía no hay fotos.</Muted>;
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <Text style={styles.value} numberOfLines={1}>
            {item.filename}
          </Text>
          <Text style={styles.muted}>{Math.round(item.size_bytes / 1024)} KB</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.teal, fontSize: type.small, fontWeight: "700", paddingVertical: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { color: colors.slate, fontSize: type.tiny, fontFamily: "monospace" },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700", lineHeight: 30, letterSpacing: -0.4 },
  label: { color: colors.slate, fontSize: type.tiny, fontWeight: "700", textTransform: "uppercase" },
  value: { color: colors.ink, fontSize: type.body, fontWeight: "600" },
  link: { color: colors.teal, fontSize: type.body, fontWeight: "700", paddingVertical: spacing.xs },
  message: {
    backgroundColor: colors.tealSoft,
    color: colors.teal,
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: type.small,
    fontWeight: "600",
  },
  row: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  listRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  muted: { color: colors.slate, fontSize: type.small },
});
