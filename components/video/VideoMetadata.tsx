import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
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

import { Button } from '@/components/ui/Button';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { HashtagInput } from '@/components/ui/HashtagInput';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/authStore';
import { ThumbnailSelector } from './ThumbnailSelector';

interface VideoMetadataProps {
	videoUri: string;
	duration: number;
	onSave: (data: {
		title: string;
		description: string;
		hashtags: string[];
		isPremium: boolean;
		thumbnailTime: number;
	}) => void;
	onBack: () => void;
	onCancelUpload?: () => Promise<void>;
	isUploading?: boolean;
	uploadProgress?: number;
}

export function VideoMetadata({
	videoUri,
	duration,
	onSave,
	onBack,
	onCancelUpload,
	isUploading = false,
	uploadProgress = 0,
}: VideoMetadataProps) {
	const { t } = useTranslation();
	const has_premium_content = useAuthStore(
		(state) => state.user?.has_premium_content,
	);

	// Form state
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [hashtags, setHashtags] = useState<string[]>([]);
	const [isPremium, setIsPremium] = useState(false);
	const [thumbnailTime, setThumbnailTime] = useState(0);
	const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);

	// Video player for preview - show thumbnail frame
	const player = useVideoPlayer(videoUri, (player) => {
		player.loop = false;
		player.muted = true;
		player.currentTime = thumbnailTime;
	});

	const handleSave = () => {
		if (!title.trim()) {
			Alert.alert(t('common.error'), t('upload.titleRequired'));
			return;
		}

		onSave({
			title: title.trim(),
			description: description.trim(),
			hashtags: hashtags,
			isPremium,
			thumbnailTime,
		});
	};

	const handleThumbnailSelect = (time: number) => {
		setThumbnailTime(time);
		// Update video player to show new thumbnail
		try {
			player.currentTime = time;
		} catch (error) {
			console.warn('Error updating video time:', error);
		}
	};

	const formatTime = (timeInSeconds: number) => {
		const minutes = Math.floor(timeInSeconds / 60);
		const seconds = Math.floor(timeInSeconds % 60);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={onBack} disabled={isUploading}>
					<Feather name="arrow-left" size={24} color={Colors.text} />
				</TouchableOpacity>
				<Text style={styles.title}>{t('common.share')}</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Video Preview */}
				<View style={styles.previewContainer}>
					<TouchableOpacity
						style={styles.videoPreview}
						onPress={() => setShowThumbnailSelector(true)}
						disabled={isUploading}
						activeOpacity={0.8}
					>
						<VideoView
							player={player}
							style={styles.video}
							contentFit="cover"
							nativeControls={false}
							allowsFullscreen={false}
							allowsPictureInPicture={false}
						/>
						<View style={styles.videoOverlay}>
							<Text style={styles.videoDuration}>{formatTime(duration)}</Text>
						</View>
						<View style={styles.editOverlay}>
							<View style={styles.editIcon}>
								<Text style={styles.editIconText}>✏️</Text>
							</View>
						</View>
					</TouchableOpacity>

					<View style={styles.previewInfo}>
						<Text style={styles.previewTitle}>Portada del video</Text>
						<Text style={styles.previewSubtitle}>
							Frame: {formatTime(thumbnailTime)}
						</Text>
						<Text style={styles.previewNote}>
							Toca la imagen para cambiar la portada
						</Text>
					</View>
				</View>

				{/* Form Fields */}
				<View style={styles.formContainer}>
					<Input
						label={t('upload.videoTitle')}
						value={title}
						onChangeText={setTitle}
						placeholder="Escribe un título llamativo..."
						maxLength={100}
						editable={!isUploading}
					/>

					<Input
						label={t('upload.videoDescription')}
						value={description}
						onChangeText={setDescription}
						placeholder="Describe tu video..."
						multiline
						numberOfLines={4}
						style={styles.textArea}
						maxLength={500}
						editable={!isUploading}
					/>

					<HashtagInput
						label={t('upload.addHashtags')}
						hashtags={hashtags}
						onHashtagsChange={setHashtags}
						maxHashtags={10}
						placeholder="Escribe hashtag y presiona Enter"
						editable={!isUploading}
					/>

					{/* Premium Toggle */}
					{has_premium_content && (
						<View style={styles.premiumContainer}>
							<View style={styles.premiumInfo}>
								<Text style={styles.premiumTitle}>
									{t('upload.makePremium')}
								</Text>
								<Text style={styles.premiumDescription}>
									{isPremium
										? t('upload.premiumDescription')
										: t('upload.publicDescription')}
								</Text>
							</View>
							<TouchableOpacity
								style={[styles.toggle, isPremium && styles.toggleActive]}
								onPress={() => setIsPremium(!isPremium)}
								disabled={isUploading}
							>
								<View
									style={[
										styles.toggleThumb,
										isPremium && styles.toggleThumbActive,
									]}
								/>
							</TouchableOpacity>
						</View>
					)}
				</View>

				{/* Action Buttons */}
				<View style={styles.actionButtons}>
					<Button
						title={t('common.cancel')}
						onPress={onBack}
						variant="outline"
						style={styles.cancelButton}
						disabled={isUploading}
					/>
					<Button
						title={isUploading ? t('upload.uploading') : t('upload.share')}
						onPress={handleSave}
						style={styles.shareButton}
						disabled={isUploading}
						loading={isUploading}
					/>
				</View>
			</ScrollView>

			{/* Upload overlay */}
			{isUploading && (
				<View style={styles.uploadOverlay}>
					<View style={styles.uploadContainer}>
						<CircularProgress
							progress={uploadProgress}
							size={80}
							strokeWidth={8}
							color={Colors.primary}
							backgroundColor={Colors.textTertiary}
							showPercentage={true}
						/>

						<Text style={styles.uploadText}>{t('upload.uploadingVideo')}</Text>

						<Text style={styles.uploadSubtext}>
							{uploadProgress < 90
								? 'Procesando y enviando al servidor...'
								: 'Finalizando y creando registro...'}
						</Text>

						{/* Botón de cancelar */}
						{uploadProgress < 90 && (
							<TouchableOpacity
								style={styles.cancelUploadButton}
								onPress={() => {
									Alert.alert(
										'Cancelar subida',
										'¿Cancelar la subida del video?',
										[
											{ text: 'Continuar', style: 'cancel' },
											{
												text: 'Cancelar',
												style: 'destructive',
												onPress: async () => {
													try {
														if (onCancelUpload) {
															await onCancelUpload();
														}
														onBack();
													} catch (error) {
														console.warn('Error canceling upload:', error);
														onBack();
													}
												},
											},
										],
									);
								}}
							>
								<Text style={styles.cancelUploadText}>Cancelar subida</Text>
							</TouchableOpacity>
						)}

						{/* Indicador de que no se puede salir durante la subida final */}
						{uploadProgress >= 90 && (
							<View style={styles.finalStageContainer}>
								<Feather name="lock" size={16} color={Colors.textTertiary} />
								<Text style={styles.finalStageText}>
									Finalizando... No cerrar la app
								</Text>
							</View>
						)}
					</View>
				</View>
			)}

			{/* Thumbnail Selector Modal */}
			<ThumbnailSelector
				visible={showThumbnailSelector}
				videoUri={videoUri}
				startTime={0}
				endTime={duration}
				selectedTime={thumbnailTime}
				onSelect={handleThumbnailSelect}
				onClose={() => setShowThumbnailSelector(false)}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	title: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	content: {
		flex: 1,
	},
	previewContainer: {
		flexDirection: 'row',
		padding: 16,
		gap: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	videoPreview: {
		width: 60,
		height: 80,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: Colors.backgroundSecondary,
		position: 'relative',
	},
	video: {
		width: '100%',
		height: '100%',
	},
	videoOverlay: {
		position: 'absolute',
		bottom: 4,
		right: 4,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		paddingHorizontal: 4,
		paddingVertical: 2,
		borderRadius: 4,
	},
	editOverlay: {
		position: 'absolute',
		top: 4,
		right: 4,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		borderRadius: 4,
		padding: 4,
	},
	editIcon: {
		width: 24,
		height: 24,
		justifyContent: 'center',
		alignItems: 'center',
	},
	editIconText: {
		fontSize: 12,
	},
	videoDuration: {
		fontSize: 10,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
	},
	previewInfo: {
		flex: 1,
		justifyContent: 'center',
	},
	previewTitle: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
		marginBottom: 4,
	},
	previewSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.primary,
		marginBottom: 2,
	},
	previewNote: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	formContainer: {
		padding: 16,
		gap: 16,
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
		justifyContent: 'space-between',
		padding: 16,
		marginBottom: 60,
	},
	cancelButton: {
		width: '48%',
	},
	shareButton: {
		width: '48%',
	},
	uploadOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.85)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	uploadContainer: {
		backgroundColor: Colors.backgroundSecondary,
		padding: 24,
		borderRadius: 16,
		alignItems: 'center',
		maxWidth: '90%',
		minWidth: 280,
	},
	uploadText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 16,
		textAlign: 'center',
	},
	uploadSubtext: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginTop: 4,
		textAlign: 'center',
		lineHeight: 16,
	},
	compressionProgressContainer: {
		width: '100%',
		marginTop: 16,
		alignItems: 'center',
	},
	compressionProgressBar: {
		width: '100%',
		height: 4,
		backgroundColor: Colors.borderSecondary,
		borderRadius: 2,
		overflow: 'hidden',
	},
	compressionProgressFill: {
		height: '100%',
		backgroundColor: Colors.warning,
		borderRadius: 2,
	},
	compressionProgressText: {
		fontSize: 10,
		fontFamily: 'Inter-Medium',
		color: Colors.textTertiary,
		marginTop: 4,
	},
	compressionInfo: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		width: '100%',
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: Colors.borderSecondary,
	},
	compressionStat: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	compressionStatText: {
		fontSize: 10,
		fontFamily: 'Inter-Medium',
		color: Colors.textSecondary,
	},
	cancelUploadButton: {
		marginTop: 20,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.textTertiary,
		backgroundColor: 'rgba(255, 255, 255, 0.05)',
	},
	cancelUploadText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	finalStageContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 16,
		padding: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.05)',
		borderRadius: 6,
	},
	finalStageText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.textTertiary,
	},
});
