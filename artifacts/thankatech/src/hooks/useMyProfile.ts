import { useQuery } from "@tanstack/react-query";

interface MyProfile {
  profileId: number;
  userType: string;
  technicianId: number | null;
  fullName: string | null;
  avatarUrl: string | null;
}

interface MyProfileEnvelope {
  profile: MyProfile | null;
}

export function useMyProfile() {
  return useQuery<MyProfileEnvelope>({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const res = await fetch("/api/profile/me", { credentials: "include" });
      if (res.status === 401) return { profile: null };
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });
}
