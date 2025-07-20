import { Feather } from '@expo/vector-icons';
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

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';

export default function UploadScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();

	const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
	const [videoTitle, setVideoTitle] = useState('');
	const [videoDescription, setVideoDescription] = useState('');
	const [hashtags, setHashtags] = useState('');
	const [isPremium, setIsPremium] = useState(false);
	const [isUploading, setIsUploading] = useState(false);

	const handleSelectFromGallery = async () => {
		try {
			// TODO: Implement video picker from gallery
			// const result = await ImagePicker.launchImageLibraryAsync({
			//   mediaTypes: ImagePicker.MediaTypeOptions.Videos,
			//   allowsEditing: true,
			//   quality: 1,
			//   videoMaxDuration: 300, // 5 minutes
			// });

			Alert.alert(
				t('common.info'),
				'Video picker functionality will be implemented here',
				[{ text: t('common.ok') }],
			);
		} catch (error) {
			console.error('Error selecting video:', error);
			Alert.alert(t('common.error'), t('errors.somethingWentWrong'), [
				{ text: t('common.ok') },
			]);
		}
	};

	const handleRecordVideo = async () => {
		try {
			// TODO: Implement camera recording
			// const result = await ImagePicker.launchCameraAsync({
			//   mediaTypes: ImagePicker.MediaTypeOptions.Videos,
			//   allowsEditing: true,
			//   quality: 1,
			//   videoMaxDuration: 300, // 5 minutes
			// });

			Alert.alert(
				t('common.info'),
				'Camera recording functionality will be implemented here',
				[{ text: t('common.ok') }],
			);
		} catch (error) {
			console.error('Error recording video:', error);
			Alert.alert(t('common.error'), t('errors.somethingWentWrong'), [
				{ text: t('common.ok') },
			]);
		}
	};

	const handlePublish = async () => {
		if (!selectedVideo) {
			Alert.alert(t('common.error'), 'Please select a video first', [
				{ text: t('common.ok') },
			]);
			return;
		}

		if (!videoTitle.trim()) {
			Alert.alert(t('common.error'), 'Please enter a video title', [
				{ text: t('common.ok') },
			]);
			return;
		}

		setIsUploading(true);

		try {
			// TODO: Implement video upload
			// const uploadData = {
			//   video: selectedVideo,
			//   title: videoTitle,
			//   description: videoDescription,
			//   hashtags: hashtags.split('#').filter(tag => tag.trim().length > 0),
			//   is_premium: isPremium,
			// };

			// const result = await VideoService.uploadVideo(uploadData);

			// Simulate upload
			await new Promise((resolve) => setTimeout(resolve, 3000));

			Alert.alert(
				t('upload.uploadSuccess'),
				'Your video has been uploaded successfully!',
				[
					{
						text: t('common.ok'),
						onPress: () => {
							// Reset form
							setSelectedVideo(null);
							setVideoTitle('');
							setVideoDescription('');
							setHashtags('');
							setIsPremium(false);
						},
					},
				],
			);
		} catch (error) {
			console.error('Upload error:', error);
			Alert.alert(t('common.error'), t('upload.uploadFailed'), [
				{ text: t('common.ok') },
			]);
		} finally {
			setIsUploading(false);
		}
	};

	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>{t('upload.selectVideo')}</Text>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{!selectedVideo ? (
					/* Video Selection */
					<View style={styles.selectionContainer}>
						<View style={styles.selectionOptions}>
							<TouchableOpacity
								style={styles.selectionButton}
								onPress={handleSelectFromGallery}
							>
								<LinearGradient
									colors={['#E1306C', '#F77737']}
									style={styles.selectionButtonGradient}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
								>
									<Feather name="image" size={32} color="#FFFFFF" />
									<Text style={styles.selectionButtonText}>
										{t('upload.fromGallery')}
									</Text>
								</LinearGradient>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.selectionButton}
								onPress={handleRecordVideo}
							>
								<View style={styles.selectionButtonSecondary}>
									<Feather name="camera" size={32} color="#E1306C" />
									<Text style={styles.selectionButtonSecondaryText}>
										{t('upload.useCamera')}
									</Text>
								</View>
							</TouchableOpacity>
						</View>

						<View style={styles.infoContainer}>
							<View style={styles.infoItem}>
								<Feather name="clock" size={16} color="#6C757D" />
								<Text style={styles.infoText}>
									Duración: 15 segundos - 5 minutos
								</Text>
							</View>
							<View style={styles.infoItem}>
								<Feather name="smartphone" size={16} color="#6C757D" />
								<Text style={styles.infoText}>
									Formato vertical recomendado (9:16)
								</Text>
							</View>
							<View style={styles.infoItem}>
								<Feather name="file" size={16} color="#6C757D" />
								<Text style={styles.infoText}>Máximo 100MB por video</Text>
							</View>
						</View>
					</View>
				) : (
					/* Video Details Form */
					<View style={styles.formContainer}>
						{/* Video Preview Placeholder */}
						<View style={styles.videoPreview}>
							<Feather name="play-circle" size={48} color="#E1306C" />
							<Text style={styles.videoPreviewText}>Video seleccionado</Text>
						</View>

						{/* Form Fields */}
						<Input
							label={t('upload.videoTitle')}
							value={videoTitle}
							onChangeText={setVideoTitle}
							placeholder="Escribe un título atractivo..."
							maxLength={100}
						/>

						<Input
							label={t('upload.videoDescription')}
							value={videoDescription}
							onChangeText={setVideoDescription}
							placeholder="Describe tu video..."
							multiline
							numberOfLines={4}
							style={styles.textArea}
							maxLength={500}
						/>

						<Input
							label={t('upload.addHashtags')}
							value={hashtags}
							onChangeText={setHashtags}
							placeholder="#hashtag #otro #ejemplo"
							maxLength={200}
						/>

						{/* Premium Toggle */}
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
							>
								<View
									style={[
										styles.toggleThumb,
										isPremium && styles.toggleThumbActive,
									]}
								/>
							</TouchableOpacity>
						</View>

						{/* Action Buttons */}
						<View style={styles.actionButtons}>
							<Button
								title={t('common.cancel')}
								onPress={() => setSelectedVideo(null)}
								variant="outline"
								style={styles.cancelButton}
							/>
							<Button
								title={t('upload.publish')}
								onPress={handlePublish}
								loading={isUploading}
								disabled={isUploading}
								style={styles.publishButton}
							/>
						</View>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000',
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: '#000000',
		borderBottomWidth: 1,
		borderBottomColor: '#1C1C1E',
	},
	title: {
		fontSize: 24,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: '#FFFFFF',
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
	selectionButtonSecondary: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 32,
		paddingHorizontal: 24,
		backgroundColor: '#1C1C1E',
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '#E1306C',
	},
	selectionButtonText: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: '#FFFFFF',
		marginTop: 12,
	},
	selectionButtonSecondaryText: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: '#E1306C',
		marginTop: 12,
	},
	infoContainer: {
		backgroundColor: '#1C1C1E',
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
		color: '#ADB5BD',
	},
	formContainer: {
		padding: 24,
	},
	videoPreview: {
		height: 200,
		backgroundColor: '#1C1C1E',
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24,
	},
	videoPreviewText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: '#ADB5BD',
		marginTop: 8,
	},
	textArea: {
		height: 100,
		textAlignVertical: 'top',
	},
	premiumContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#1C1C1E',
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
		color: '#FFFFFF',
		marginBottom: 4,
	},
	premiumDescription: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: '#ADB5BD',
	},
	toggle: {
		width: 50,
		height: 30,
		borderRadius: 15,
		backgroundColor: '#6C757D',
		justifyContent: 'center',
		paddingHorizontal: 2,
	},
	toggleActive: {
		backgroundColor: '#E1306C',
	},
	toggleThumb: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: '#FFFFFF',
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
});
