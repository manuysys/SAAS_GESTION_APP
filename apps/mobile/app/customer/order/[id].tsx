import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, ErrorState, Loading, Muted, Screen, SectionTitle } from "@/src/components/ui";
import { api, ApiError } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, spacing, type } from "@/src/lib/theme";

const statusLabels: Record<string, string> = {
  new: "Nueva",
  scheduled: "Programada",
  in_progress: "En ejecución",
  waiting: "En espera",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

const appointmentStatus: Record<string, string> = {
  scheduled: "Programado",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "No asistió",
};

function formatArs(value: string | number) {
  return `$ ${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

export default function CustomerOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { customerSession } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["portal-order", customerSession?.tenantSlug, id],
    queryFn: () => api.portalOrder(customerSession!, id),
    enabled: Boolean(customerSession && id),
  });

  const approve = useMutation({
    mutationFn: (quoteId: string) => api.portalApproveQuote(customerSession!, quoteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal-order"] });
      void queryClient.invalidateQueries({ queryKey: ["portal-quotes"] });
      Alert.alert("Presupuesto aprobado", "La empresa recibió tu respuesta.");
    },
    onError: (error) =>
      Alert.alert("No se pudo aprobar", error instanceof ApiError ? error.message : "Intentá de nuevo."),
  });

  const reject = useMutation({
    mutationFn: (quoteId: string) => api.portalRejectQuote(customerSession!, quoteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal-order"] });
      void queryClient.invalidateQueries({ queryKey: ["portal-quotes"] });
      Alert.alert("Presupuesto rechazado", "La empresa recibió tu respuesta.");
    },
    onError: (error) =>
      Alert.alert("No se pudo rechazar", error instanceof ApiError ? error.message : "Intentá de nuevo."),
  });

  if (!customerSession) return <Redirect href="/customer" />;
  if (query.isLoading) return <Screen><Loading label="Cargando orden..." /></Screen>;
  if (query.isError || !query.data) {
    return (
      <Screen>
        <ErrorState message="No se pudo cargar la orden." onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  const order = query.data;
  const pendingQuotes = order.quotes.filter((quote) => quote.status === "sent");

  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>← Volver</Text>
      </Pressable>

      <Card>
        <View style={styles.rowBetween}>
          <Badge label={statusLabels[order.operational_status] ?? order.operational_status} tone="teal" />
          <Text style={styles.code}>{order.code}</Text>
        </View>
        <Text style={styles.title}>{order.title}</Text>
        {order.description ? <Muted>{order.description}</Muted> : null}
        {order.scheduled_at ? (
          <Muted>Programada: {new Date(order.scheduled_at).toLocaleString("es-AR")}</Muted>
        ) : (
          <Muted>Sin fecha programada.</Muted>
        )}
      </Card>

      <Card>
        <SectionTitle>Turnos</SectionTitle>
        {order.appointments.length === 0 ? (
          <Muted>No hay turnos agendados.</Muted>
        ) : (
          order.appointments.map((appointment) => (
            <View key={appointment.id} style={styles.rowBetween}>
              <Text style={styles.value}>
                {new Date(appointment.starts_at).toLocaleString("es-AR")}
              </Text>
              <Badge
                label={appointmentStatus[appointment.status] ?? appointment.status}
                tone="neutral"
              />
            </View>
          ))
        )}
      </Card>

      <Card>
        <SectionTitle>Presupuestos</SectionTitle>
        {order.quotes.length === 0 ? <Muted>No hay presupuestos para esta orden.</Muted> : null}
        {order.quotes.map((quote) => (
          <View key={quote.id} style={styles.quote}>
            <View style={styles.rowBetween}>
              <Text style={styles.code}>{quote.number}</Text>
              <Badge
                label={quote.status === "sent" ? "Pendiente" : quote.status}
                tone={quote.status === "approved" ? "success" : quote.status === "rejected" ? "danger" : "warning"}
              />
            </View>
            <Text style={styles.value}>{formatArs(quote.total)}</Text>
            {quote.items && quote.items.length > 0 ? (
              <View style={styles.items}>
                {quote.items.map((item, index) => (
                  <View key={`${quote.id}-${index}`} style={styles.itemRow}>
                    <Text style={styles.itemDescription}>
                      {item.quantity} × {item.description}
                    </Text>
                    <Text style={styles.muted}>{formatArs(item.line_total)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {quote.status === "sent" ? (
              <View style={styles.row}>
                <Button
                  title="Aprobar"
                  onPress={() =>
                    Alert.alert("Aprobar presupuesto", `¿Aprobás ${quote.number}?`, [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Aprobar", onPress: () => approve.mutate(quote.id) },
                    ])
                  }
                  style={styles.flex}
                />
                <Button
                  title="Rechazar"
                  variant="outline"
                  onPress={() =>
                    Alert.alert("Rechazar presupuesto", `¿Rechazás ${quote.number}?`, [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Rechazar",
                        style: "destructive",
                        onPress: () => reject.mutate(quote.id),
                      },
                    ])
                  }
                  style={styles.flex}
                />
              </View>
            ) : null}
          </View>
        ))}
        {pendingQuotes.length > 0 ? (
          <Muted>Respondé los presupuestos pendientes para que la empresa pueda avanzar.</Muted>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.teal, fontSize: type.small, fontWeight: "700", paddingVertical: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
  code: { color: colors.slate, fontSize: type.tiny, fontFamily: "monospace" },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700", lineHeight: 30 },
  value: { color: colors.ink, fontSize: type.body, fontWeight: "600" },
  items: { gap: 4, marginVertical: spacing.xs },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  itemDescription: { color: colors.ink, fontSize: type.small, flex: 1 },
  muted: { color: colors.slate, fontSize: type.small },
  quote: { gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.mist },
});
