import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Card, EmptyState, Meta, Pill, Row } from "@/components/ui";
import { projectSummary } from "@/lib/select";
import { useView } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";

export default function ProjectsScreen() {
  const palette = usePalette();
  const view = useView();
  const firstName = view.user.name.split(" ")[0];

  return (
    <Screen>
      <Meta>
        {firstName ? `Hi ${firstName}. ` : ""}
        {view.projects.length} assigned project{view.projects.length === 1 ? "" : "s"}.
      </Meta>
      {view.projects.length ? (
        view.projects.map((project) => {
          const summary = projectSummary(view, project.id);
          return (
            <Card
              accessibilityHint="Opens the project's gear inspections and punch items"
              accessibilityLabel={`${project.name}, ${summary.openItems} open punch items, ${summary.inspectionsToDo} inspections to do`}
              key={project.id}
              onPress={() => router.push({ pathname: "/projects/[projectId]", params: { projectId: project.id } })}
            >
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={[type.caption, { color: palette.muted }]}>{project.jobNumber}</Text>
                <Icon color={palette.muted} name="chevron" size={16} />
              </Row>
              <Text style={[type.headline, { color: palette.ink, fontSize: 19 }]}>{project.name}</Text>
              <Meta>{project.address}</Meta>
              <View style={styles.pills}>
                {summary.openItems ? <Pill label={`${summary.openItems} punch open`} tone="open" /> : null}
                {summary.inspectionsToDo ? <Pill label={`${summary.inspectionsToDo} inspection${summary.inspectionsToDo === 1 ? "" : "s"} to do`} tone="sent" /> : null}
                {summary.issues ? <Pill label={`${summary.issues} with office issues`} tone="danger" /> : null}
                {!summary.openItems && !summary.inspectionsToDo ? <Pill label="Nothing waiting" tone="done" /> : null}
              </View>
            </Card>
          );
        })
      ) : (
        <EmptyState icon="projects" message="Contact the office if you need a project added." title="No projects assigned" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }
});
