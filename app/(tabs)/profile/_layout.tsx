import { Stack } from 'expo-router';

export default function ProfileLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false, // Eliminamos el header por defecto
			}}
		>
			<Stack.Screen name="index" />
			<Stack.Screen name="settings" />
		</Stack>
	);
}