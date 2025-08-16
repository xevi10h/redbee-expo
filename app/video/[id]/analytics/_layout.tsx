import { Stack } from 'expo-router';

export default function AnalyticsLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen name="index" />
			<Stack.Screen name="likes" />
			<Stack.Screen name="comments" />
			<Stack.Screen name="reports" />
		</Stack>
	);
}