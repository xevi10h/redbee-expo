import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Dimensions,
	FlatList,
	StyleSheet,
	Text,
	View,
} from 'react-native';

import VideoPlayer from '@/components/video/VideoPlayer';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useVideoPlayerInteractions } from '@/hooks/useVideoPlayerInteractions';
import { VideoService } from '@/services';
import { Video } from '@/shared/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoScreen() {
	const { id: videoId } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { user } = useAuth();
	const [videos, setVideos] = useState<Video[]>([]);
	const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const {
		handleLike,
		handleComment,
		handleFollow,
		handleSubscribe,
		handleReport,
		updateVideoState,
	} = useVideoPlayerInteractions();

	useEffect(() => {
		if (!user?.id || !videoId) {
			router.replace('/(tabs)/');
			return;
		}

		loadVideoAndRelated();
	}, [videoId, user?.id]);

	const loadVideoAndRelated = async () => {
		if (!user?.id || !videoId) return;

		setIsLoading(true);
		setError(null);

		try {
			// Get videos using search and find the specific video
			const result = await VideoService.searchVideos('', user.id, 0, 50);
			
			if (!result.success || !result.data) {
				setError('Video not found');
				return;
			}

			// Find the specific video by ID
			const targetVideo = result.data.videos.find(v => v.id === videoId);
			
			if (!targetVideo) {
				setError('Video not found');
				return;
			}

			// For simplicity, just show the target video
			// TODO: Add related videos functionality
			setVideos([targetVideo]);
			setCurrentVideoIndex(0);
		} catch (error) {
			console.error('Error loading video:', error);
			setError('Failed to load video');
		} finally {
			setIsLoading(false);
		}
	};

	const handleVideoChange = (info: { viewableItems: any[] }) => {
		if (info.viewableItems.length > 0) {
			const newIndex = info.viewableItems[0].index;
			setCurrentVideoIndex(newIndex);
		}
	};

	const handleUserPress = (video: Video) => {
		if (video.user?.id && video.user.id !== user?.id) {
			router.push(`/user/${video.user.id}`);
		} else {
			router.push('/(tabs)/profile');
		}
	};

	const handleHideVideo = async (videoId: string) => {
		try {
			const result = await VideoService.hideVideo(videoId);
			if (result.success) {
				Alert.alert('Video oculto', 'El video ha sido ocultado exitosamente.', [
					{
						text: 'OK',
						onPress: () => router.back()
					}
				]);
			} else {
				Alert.alert('Error', result.error || 'No se pudo ocultar el video');
			}
		} catch (error) {
			console.error('Error hiding video:', error);
			Alert.alert('Error', 'No se pudo ocultar el video');
		}
	};

	const handleDeleteVideo = async (videoId: string) => {
		Alert.alert(
			'Eliminar video',
			'¿Estás seguro de que quieres eliminar este video permanentemente? Esta acción no se puede deshacer.',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{
					text: 'Eliminar',
					style: 'destructive',
					onPress: async () => {
						try {
							const result = await VideoService.deleteVideo(videoId);
							if (result.success) {
								Alert.alert('Video eliminado', 'El video ha sido eliminado exitosamente.', [
									{
										text: 'OK',
										onPress: () => router.back()
									}
								]);
							} else {
								Alert.alert('Error', result.error || 'No se pudo eliminar el video');
							}
						} catch (error) {
							console.error('Error deleting video:', error);
							Alert.alert('Error', 'No se pudo eliminar el video');
						}
					}
				}
			]
		);
	};

	const renderVideoItem = ({ item, index }: { item: Video; index: number }) => {
		if (!user) return null;

		return (
			<VideoPlayer
				video={item}
				isActive={index === currentVideoIndex}
				currentUser={user}
				onLike={() => handleLike(item.id, updateVideoState)}
				onComment={() => handleComment(item.id)}
				onFollow={() => handleFollow(item.user_id, updateVideoState)}
				onSubscribe={() => handleSubscribe(item.user_id, updateVideoState)}
				onReport={() => handleReport(item.id, 'inappropriate')}
				onHideVideo={() => handleHideVideo(item.id)}
				onDeleteVideo={() => handleDeleteVideo(item.id)}
				onUserPress={() => handleUserPress(item)}
				onCommentAdded={(comment) => {
					// Update video comment count
					updateVideoState(item.id, {
						comments_count: item.comments_count + 1,
					});
				}}
				isFullscreen={true}
			/>
		);
	};

	if (!user) {
		router.replace('/auth/sign-in');
		return null;
	}

	if (isLoading) {
		return (
			<View style={styles.container}>
				<StatusBar style="light" />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary} />
				</View>
			</View>
		);
	}

	if (error || videos.length === 0) {
		return (
			<View style={styles.container}>
				<StatusBar style="light" />
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{error || 'Video not found'}</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<StatusBar style="light" />
			<FlatList
				data={videos}
				renderItem={renderVideoItem}
				keyExtractor={(item) => item.id}
				pagingEnabled
				showsVerticalScrollIndicator={false}
				snapToInterval={SCREEN_HEIGHT}
				snapToAlignment="start"
				decelerationRate="fast"
				onViewableItemsChanged={handleVideoChange}
				viewabilityConfig={{
					itemVisiblePercentThreshold: 80,
				}}
				getItemLayout={(_, index) => ({
					length: SCREEN_HEIGHT,
					offset: SCREEN_HEIGHT * index,
					index,
				})}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
	},
	errorText: {
		fontSize: 18,
		fontFamily: 'Inter-Medium',
		color: Colors.error,
		textAlign: 'center',
	},
});