import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing, type } from "@/src/lib/theme";

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const content = <View style={[styles.screenContent, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[variant],
        pressed && !isDisabled ? styles.buttonPressed : null,
        isDisabled ? styles.buttonDisabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? colors.ink : "#fff"} />
      ) : (
        <Text style={[styles.buttonText, buttonTextStyles[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  style,
  ...props
}: TextInputProps & { label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={styles.inputGroup}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.slate}
        style={[styles.input, style as never]}
        {...props}
      />
    </View>
  );
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "teal";
}) {
  return (
    <View style={[styles.badge, badgeStyles[tone]]}>
      <Text style={[styles.badgeText, badgeTextStyles[tone]]}>{label}</Text>
    </View>
  );
}

export function Loading({ label = "Cargando..." }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.teal} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card style={styles.errorCard}>
      <Text style={styles.errorTitle}>Algo salió mal</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? <Button title="Reintentar" onPress={onRetry} variant="outline" /> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.teal },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.mist },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: "transparent" },
});

const buttonTextStyles = StyleSheet.create({
  primary: { color: "#fff" },
  secondary: { color: "#fff" },
  outline: { color: colors.ink },
  danger: { color: "#fff" },
  ghost: { color: colors.teal },
});

const badgeStyles = StyleSheet.create({
  neutral: { backgroundColor: colors.mist },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.amberSoft },
  danger: { backgroundColor: colors.dangerSoft },
  teal: { backgroundColor: colors.tealSoft },
});

const badgeTextStyles = StyleSheet.create({
  neutral: { color: colors.ink },
  success: { color: colors.success },
  warning: { color: "#92400E" },
  danger: { color: colors.danger },
  teal: { color: colors.teal },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { paddingBottom: spacing.xxl },
  screenContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.mist,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: type.display, fontWeight: "700", color: colors.ink, letterSpacing: -0.8 },
  subtitle: { fontSize: type.body, color: colors.slate, lineHeight: 22 },
  muted: { fontSize: type.small, color: colors.slate, lineHeight: 19 },
  sectionTitle: {
    fontSize: type.tiny,
    fontWeight: "700",
    color: colors.slate,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: type.body, fontWeight: "700" },
  inputGroup: { gap: spacing.xs },
  label: { fontSize: type.small, fontWeight: "600", color: colors.ink },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.mist,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    fontSize: type.body,
    color: colors.ink,
  },
  badge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: type.tiny, fontWeight: "700" },
  center: { alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  errorCard: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  errorTitle: { fontSize: type.body, fontWeight: "700", color: colors.danger },
  errorText: { fontSize: type.small, color: "#991B1B", lineHeight: 19 },
  empty: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: type.body, fontWeight: "700", color: colors.ink, textAlign: "center" },
  emptyAction: { marginTop: spacing.sm, width: "100%" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.mist },
});
