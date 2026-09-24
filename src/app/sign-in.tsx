import { Image } from "expo-image";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Field, Notice } from "@/components/ui";
import { DEFAULT_SERVER, useField } from "@/lib/store";
import { size, type, usePalette } from "@/lib/theme";

export default function SignInScreen() {
  const palette = usePalette();
  const { signIn } = useField();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER);
  const [showServer, setShowServer] = useState(false);
  const [busy, setBusy] = useState<"live" | "demo" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(mode: "live" | "demo") {
    setProblem(null);
    if (mode === "live" && (!email.trim() || !password)) {
      setProblem("Enter your email and password.");
      return;
    }
    setBusy(mode);
    try {
      await signIn({ mode, email, password, serverUrl });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.fill, { backgroundColor: palette.brand }]}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <Image accessibilityIgnoresInvertColors source={require("../../assets/icon.png")} style={styles.logo} />
              <Text accessibilityRole="header" style={[type.largeTitle, { color: "#fff" }]}>ECI Field QC</Text>
              <Text style={[type.callout, { color: "#9aa4af", textAlign: "center" }]}>
                Punch walks, drawing pins and gear inspections — built to keep working with no signal.
              </Text>
            </View>

            <View style={[styles.panel, { backgroundColor: palette.surface }]}>
              {problem ? <Notice icon="warning" message={problem} tone="danger" /> : null}
              <Field
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                inputMode="email"
                keyboardType="email-address"
                label="Email"
                onChangeText={setEmail}
                placeholder="you@ecinc.us"
                returnKeyType="next"
                textContentType="username"
                value={email}
              />
              <Field
                autoComplete="current-password"
                label="Password"
                onChangeText={setPassword}
                onSubmitEditing={() => void submit("live")}
                returnKeyType="go"
                secureTextEntry
                textContentType="password"
                value={password}
              />
              {showServer ? (
                <Field
                  autoCapitalize="none"
                  autoCorrect={false}
                  hint="Your office gives you this if it is not the default."
                  inputMode="url"
                  label="Server"
                  onChangeText={setServerUrl}
                  value={serverUrl}
                />
              ) : null}
              <Button label="Sign in" large loading={busy === "live"} disabled={busy !== null} onPress={() => void submit("live")} />
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setShowServer((value) => !value)} style={styles.link}>
                <Text style={[type.footnote, { color: palette.muted }]}>{showServer ? "Hide server" : "Change server"}</Text>
              </Pressable>
            </View>

            <View style={styles.demo}>
              <Button
                accessibilityHint="Opens the app with sample projects stored only on this device"
                label="Explore the demo"
                large
                loading={busy === "demo"}
                disabled={busy !== null}
                onPress={() => void submit("demo")}
                variant="inverse"
              />
              <Text style={[type.footnote, { color: "#9aa4af", textAlign: "center", fontWeight: "400" }]}>
                Sample projects on this device only. Nothing is sent anywhere.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: size.gutter, gap: 20, maxWidth: 520, width: "100%", alignSelf: "center" },
  brand: { alignItems: "center", gap: 10, paddingVertical: 12 },
  logo: { width: 84, height: 84, borderRadius: 20 },
  panel: { borderRadius: size.radius, padding: 18, gap: 14, borderCurve: "continuous" },
  link: { alignSelf: "center", minHeight: size.tap, justifyContent: "center" },
  demo: { gap: 8 }
});
