import { Stack } from "expo-router";

export default function RetryTipLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[thankMessageId]" />
    </Stack>
  );
}
