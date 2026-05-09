import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListTechnicians } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const SPECIALTIES = ["All", "HVAC", "Plumbing", "Electrical", "Appliances", "Carpentry", "Painting"];

function TechnicianCard({ item }: { item: {
  id: number;
  fullName: string;
  specialty: string;
  serviceArea: string;
  bio: string;
  totalThanks: number;
  totalEarned: number;
  avatarUrl: string | null;
}}) {
  const colors = useColors();
  const router = useRouter();
  const initials = item.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <TouchableOpacity
      style={[styles.techCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/technician/${item.id}`)}
      activeOpacity={0.75}
      testID={`technician-card-${item.id}`}
    >
      <View style={[styles.techAvatar, { backgroundColor: colors.primary + "20" }]}>
        <Text style={[styles.techInitials, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
          {initials}
        </Text>
      </View>
      <View style={styles.techInfo}>
        <Text style={[styles.techName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {item.fullName}
        </Text>
        <View style={styles.techMeta}>
          <View style={[styles.specialtyBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.specialtyText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              {item.specialty}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {item.serviceArea}
            </Text>
          </View>
        </View>
        <View style={styles.techStats}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={13} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {item.totalThanks} thanks
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");

  const params = {
    ...(search.length > 1 ? { search } : {}),
    ...(selectedSpecialty !== "All" ? { specialty: selectedSpecialty } : {}),
  };

  const { data: technicians, isLoading, error, refetch } = useListTechnicians(params);

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
          Find a Tech
        </Text>
        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Search by name..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            testID="browse-search-input"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Specialty Filter */}
      <FlatList
        horizontal
        data={SPECIALTIES}
        keyExtractor={(s) => s}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedSpecialty === item ? colors.primary : colors.card,
                borderColor: selectedSpecialty === item ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedSpecialty(item)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: selectedSpecialty === item ? "#fff" : colors.foreground,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
        style={{ flexGrow: 0 }}
      />

      {/* Technician List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Failed to load technicians
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryText, { fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={technicians ?? []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TechnicianCard item={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isWeb ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {search ? "No results found" : "No technicians available"}
              </Text>
            </View>
          }
          scrollEnabled={!!(technicians && technicians.length > 0)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  filterList: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  techCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  techAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  techInitials: { fontSize: 20 },
  techInfo: { flex: 1 },
  techName: { fontSize: 16, marginBottom: 6 },
  techMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  specialtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  specialtyText: { fontSize: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 12 },
  techStats: { flexDirection: "row", gap: 12 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  errorText: { fontSize: 15, textAlign: "center" },
  emptyText: { fontSize: 15, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: { color: "#fff", fontSize: 15 },
});
