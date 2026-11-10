import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

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
  Title,
} from "@/src/components/ui";
import { api, ApiError, DEMO_TENANT_SLUG } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, radius, spacing, type } from "@/src/lib/theme";
import type { PortalQuote, PortalSession } from "@/src/lib/types";

const quoteStatus: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviado",
  approved: "Aprobado",
  rejected: "Rechazado",
  expired: "Vencido",
};

const orderStatus: Record<string, string> = {
  new: "Nueva",
  scheduled: "Programada",
  in_progress: "En ejecución",
  waiting: "En espera",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

const paymentMethod: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  mercadopago: "Mercado Pago",
  other: "Otro",
};

const paymentStatus: Record<string, string> = {
  registered: "Registrado",
  voided: "Anulado",
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

export default function CustomerScreen() {
  const { loading, customerSession } = useAuth();

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Cargando sesión..." />
      </Screen>
    );
  }

  if (!customerSession) {
    return <CustomerLogin />;
  }

  return <CustomerHome session={customerSession} />;
}

function CustomerLogin() {
  const router = useRouter();
  const { customerLogin } = useAuth();
  const [tenantSlug, setTenantSlug] = useState(DEMO_TENANT_SLUG);
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [contact, setContact] = useState("carlos@example.com");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestAccess() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const data = await api.portalRequestAccess(
        tenantSlug.trim(),
        mode === "email" ? { email: contact.trim() } : { phone: contact.trim() },
      );
      setMessage(data.message);
      if (data.dev_token) {
        setToken(data.dev_token);
        setMessage("Modo demo: usá el código que aparece abajo.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo solicitar el acceso.");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setError(null);
    setLoading(true);
    try {
      const session = await api.portalVerify(tenantSlug.trim(), token.trim());
      await customerLogin(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Código inválido o vencido.");
    } finally {
      setLoading(false);
    }
  }

  async function demo() {
    setError(null);
    setLoading(true);
    try {
      const session = await api.portalDemo(DEMO_TENANT_SLUG);
      await customerLogin(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "La demo no está disponible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>← Volver</Text>
      </Pressable>
      <Title>Ingreso de cliente</Title>
      <Muted>Pedí acceso a la empresa y recibí un código por email o WhatsApp.</Muted>

      <Card>
        <Input
          label="Código de empresa"
          value={tenantSlug}
          onChangeText={setTenantSlug}
          autoCapitalize="none"
          placeholder="servicios-demo"
        />
        <View style={styles.chips}>
          {(
            [
              { value: "email", label: "Email" },
              { value: "phone", label: "Teléfono" },
            ] as const
          ).map((item) => {
            const active = mode === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  setMode(item.value);
                  setContact("");
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Input
          label={mode === "email" ? "Email" : "Teléfono"}
          value={contact}
          onChangeText={setContact}
          autoCapitalize="none"
          keyboardType={mode === "email" ? "email-address" : "phone-pad"}
          placeholder={mode === "email" ? "tu@email.com" : "+54 11 5555-1001"}
        />
        <Button title="Enviar acceso" onPress={() => void requestAccess()} loading={loading} />
        {message ? <Text style={styles.info}>{message}</Text> : null}
        <Divider />
        <Input
          label="Código o token"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder="Pegá el código recibido"
        />
        <Button
          title="Ingresar"
          variant="secondary"
          onPress={() => void verify()}
          disabled={!token.trim()}
          loading={loading}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <Card>
        <SectionTitle>Demo</SectionTitle>
        <Muted>Explorá la experiencia del cliente con datos de ejemplo.</Muted>
        <Button title="Probar demo de cliente" variant="outline" onPress={() => void demo()} />
      </Card>
    </Screen>
  );
}

function CustomerHome({ session }: { session: PortalSession }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { customerLogout } = useAuth();

  const summary = useQuery({
    queryKey: ["portal-summary", session.tenantSlug],
    queryFn: () => api.portalSummary(session),
  });
  const orders = useQuery({
    queryKey: ["portal-orders", session.tenantSlug],
    queryFn: () => api.portalOrders(session),
  });
  const quotes = useQuery({
    queryKey: ["portal-quotes", session.tenantSlug],
    queryFn: () => api.portalQuotes(session),
  });
  const appointments = useQuery({
    queryKey: ["portal-appointments", session.tenantSlug],
    queryFn: () => api.portalAppointments(session),
  });
  const payments = useQuery({
    queryKey: ["portal-payments", session.tenantSlug],
    queryFn: () => api.portalPayments(session),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.portalApproveQuote(session, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal-quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["portal-summary"] });
      Alert.alert("Presupuesto aprobado", "La empresa recibió tu respuesta.");
    },
    onError: (error) =>
      Alert.alert("No se pudo aprobar", error instanceof ApiError ? error.message : "Intentá de nuevo."),
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.portalRejectQuote(session, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal-quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["portal-summary"] });
      Alert.alert("Presupuesto rechazado", "La empresa recibió tu respuesta.");
    },
    onError: (error) =>
      Alert.alert("No se pudo rechazar", error instanceof ApiError ? error.message : "Intentá de nuevo."),
  });

  const pendingQuotes = (quotes.data ?? []).filter((quote) => quote.status === "sent");

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>CLIENTE</Text>
          <Text style={styles.headerTitle}>{session.tenant.name}</Text>
          <Muted>{session.customer.name}</Muted>
        </View>
        <Pressable onPress={() => void customerLogout()} accessibilityRole="button">
          <Text style={styles.logout}>Salir</Text>
        </Pressable>
      </View>

      <Button title="Pedir un servicio" onPress={() => router.push("/customer/request")} />

      {summary.isLoading ? <Loading label="Cargando resumen..." /> : null}
      {summary.isError ? (
        <ErrorState message="No se pudo cargar el resumen." onRetry={() => void summary.refetch()} />
      ) : null}

      {summary.data ? (
        <View style={styles.stats}>
          <Stat label="Solicitudes abiertas" value={summary.data.open_requests} />
          <Stat label="Órdenes abiertas" value={summary.data.open_orders} />
          <Stat label="Presupuestos pendientes" value={summary.data.pending_quotes} />
        </View>
      ) : null}

      {summary.data?.next_appointment ? (
        <Card>
          <SectionTitle>Próximo turno</SectionTitle>
          <Text style={styles.value}>
            {new Date(summary.data.next_appointment.starts_at).toLocaleString("es-AR")}
          </Text>
          <Muted>
            {summary.data.next_appointment.order_code ?? "Orden"} ·{" "}
            {summary.data.next_appointment.order_title ?? "Visita"}
          </Muted>
          {summary.data.next_appointment.technician_name ? (
            <Muted>Técnico: {summary.data.next_appointment.technician_name}</Muted>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Mis turnos</SectionTitle>
        {appointments.isLoading ? <Loading label="Cargando turnos..." /> : null}
        {appointments.data?.length === 0 ? <Muted>No tenés turnos agendados.</Muted> : null}
        {(appointments.data ?? [])
          .filter((appointment) => new Date(appointment.starts_at) >= new Date())
          .sort(
            (a, b) =>
              new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
          )
          .slice(0, 3)
          .map((appointment) => (
            <View key={appointment.id} style={styles.orderRow}>
              <View style={styles.orderText}>
                <Text style={styles.value}>
                  {new Date(appointment.starts_at).toLocaleString("es-AR")}
                </Text>
                <Muted>
                  {new Date(appointment.ends_at).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Muted>
              </View>
              <Badge
                label={appointmentStatus[appointment.status] ?? appointment.status}
                tone="teal"
              />
            </View>
          ))}
      </Card>

      <Card>
        <SectionTitle>Mis pagos</SectionTitle>
        {payments.isLoading ? <Loading label="Cargando pagos..." /> : null}
        {payments.data?.length === 0 ? <Muted>Todavía no hay pagos registrados.</Muted> : null}
        {(payments.data ?? []).slice(0, 3).map((payment) => (
          <View key={payment.id} style={styles.orderRow}>
            <View style={styles.orderText}>
              <Text style={styles.value}>{formatArs(payment.amount)}</Text>
              <Muted>
                {paymentMethod[payment.method] ?? payment.method} ·{" "}
                {new Date(payment.paid_at).toLocaleDateString("es-AR")}
              </Muted>
            </View>
            <Badge
              label={paymentStatus[payment.status] ?? payment.status}
              tone={payment.status === "voided" ? "danger" : "success"}
            />
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle>Presupuestos para responder</SectionTitle>
        {pendingQuotes.length === 0 ? (
          <Muted>No tenés presupuestos pendientes.</Muted>
        ) : (
          pendingQuotes.map((quote) => (
            <QuoteRow
              key={quote.id}
              quote={quote}
              onApprove={() =>
                Alert.alert("Aprobar presupuesto", `¿Aprobás ${quote.number} por ${formatArs(quote.total)}?`, [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Aprobar", onPress: () => approve.mutate(quote.id) },
                ])
              }
              onReject={() =>
                Alert.alert("Rechazar presupuesto", `¿Rechazás ${quote.number}?`, [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Rechazar", style: "destructive", onPress: () => reject.mutate(quote.id) },
                ])
              }
            />
          ))
        )}
      </Card>

      <Card>
        <SectionTitle>Mis órdenes</SectionTitle>
        {orders.isLoading ? <Loading label="Cargando órdenes..." /> : null}
        {orders.data?.length === 0 ? <Muted>Todavía no tenés órdenes.</Muted> : null}
        {orders.data?.map((order) => (
          <Pressable
            key={order.id}
            onPress={() => router.push({ pathname: "/customer/order/[id]", params: { id: order.id } })}
            accessibilityRole="button"
            style={styles.orderRow}
          >
            <View style={styles.orderText}>
              <Text style={styles.code}>{order.code}</Text>
              <Text style={styles.value}>{order.title}</Text>
              <Muted>{orderStatus[order.operational_status] ?? order.operational_status}</Muted>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <SectionTitle>Mis presupuestos</SectionTitle>
        {quotes.data?.length === 0 ? <Muted>Todavía no tenés presupuestos.</Muted> : null}
        {quotes.data?.map((quote) => (
          <View key={quote.id} style={styles.orderRow}>
            <View style={styles.orderText}>
              <Text style={styles.code}>{quote.number}</Text>
              <Text style={styles.value}>{formatArs(quote.total)}</Text>
              <Muted>{quoteStatus[quote.status] ?? quote.status}</Muted>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuoteRow({
  quote,
  onApprove,
  onReject,
}: {
  quote: PortalQuote;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.quote}>
      <View style={styles.rowBetween}>
        <Text style={styles.code}>{quote.number}</Text>
        <Badge label={quoteStatus[quote.status] ?? quote.status} tone="warning" />
      </View>
      <Text style={styles.value}>{formatArs(quote.total)}</Text>
      {quote.valid_until ? (
        <Muted>Válido hasta {new Date(quote.valid_until).toLocaleDateString("es-AR")}</Muted>
      ) : null}
      <View style={styles.row}>
        <Button title="Aprobar" onPress={onApprove} style={styles.flex} />
        <Button title="Rechazar" variant="outline" onPress={onReject} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerText: { gap: 2, flex: 1 },
  eyebrow: { color: colors.teal, fontSize: type.tiny, fontWeight: "800", letterSpacing: 1.4 },
  headerTitle: { color: colors.ink, fontSize: 30, fontWeight: "700", letterSpacing: -0.8 },
  logout: { color: colors.danger, fontSize: type.small, fontWeight: "700", padding: spacing.sm },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mist,
    padding: spacing.md,
    gap: 2,
  },
  statValue: { color: colors.ink, fontSize: 26, fontWeight: "700" },
  statLabel: { color: colors.slate, fontSize: 11, lineHeight: 14 },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
  },
  orderText: { flex: 1, gap: 2 },
  code: { color: colors.slate, fontSize: type.tiny, fontFamily: "monospace" },
  value: { color: colors.ink, fontSize: type.body, fontWeight: "600" },
  chevron: { color: colors.slate, fontSize: 26 },
  quote: { gap: spacing.sm, paddingVertical: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  flex: { flex: 1 },
  back: { color: colors.teal, fontSize: type.small, fontWeight: "700", paddingVertical: spacing.sm },
  info: {
    backgroundColor: colors.tealSoft,
    color: colors.teal,
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: type.small,
  },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.mist,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.slate, fontSize: type.small, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  error: { color: colors.danger, fontSize: type.small },
});
