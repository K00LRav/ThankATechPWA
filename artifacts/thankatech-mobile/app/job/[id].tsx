import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetJob } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function StatusBadge({ status }: { status: string }) {
  const colors = useColors();
  const colorMap: Record<string, string> = {
    pending: colors.mutedForeground,
    in_progress: "#F59E0B",
    confirmed: colors.secondary,
    completed: colors.secondary,
    cancelled: colors.destructive,
    declined: colors.destructive,
  };
  const color = colorMap[status] ?? colors.mutedForeground;
  const label = status.replace(/_/g, " ");

  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "20" }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color, fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
    </View>
  );
}

const TIMELINE_STEPS = [
  { key: "pending", label: "Requested", icon: "time-outline" as const },
  { key: "confirmed", label: "Confirmed", icon: "checkmark-circle-outline" as const },
  { key: "in_progress", label: "In Progress", icon: "construct-outline" as const },
  { key: "completed", label: "Completed", icon: "ribbon-outline" as const },
];

const STEP_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  in_progress: 2,
  completed: 3,
};

function StatusTimeline({ status }: { status: string }) {
  const colors = useColors();

  const isCancelled = status === "cancelled";
  const isDeclined = status === "declined";
  const isTerminated = isCancelled || isDeclined;

  const activeIndex = STEP_ORDER[status] ?? -1;

  return (
    <View style={[timelineStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[timelineStyles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
        Job Progress
      </Text>

      <View style={timelineStyles.stepsContainer}>
        {TIMELINE_STEPS.map((step, index) => {
          const isDone = !isTerminated && activeIndex > index;
          const isActive = !isTerminated && activeIndex === index;
          const isLast = index === TIMELINE_STEPS.length - 1;

          const dotColor = isDone
            ? colors.secondary
            : isActive
            ? colors.primary
            : colors.border;

          const lineColor = isDone ? colors.secondary : colors.border;

          return (
            <View key={step.key} style={timelineStyles.stepRow}>
              <View style={timelineStyles.stepLeft}>
                <View
                  style={[
                    timelineStyles.dot,
                    {
                      backgroundColor: dotColor,
                      borderColor: isActive ? colors.primary : dotColor,
                      transform: [{ scale: isActive ? 1.15 : 1 }],
                    },
                  ]}
                >
                  {(isDone || isActive) && (
                    <Ionicons
                      name={isDone ? "checkmark" : step.icon}
                      size={isDone ? 11 : 13}
                      color="#fff"
                    />
                  )}
                </View>
                {!isLast && (
                  <View style={[timelineStyles.connector, { backgroundColor: lineColor }]} />
                )}
              </View>
              <View style={[timelineStyles.stepContent, isLast ? { paddingBottom: 0 } : null]}>
                <Text
                  style={[
                    timelineStyles.stepLabel,
                    {
                      color: isActive
                        ? colors.primary
                        : isDone
                        ? colors.foreground
                        : colors.mutedForeground,
                      fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {step.label}
                </Text>
                {isActive && !isTerminated && (
                  <Text style={[timelineStyles.stepSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Current status
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {isTerminated && (
          <View style={timelineStyles.stepRow}>
            <View style={timelineStyles.stepLeft}>
              <View style={[timelineStyles.dot, { backgroundColor: colors.destructive, borderColor: colors.destructive }]}>
                <Ionicons name="close" size={13} color="#fff" />
              </View>
            </View>
            <View style={[timelineStyles.stepContent, { paddingBottom: 0 }]}>
              <Text style={[timelineStyles.stepLabel, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
                {isCancelled ? "Cancelled" : "Declined"}
              </Text>
              <Text style={[timelineStyles.stepSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {isCancelled ? "This job was cancelled" : "The technician declined this job"}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconWrap, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.detailText}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {label}
        </Text>
        <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = Number(id);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: job, isLoading, isError } = useGetJob(jobId);

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Could not load job details
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.retryBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const createdDate = new Date(job.createdAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const completedDate = job.completedAt
    ? new Date(job.completedAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const scheduledDate = job.scheduledDate
    ? new Date(job.scheduledDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
          testID="job-detail-back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          Job Details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.titleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.jobTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
            {job.title}
          </Text>
          <StatusBadge status={job.status} />
        </View>

        <StatusTimeline status={job.status} />

        {job.description ? (
          <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Description
            </Text>
            <Text style={[styles.descriptionText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              {job.description}
            </Text>
          </View>
        ) : null}

        <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            Details
          </Text>

          <DetailRow
            icon="person-outline"
            label="Technician"
            value={job.technicianName ?? "Assigned technician"}
          />

          {job.address ? (
            <DetailRow icon="location-outline" label="Address" value={job.address} />
          ) : null}

          {scheduledDate ? (
            <DetailRow icon="calendar-outline" label="Scheduled" value={scheduledDate} />
          ) : null}

          <DetailRow icon="time-outline" label="Requested on" value={createdDate} />

          {completedDate ? (
            <DetailRow icon="checkmark-circle-outline" label="Completed on" value={completedDate} />
          ) : null}
        </View>

        {job.status === "completed" && (
          <TouchableOpacity
            style={[styles.thankBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/thank/${job.id}`)}
            testID="job-detail-thank"
          >
            <Ionicons name="heart-outline" size={20} color="#fff" />
            <Text style={[styles.thankBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Send Thanks
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: { fontSize: 15, textAlign: "center" },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryBtnText: { fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  titleCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  jobTitle: { fontSize: 24, lineHeight: 30 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 13, textTransform: "capitalize" },
  descriptionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  descriptionText: { fontSize: 15, lineHeight: 22 },
  detailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  detailIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailText: { flex: 1, gap: 2 },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 15 },
  thankBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 4,
  },
  thankBtnText: { color: "#fff", fontSize: 17 },
});

const timelineStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stepsContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
  },
  stepLeft: {
    alignItems: "center",
    width: 26,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 18,
    marginVertical: 3,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 20,
    justifyContent: "center",
    minHeight: 26,
    gap: 2,
  },
  stepLabel: {
    fontSize: 15,
  },
  stepSub: {
    fontSize: 12,
  },
});
