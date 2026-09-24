import { Redirect } from "expo-router";
import { useField } from "@/lib/store";

/** The app opens on the assigned projects, or on sign-in. */
export default function Index() {
  const { session, view } = useField();
  return <Redirect href={session && view ? "/projects" : "/sign-in"} />;
}
