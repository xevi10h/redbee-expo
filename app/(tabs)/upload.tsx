import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spinner } from '@/components/ui/Spinner';
import { VideoEditor } from '@/components/video';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useUploadState } from '@/hooks/useUploadState';
import { VideoService } from '@/services/videoService';
import { useAuthStore } from '@/stores/authStore';
import { router } from 'expo-router';

interface VideoData {
	uri: string;
	duration: number;
}

export default function UploadScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();
	const { refreshSession } = useAuthStore();
	const { setSelecting, setUploading, setEditing } = useUploadState();

	const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
	const [showEditor, setShowEditor] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [isSelectingVideo, setIsSelectingVideo] = useState(false);

	const handleSelectFromGallery = async () => {
		if (isSelectingVideo || isUploading) return;

		try {
			setIsSelectingVideo(true);
			setSelecting(true);


			// Request permissions
			const permissionResult =
				await ImagePicker.requestMediaLibraryPermissionsAsync();

			if (permissionResult.granted === false) {
				Alert.alert(t('common.error'), t('upload.galleryPermissionRequired'), [
					{ text: t('common.ok') },
				]);
				return;
			}

			// Launch image picker
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['videos'],
				allowsEditing: false,
				quality: 1.0, // Restore full quality
				videoMaxDuration: 300,
			});

			if (!result.canceled && result.assets[0]) {
				const asset = result.assets[0];
				const durationInSeconds = (asset.duration || 0) / 1000; // Convert to seconds

				// Validate minimum duration (15 seconds)
				if (durationInSeconds < 15) {
					Alert.alert(t('common.error'), t('upload.videoTooShort'), [
						{ text: t('common.ok') },
					]);
					return;
				}

				// Validate maximum duration (5 minutes = 300 seconds)
				if (durationInSeconds > 300) {
					Alert.alert(t('common.error'), t('upload.videoTooLong'), [
						{ text: t('common.ok') },
					]);
					return;
				}

				// Log file size for debugging
				const fileSizeInMB = (asset.fileSize || 0) / (1024 * 1024);
				console.log(`📱 Video file size: ${fileSizeInMB.toFixed(2)}MB`);

				setSelectedVideo({
					uri: asset.uri,
					duration: asset.duration || 0,
				});
				setShowEditor(true);
				setEditing(true);
			}
		} catch (error) {
			console.error('Error selecting video:', error);
			Alert.alert(t('common.error'), t('errors.somethingWentWrong'), [
				{ text: t('common.ok') },
			]);
		} finally {
			setIsSelectingVideo(false);
			setSelecting(false);
		}
	};

	const handleVideoEditorSave = async (data: {
		startTime: number;
		endTime: number;
		thumbnailTime: number;
		title: string;
		description: string;
		hashtags: string[];
		isPremium: boolean;
	}) => {
		if (!selectedVideo || !user) return;

		setIsUploading(true);
		setUploading(true);
		setEditing(false);

		try {
			// For now, we'll upload the original video
			// In a production app, you'd want to trim the video on the device first
			const uploadResult = await VideoService.uploadVideo({
				videoUri: selectedVideo.uri,
				title: data.title,
				description: data.description,
				hashtags: data.hashtags,
				isPremium: data.isPremium,
				userId: user.id,
				startTime: data.startTime,
				endTime: data.endTime,
				thumbnailTime: data.thumbnailTime,
			});

			if (uploadResult.success) {
				// Refresh user session to update videos_count in the profile
				// The database trigger already incremented the count, we just need to fetch the updated data
				try {
					await refreshSession();
					console.log('✅ User profile refreshed after video upload');
				} catch (error) {
					console.warn(
						'⚠️ Failed to refresh user session after video upload:',
						error,
					);
				}

				Alert.alert(
					t('upload.uploadSuccess'),
					'Your video has been uploaded successfully!',
					[
						{
							text: t('common.ok'),
							onPress: () => {
								setSelectedVideo(null);
								setShowEditor(false);
								// Navigate to profile to see the new video
								router.push('/(tabs)/profile');
							},
						},
					],
				);
			} else {
				Alert.alert(
					t('common.error'),
					uploadResult.error || 'Failed to upload video',
					[{ text: t('common.ok') }],
				);
			}
		} catch (error) {
			console.error('Upload error:', error);
			Alert.alert(t('common.error'), t('upload.uploadFailed'), [
				{ text: t('common.ok') },
			]);
		} finally {
			setIsUploading(false);
			setUploading(false);
		}
	};

	const handleVideoEditorCancel = () => {
		setSelectedVideo(null);
		setShowEditor(false);
		setEditing(false);
	};

	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	// Show video editor when video is selected
	if (showEditor && selectedVideo) {
		return (
			<VideoEditor
				videoUri={selectedVideo.uri}
				duration={selectedVideo.duration / 1000} // Convert to seconds
				onSave={handleVideoEditorSave}
				onCancel={handleVideoEditorCancel}
				isUploading={isUploading}
			/>
		);
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>{t('upload.selectVideo')}</Text>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Video Selection - Only Gallery Option */}
				<View style={styles.selectionContainer}>
					<View style={styles.selectionOptions}>
						<TouchableOpacity
							style={styles.selectionButton}
							onPress={handleSelectFromGallery}
							disabled={isUploading || isSelectingVideo}
						>
							<LinearGradient
								colors={Colors.gradientPrimary}
								style={styles.selectionButtonGradient}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
							>
								{isSelectingVideo ? (
									<Spinner size={32} color={Colors.text} />
								) : (
									<Feather name="image" size={32} color={Colors.text} />
								)}
								<Text style={styles.selectionButtonText}>
									{isSelectingVideo
										? t('upload.selectingVideo')
										: t('upload.fromGallery')}
								</Text>
							</LinearGradient>
						</TouchableOpacity>
					</View>

					<View style={styles.infoContainer}>
						<View style={styles.infoItem}>
							<Feather name="clock" size={16} color={Colors.textTertiary} />
							<Text style={styles.infoText}>
								Duración: 15 segundos - 5 minutos
							</Text>
						</View>
						<View style={styles.infoItem}>
							<Feather
								name="smartphone"
								size={16}
								color={Colors.textTertiary}
							/>
							<Text style={styles.infoText}>
								Formato vertical recomendado (9:16)
							</Text>
						</View>
						<View style={styles.infoItem}>
							<Feather name="file" size={16} color={Colors.textTertiary} />
							<Text style={styles.infoText}>Máximo 100MB por video</Text>
						</View>
						<View style={styles.infoItem}>
							<Feather name="edit-3" size={16} color={Colors.textTertiary} />
							<Text style={styles.infoText}>
								Podrás recortar y editar después de seleccionar
							</Text>
						</View>
					</View>
				</View>
			</ScrollView>

			{/* Loading overlay */}
			{isUploading && (
				<View style={styles.loadingOverlay}>
					<View style={styles.loadingContainer}>
						<Spinner size={32} color={Colors.primary} />
						<Text style={styles.loadingText}>{t('upload.uploadingVideo')}</Text>
					</View>
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: Colors.background,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	title: {
		fontSize: 24,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
	},
	content: {
		flex: 1,
	},
	selectionContainer: {
		padding: 24,
	},
	selectionOptions: {
		gap: 16,
		marginBottom: 32,
	},
	selectionButton: {
		borderRadius: 16,
		overflow: 'hidden',
	},
	selectionButtonGradient: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 32,
		paddingHorizontal: 24,
	},
	selectionButtonText: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 12,
	},
	infoContainer: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		gap: 12,
	},
	infoItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	infoText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	formContainer: {
		padding: 24,
	},
	videoPreview: {
		height: 200,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24,
	},
	videoPreviewText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.textSecondary,
		marginTop: 8,
	},
	textArea: {
		height: 100,
		textAlignVertical: 'top',
	},
	premiumContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		marginBottom: 24,
	},
	premiumInfo: {
		flex: 1,
		marginRight: 16,
	},
	premiumTitle: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 4,
	},
	premiumDescription: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	toggle: {
		width: 50,
		height: 30,
		borderRadius: 15,
		backgroundColor: Colors.textTertiary,
		justifyContent: 'center',
		paddingHorizontal: 2,
	},
	toggleActive: {
		backgroundColor: Colors.primary,
	},
	toggleThumb: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: Colors.text,
		alignSelf: 'flex-start',
	},
	toggleThumbActive: {
		alignSelf: 'flex-end',
	},
	actionButtons: {
		flexDirection: 'row',
		gap: 12,
	},
	cancelButton: {
		flex: 1,
	},
	publishButton: {
		flex: 2,
	},
	loadingOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingContainer: {
		backgroundColor: Colors.backgroundSecondary,
		padding: 24,
		borderRadius: 12,
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
	},
});
