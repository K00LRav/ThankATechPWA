import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTechnician,
  useGetTechnicianWallOfThanks,
  useGetTechnicianStats,
  useCreateJob,
  useGetMyProfile,
  getListJobsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

function ThankCard({ item }: { item: {
  id: number;
  customerName?: string;
  message: string;
  tipAmount: number;
  createdAt: string;
}}) {
  const colors = useColors();
  const date = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <View style={[styles.thankCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.thankHeader}>
        <View style={styles.quoteRow}>
          <Ionicons name="heart" size={14} color={colors.primary} />
          <Text style={[styles.customerName, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {item.customerName ?? "A happy customer"}
          </Text>
        </View>
        {item.tipAmount > 0 && (
          <View style={[styles.tipBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tipText, { fontFamily: "Inter_600SemiBold" }]}>
              +${item.tipAmount}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.thankMessage, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
        "{item.message}"
      </Text>
      <Text style={[styles.thankDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {date}
      </Text>
    </View>
  );
}

function defaultScheduledDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function BookJobModal({
  visible,
  techName,
  technicianId,
  customerId,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  techName: string;
  technicianId: number;
  customerId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState(defaultScheduledDate);
  const [submitting, setSubmitting] = useState(false);

  const { mutateAsync: createJob } = useCreateJob();

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setScheduledDate(defaultScheduledDate());
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createJob({
        data: {
          customerId,
          technicianId,
          title: title.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(scheduledDate ? { scheduledDate: new Date(scheduledDate).toISOString() } : {}),
        },
      });
      setTitle("");
      setDescription("");
      setScheduledDate(defaultScheduledDate());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Couldn't book job",
        "Something went wrong. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
                Book a Job
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                with {techName}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleClose}
            >
              <Ionicons name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.sheetBody}
          >
            {/* Title */}
            <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              What do you need done? *
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.card,
                  borderColor: title ? colors.primary : colors.border,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="e.g. Fix kitchen faucet leak"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              testID="book-job-title-input"
            />

            {/* Description */}
            <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
              Description (optional)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.card,
                  borderColor: description ? colors.primary : colors.border,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="Add any details — what broke, when you need it done, any special instructions..."
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              testID="book-job-description-input"
            />

            {/* Scheduled Date */}
            <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
              Preferred date
            </Text>
            <View style={[styles.dateRow, { backgroundColor: colors.card, borderColor: scheduledDate ? colors.primary : colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[
                  styles.dateInput,
                  { color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                value={scheduledDate}
                onChangeText={setScheduledDate}
                keyboardType="numbers-and-punctuation"
                testID="book-job-date-input"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: title.trim() ? colors.primary : colors.muted },
              ]}
              onPress={handleSubmit}
              disabled={!title.trim() || submitting}
              testID="book-job-submit-button"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="briefcase-outline" size={18} color="#fff" />
                  <Text style={[styles.submitBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                    Request Job
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function TechnicianProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const techId = Number(id);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const [bookingVisible, setBookingVisible] = useState(false);
  const [bookedSuccess, setBookedSuccess] = useState(false);

  const { data: tech, isLoading: techLoading } = useGetTechnician(techId);
  const { data: wall, isLoading: wallLoading } = useGetTechnicianWallOfThanks(techId);
  const { data: stats } = useGetTechnicianStats(techId);
  const { data: profileData } = useGetMyProfile();
  const profile = profileData?.profile;

  const isCustomer = profile?.userType === "customer";

  const handleBookSuccess = async () => {
    setBookingVisible(false);
    setBookedSuccess(true);
    await queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
    setTimeout(() => setBookedSuccess(false), 3000);
  };

  if (techLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!tech) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Technician not found
        </Text>
      </View>
    );
  }

  const initials = tech.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const topPadding = isWeb ? 67 : insets.top;

  const ListHeader = () => (
    <View>
      {/* Back button */}
      <View style={[styles.backRow, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={styles.heroSection}>
        <View style={[styles.heroAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.heroInitials, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
        </View>
        <Text style={[styles.heroName, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          {tech.fullName}
        </Text>
        <View style={styles.heroMeta}>
          <View style={[styles.specialtyBadge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.specialtyText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              {tech.specialty}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {tech.serviceArea}
            </Text>
          </View>
        </View>
        <Text style={[styles.heroBio, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {tech.bio}
        </Text>

        {/* Book this Tech button */}
        {isCustomer && (
          <TouchableOpacity
            style={[styles.bookBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setBookedSuccess(false);
              setBookingVisible(true);
            }}
            testID="book-tech-button"
          >
            <Ionicons name="briefcase-outline" size={18} color="#fff" />
            <Text style={[styles.bookBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Book this Tech
            </Text>
          </TouchableOpacity>
        )}

        {/* Success confirmation */}
        {bookedSuccess && (
          <View style={[styles.successBanner, { backgroundColor: colors.secondary + "20", borderColor: colors.secondary + "40" }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
            <Text style={[styles.successText, { color: colors.secondary, fontFamily: "Inter_500Medium" }]}>
              Job request sent! Check your dashboard.
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="heart" size={18} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {stats?.totalThanks ?? tech.totalThanks}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Thanks
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="cash-outline" size={18} color={colors.secondary} />
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            ${Math.round(stats?.totalEarned ?? tech.totalEarned).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Tips Earned
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="briefcase-outline" size={18} color={colors.accent + "80"} />
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {stats?.totalJobs ?? "—"}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Jobs
          </Text>
        </View>
      </View>

      {/* Wall of Thanks title */}
      <View style={styles.wallHeader}>
        <Ionicons name="heart" size={18} color={colors.primary} />
        <Text style={[styles.wallTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          Wall of Thanks
        </Text>
      </View>

      {wallLoading && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={wall ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ThankCard item={item} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: isWeb ? 34 + 84 : 40 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !wallLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No thanks yet — be the first!
              </Text>
            </View>
          ) : null
        }
      />

      {profile && isCustomer && (
        <BookJobModal
          visible={bookingVisible}
          techName={tech.fullName}
          technicianId={techId}
          customerId={profile.profileId}
          onClose={() => setBookingVisible(false)}
          onSuccess={handleBookSuccess}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16 },
  backRow: { paddingHorizontal: 20, marginBottom: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: { alignItems: "center", paddingHorizontal: 20, marginBottom: 24 },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroInitials: { color: "#fff", fontSize: 32 },
  heroName: { fontSize: 26, marginBottom: 10, textAlign: "center" },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 12 },
  specialtyBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  specialtyText: { fontSize: 13 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13 },
  heroBio: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 16 },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  bookBtnText: { color: "#fff", fontSize: 16 },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  successText: { fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 28 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11 },
  wallHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  wallTitle: { fontSize: 20 },
  listContent: { paddingHorizontal: 20 },
  thankCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  thankHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  quoteRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  customerName: { fontSize: 13 },
  tipBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tipText: { color: "#fff", fontSize: 12 },
  thankMessage: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  thankDate: { fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 15 },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  sheetTitle: { fontSize: 24 },
  sheetSubtitle: { fontSize: 14, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { flexGrow: 0 },
  fieldLabel: { fontSize: 14, marginBottom: 8 },
  textInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 17 },
});
