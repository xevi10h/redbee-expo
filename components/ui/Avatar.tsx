import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/Colors';

interface AvatarProps {
	avatarUrl?: string | null;
	size?: number;
	username?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
	avatarUrl, 
	size = 48, 
	username 
}) => {
	const [imageError, setImageError] = useState(false);

	if (!avatarUrl || imageError) {
		return (
			<View style={[styles.avatarContainer, { width: size, height: size }]}>
				<LinearGradient
					colors={Colors.gradientPrimary}
					style={[
						styles.avatarGradient,
						{ width: size, height: size, borderRadius: size / 2 },
					]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<Feather name="user" size={size * 0.4} color={Colors.text} />
				</LinearGradient>
			</View>
		);
	}

	return (
		<View style={[styles.avatarContainer, { width: size, height: size }]}>
			<Image
				source={{ uri: avatarUrl }}
				style={[
					styles.avatarImage,
					{ width: size, height: size, borderRadius: size / 2 },
				]}
				contentFit="cover"
				onError={() => setImageError(true)}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	avatarContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 24,
	},
	avatarImage: {
		backgroundColor: Colors.backgroundSecondary,
	},
	avatarGradient: {
		justifyContent: 'center',
		alignItems: 'center',
	},
});