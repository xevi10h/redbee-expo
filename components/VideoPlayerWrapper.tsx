import { Colors } from '@/constants/Colors';
import { User, Video as VideoType } from '@/shared/types';
import { ErrorReporting } from '@/utils/errorReporting';
import { Feather } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';
import VideoPlayer from './VideoPlayer';

interface VideoPlayerWrapperProps {
	video: VideoType;
	isActive: boolean;
	currentUser: User;
	onLike: () => void;
	onComment: () => void;
	onFollow: () => void;
	onSubscribe: () => void;
	onReport: () => void;
	onUserPress: () => void;
}

export const VideoPlayerWrapper: React.FC<VideoPlayerWrapperProps> = (
	props,
) => {
	const handleVideoError = useCallback(
		(error: Error, errorInfo: any) => {
			console.error('Video player error:', error, errorInfo);
			ErrorReporting.reportError(error, 'video_player', props.currentUser.id, {
				videoId: props.video.id,
				videoUrl: props.video.video_url,
				errorInfo,
			});
		},
		[props.currentUser.id, props.video.id, props.video.video_url],
	);

	const errorFallback = (
		<View style={styles.errorFallback}>
			<Feather name="video-off" size={48} color={Colors.error} />
			<Text style={styles.errorTitle}>Error en el video</Text>
			<Text style={styles.errorMessage}>No se pudo cargar este video</Text>
		</View>
	);

	return (
		<ErrorBoundary fallback={errorFallback} onError={handleVideoError}>
			<VideoPlayer {...props} />
		</ErrorBoundary>
	);
};

const styles = StyleSheet.create({
	errorFallback: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.backgroundSecondary,
		paddingHorizontal: 32,
	},
	errorTitle: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		color: Colors.text,
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	errorMessage: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
});

export class PerformanceMonitor {
	private static measurements: Map<string, number> = new Map();

	static startMeasurement(key: string): void {
		this.measurements.set(key, Date.now());
	}

	static endMeasurement(key: string): number {
		const startTime = this.measurements.get(key);
		if (!startTime) return 0;

		const duration = Date.now() - startTime;
		this.measurements.delete(key);
		return duration;
	}

	static async measureAsync<T>(
		operation: () => Promise<T>,
		key: string,
	): Promise<{ result: T; duration: number }> {
		this.startMeasurement(key);
		try {
			const result = await operation();
			const duration = this.endMeasurement(key);
			return { result, duration };
		} catch (error) {
			this.endMeasurement(key);
			throw error;
		}
	}

	static logMetrics(context: string, metrics: Record<string, number>): void {
		console.log(`Performance metrics for ${context}:`, metrics);
	}
}
