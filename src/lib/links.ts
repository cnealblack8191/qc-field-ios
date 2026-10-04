import { Linking } from "react-native";

/**
 * ECI Field QC's privacy policy, served publicly by the QC server
 * (app/privacy in the QC repo). Apple requires it in the listing and a link
 * to it inside the app.
 */
export const PRIVACY_POLICY_URL = "https://qc.ecinc.us/privacy";

export function openPrivacyPolicy() {
  void Linking.openURL(PRIVACY_POLICY_URL).catch(() => undefined);
}
