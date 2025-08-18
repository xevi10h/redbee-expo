import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import {
	Alert,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularProgress } from '@/components/ui/CircularProgress';
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
	const [isLoadingVideo, setIsLoadingVideo] = useState(false);
	const [loadingProgress, setLoadingProgress] = useState(0);
	const [uploadProgress, setUploadProgress] = useState(0);
	const isCancelingRef = useRef(false); // Ref persistente para verificación inmediata
	const [loadingInterval, setLoadingInterval] = useState<
		number | NodeJS.Timeout | null
	>(null);

	const cleanupInterval = () => {
		if (loadingInterval) {
			if (typeof loadingInterval === 'number') {
				clearInterval(loadingInterval);
			} else {
				clearInterval(loadingInterval);
			}
			setLoadingInterval(null);
		}
	};

	const isErrorWithMessage = (error: unknown): error is { message: string } => {
		return (
			typeof error === 'object' &&
			error !== null &&
			'message' in error &&
			typeof (error as { message: unknown }).message === 'string'
		);
	};

	const handleSelectFromGallery = async () => {
		if (isSelectingVideo || isUploading || isLoadingVideo) return;

		try {
			// FASE 1: SELECCIONANDO - Solo mostrar "Seleccionando..." sin progreso
			console.log(
				'🔄 FASE 1: User clicked gallery, showing "Seleccionando..."',
			);
			setIsSelectingVideo(true);
			setSelecting(true); // Deshabilitar tabs durante la selección (visible pero deshabilitado)
			setIsLoadingVideo(false); // Asegurar que no está en loading
			setLoadingProgress(0);

			// Request permissions first
			const permissionResult =
				await ImagePicker.requestMediaLibraryPermissionsAsync();

			if (permissionResult.granted === false) {
				Alert.alert(t('common.error'), t('upload.galleryPermissionRequired'), [
					{ text: t('common.ok') },
				]);
				return;
			}

			// Launch gallery picker
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['videos'],
				allowsEditing: false,
				quality: 1.0,
				videoMaxDuration: 300,
				...(Platform.OS === 'ios' && {
					videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
					allowsMultipleSelection: false,
				}),
			});

			if (!result.canceled && result.assets[0]) {
				const asset = result.assets[0];
				const durationInSeconds = (asset.duration || 0) / 1000;
				const fileSizeInMB = (asset.fileSize || 0) / (1024 * 1024);

				// Check if video is from iCloud (common indicators)
				const isFromiCloud =
					asset.uri.includes('icloud') ||
					asset.uri.includes('CloudDocs') ||
					fileSizeInMB === 0; // iCloud videos often show 0 size initially

				console.log(
					`📱 Video selected - Duration: ${durationInSeconds}s, Size: ${fileSizeInMB.toFixed(
						2,
					)}MB, iCloud: ${isFromiCloud}`,
				);

				if (isFromiCloud) {
					console.log('⚠️ Video is from iCloud, may need time to download');
				}

				// Validate minimum duration (15 seconds)
				if (durationInSeconds < 15) {
					setIsSelectingVideo(false);
					setSelecting(false);
					Alert.alert(t('common.error'), t('upload.videoTooShort'), [
						{ text: t('common.ok') },
					]);
					return;
				}

				// Validate maximum duration (5 minutes = 300 seconds)
				if (durationInSeconds > 300) {
					setIsSelectingVideo(false);
					setSelecting(false);
					Alert.alert(t('common.error'), t('upload.videoTooLong'), [
						{ text: t('common.ok') },
					]);
					return;
				}

				// Only validate file size if it's available (not 0 from iCloud)
				if (fileSizeInMB > 0 && fileSizeInMB > 100) {
					setIsSelectingVideo(false);
					setSelecting(false);
					Alert.alert(
						t('common.error'),
						'El video es demasiado grande. Máximo 100MB.',
						[{ text: t('common.ok') }],
					);
					return;
				}

				// Video seleccionado correctamente, ahora mostrar carga
				console.log('✅ Video selected by user, starting loading phase...');

				// FASE 2: CARGANDO - Terminar selección y empezar carga
				setIsSelectingVideo(false);
				setSelecting(false);
				setIsLoadingVideo(true);
				setLoadingProgress(0);

				console.log(
					'🔄 FASE 2: Transitioned to loading state, UI should update now',
				);

				// Guardar el video seleccionado
				const videoData = {
					uri: asset.uri,
					duration: asset.duration || 0,
				};
				setSelectedVideo(videoData);

				// Usar setTimeout para hacer la simulación asíncrona y no bloquear la UI
				setTimeout(() => {
					console.log('📱 Starting video loading simulation...');

					// Simular progreso de carga del video
					let progress = 0;
					const interval = setInterval(() => {
						progress += Math.random() * 8 + 3; // 3-11% incrementos más pequeños

						// Actualizar progreso en la UI
						setLoadingProgress(Math.min(progress, 100));
						console.log(
							`📊 Video loading: ${Math.round(Math.min(progress, 100))}%`,
						);

						if (progress >= 100) {
							clearInterval(interval);
							setLoadingInterval(null);

							// Una vez completada la carga, abrir el editor después de un breve delay
							setTimeout(() => {
								console.log('✅ Video loading completed, opening editor...');
								setIsLoadingVideo(false);
								setLoadingProgress(0);
								setShowEditor(true);
								setEditing(true);
							}, 200);
						}
					}, 200); // Cada 200ms para más fluidez

					// Guardar referencia del intervalo para poder limpiarlo si es necesario
					setLoadingInterval(interval);
				}, 50); // Delay mínimo para permitir que la UI se actualice primero
			} else {
				// Usuario canceló la selección
				console.log('❌ User canceled video selection');
				setIsSelectingVideo(false);
				setSelecting(false);
			}
		} catch (error) {
			console.error('Error selecting video:', error);

			// Limpiar interval si existe
			cleanupInterval();

			// Reset loading state on error
			setIsLoadingVideo(false);
			setLoadingProgress(0);
			setIsSelectingVideo(false);
			setSelecting(false);

			if (isErrorWithMessage(error)) {
				if (error.message === 'Selection timeout') {
					Alert.alert(
						'Timeout de selección',
						'La selección de video tardó demasiado. Si el video está en iCloud, intenta descargarlo primero desde la app Fotos.',
						[
							{ text: 'Entendido' },
							{
								text: 'Consejos',
								onPress: () => {
									Alert.alert(
										'Consejos para videos más rápidos',
										'• Usa videos guardados localmente en tu dispositivo\n• Si es de iCloud, abre Fotos y descárgalo primero\n• Videos más cortos cargan más rápido\n• Evita videos muy pesados (>50MB)',
										[{ text: 'Entendido' }],
									);
								},
							},
						],
					);
				} else if (error.message.includes('FileProvider')) {
					Alert.alert(
						'Error de iCloud',
						'Parece que el video está en iCloud y no se puede acceder. Intenta descargarlo primero desde la app Fotos.',
						[{ text: t('common.ok') }],
					);
				} else {
					Alert.alert(t('common.error'), t('errors.somethingWentWrong'), [
						{ text: t('common.ok') },
					]);
				}
			} else {
				Alert.alert(t('common.error'), t('errors.somethingWentWrong'), [
					{ text: t('common.ok') },
				]);
			}
		} finally {
			setIsSelectingVideo(false);
			setSelecting(false);
			// Solo resetear estados de carga si hay error (no si el video se está cargando exitosamente)
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
		if (!selectedVideo || !user) {
			Alert.alert('Error', 'No hay usuario autenticado o video seleccionado', [
				{ text: 'OK' },
			]);
			return;
		}

		console.log(
			'🚀 User clicked "Compartir", starting real compression upload process...',
		);

		// Activar estado de uploading INMEDIATAMENTE
		setIsUploading(true);
		setUploading(true);
		setUploadProgress(0);

		try {
			// Activar background task para compresión (útil para videos largos)
			try {
				const videoCompressionModule = await import(
					'@/services/videoCompression'
				);
				const VideoCompression = videoCompressionModule.VideoCompression;
				await VideoCompression.activateBackgroundTask();
				console.log('✅ Background compression task activated');
			} catch (bgError) {
				console.warn('⚠️ Failed to activate background task:', bgError);
			}

			// Usar el nuevo VideoService con compresión real
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
				onProgress: (progress) => {
					setUploadProgress(progress);
					console.log(`📊 Upload progress: ${progress.toFixed(1)}%`);
				},
			});

			console.log('📋 Upload result:', uploadResult);

			if (uploadResult.success) {
				// Desactivar background task
				try {
					const videoCompressionModule = await import(
						'@/services/videoCompression'
					);
					const VideoCompression = videoCompressionModule.VideoCompression;
					await VideoCompression.deactivateBackgroundTask();
					await VideoCompression.cleanupTempFiles();
				} catch (cleanupError) {
					console.warn('⚠️ Cleanup warning:', cleanupError);
				}

				// Refresh user session
				try {
					await refreshSession();
					console.log('✅ User profile refreshed after video upload');
				} catch (error) {
					console.warn('⚠️ Failed to refresh user session:', error);
				}

				// Mostrar mensaje de éxito
				Alert.alert(
					t('upload.uploadSuccess'),
					'¡Tu video ha sido subido exitosamente!',
					[
						{
							text: t('common.ok'),
							onPress: () => {
								// Limpiar TODOS los estados para que las tabs vuelvan a aparecer
								setSelectedVideo(null);
								setShowEditor(false);
								setEditing(false);
								setUploading(false);
								setIsUploading(false);
								setUploadProgress(0);
								setIsLoadingVideo(false);
								setLoadingProgress(0);
								setIsSelectingVideo(false);
								setSelecting(false);
								isCancelingRef.current = false;
								
								// Navegar al perfil
								router.push('/(tabs)/profile');
							},
						},
					],
				);
			} else {
				const errorMsg = uploadResult.error || 'Failed to upload video';
				console.error('❌ Upload failed:', errorMsg);

				// Solo mostrar error si no estamos cancelando Y no es un mensaje de cancelación
				if (!isCancelingRef.current && !errorMsg.includes('cancelled')) {
					Alert.alert(t('common.error'), errorMsg, [{ text: t('common.ok') }]);
				} else {
					console.log('🛑 Upload failed but canceling - suppressing error alert:', errorMsg);
				}
			}
		} catch (error) {
			console.error('💥 Unexpected upload error:', error);

			// Cancelar cualquier compresión activa
			try {
				await VideoService.cancelUpload();
			} catch (cancelError) {
				console.warn('Failed to cancel upload:', cancelError);
			}

			const errorMessage =
				error instanceof Error ? error.message : 'Upload failed unexpectedly';
			
			// Solo mostrar error si no estamos cancelando Y no es un mensaje de cancelación
			if (!isCancelingRef.current && !errorMessage.includes('cancelled')) {
				Alert.alert(t('common.error'), errorMessage, [{ text: t('common.ok') }]);
			} else {
				console.log('🛑 Unexpected error but canceling - suppressing error alert:', errorMessage);
			}
		} finally {
			// Desactivar background task y limpiar archivos temporales
			try {
				const videoCompressionModule = await import(
					'@/services/videoCompression'
				);
				const VideoCompression = videoCompressionModule.VideoCompression;
				await VideoCompression.deactivateBackgroundTask();
				await VideoCompression.cleanupTempFiles();
			} catch (finalCleanupError) {
				console.warn('Final cleanup warning:', finalCleanupError);
			}

			// Resetear todos los estados para que las tabs vuelvan a aparecer
			setIsUploading(false);
			setUploading(false);
			setUploadProgress(0);
			setIsLoadingVideo(false);
			setLoadingProgress(0);
			setIsSelectingVideo(false);
			setSelecting(false);
			setEditing(false); // Importante: resetear editing para mostrar tabs
			isCancelingRef.current = false;
		}
	};

	// Función para cancelar upload (sin mostrar alert)
	const handleCancelUpload = async () => {
		try {
			console.log('🛑 Canceling upload and compression...');
			
			// Marcar que estamos cancelando para evitar mostrar errores
			isCancelingRef.current = true;
			
			// Cancelar upload y compresión
			await VideoService.cancelUpload();

			// Desactivar background task y limpiar archivos temporales
			try {
				const videoCompressionModule = await import(
					'@/services/videoCompression'
				);
				const VideoCompression = videoCompressionModule.VideoCompression;
				await VideoCompression.deactivateBackgroundTask();
				await VideoCompression.cleanupTempFiles();
			} catch (cleanupError) {
				console.warn('Cleanup warning during cancel:', cleanupError);
			}

			// Resetear estados
			setIsUploading(false);
			setUploading(false);
			setUploadProgress(0);
			setEditing(false); // Resetear editing para mostrar tabs
			isCancelingRef.current = false;

			console.log('✅ Upload cancelled successfully');
		} catch (error) {
			console.warn('Failed to cancel upload:', error);
			// Forzar reset de estados aunque haya error
			setIsUploading(false);
			setUploading(false);
			setUploadProgress(0);
			setEditing(false); // Resetear editing para mostrar tabs
			isCancelingRef.current = false;
		}
	};

	// UseEffect para cleanup al desmontar componente
	useEffect(() => {
		return () => {
			// Cleanup al desmontar componente
			VideoService.cancelUpload().catch(console.warn);
		};
	}, []);

	const handleVideoEditorCancel = () => {
		// Limpiar interval si existe
		cleanupInterval();

		// Resetear todos los estados al cancelar
		setSelectedVideo(null);
		setShowEditor(false);
		setEditing(false);
		setIsLoadingVideo(false);
		setLoadingProgress(0);
		setIsSelectingVideo(false);
		setSelecting(false);
		setIsUploading(false);
		setUploading(false);
		isCancelingRef.current = false;
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
				onCancelUpload={handleCancelUpload}
				isUploading={isUploading}
				uploadProgress={uploadProgress}
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
							disabled={isUploading || isSelectingVideo || isLoadingVideo}
						>
							<LinearGradient
								colors={Colors.gradientPrimary}
								style={styles.selectionButtonGradient}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
							>
								{isLoadingVideo ? (
									<CircularProgress
										progress={loadingProgress}
										size={40}
										strokeWidth={4}
										color={Colors.text}
										backgroundColor="rgba(255, 255, 255, 0.3)"
										showPercentage={false}
									/>
								) : isSelectingVideo ? (
									<Spinner size={32} color={Colors.text} />
								) : (
									<Feather name="image" size={32} color={Colors.text} />
								)}
								<Text style={styles.selectionButtonText}>
									{isLoadingVideo
										? `Cargando... ${Math.round(loadingProgress)}%`
										: isSelectingVideo
										? 'Seleccionando...'
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
						<CircularProgress
							progress={uploadProgress}
							size={80}
							strokeWidth={8}
							color={Colors.primary}
							backgroundColor={Colors.textTertiary}
							showPercentage={true}
						/>
						<Text style={styles.loadingText}>Subiendo video...</Text>
						<Text style={styles.loadingSubtext}>Procesando y enviando al servidor</Text>
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
		marginTop: 12,
		textAlign: 'center',
	},
	loadingSubtext: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginTop: 4,
		textAlign: 'center',
	},
});
