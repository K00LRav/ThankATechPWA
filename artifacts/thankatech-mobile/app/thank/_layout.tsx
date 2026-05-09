import { Stack } from "expo-router";

export default function ThankLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[jobId]" />
    </Stack>
  );
}
