// services/videoCompression.ts - Versión corregida con react-native-compressor REAL

import * as FileSystem from 'expo-file-system';
import { Video } from 'react-native-compressor';

export interface CompressionSettings {
	quality: 'low' | 'medium' | 'high';
	maxFileSize: number; // MB
	resolution?: '480p' | '720p' | '1080p';
	fps?: number;
	bitrate?: number; // kbps
	format?: 'mp4' | 'mov';
	onProgress?: (progress: number) => void;
}

export interface CompressionResult {
	success: boolean;
	uri?: string;
	error?: string;
	compressionRatio?: number;
	originalSize?: number;
	compressedSize?: number;
	cancellationId?: string;
}

export class VideoCompression {
	// Configuración estándar para todos los videos - optimizada para consistencia
	private static readonly STANDARD_CONFIG: Required<
		Omit<CompressionSettings, 'onProgress'>
	> = {
		quality: 'medium',
		maxFileSize: 25, // 25MB máximo después de compresión
		resolution: '720p', // Resolución estándar HD
		fps: 30, // FPS estándar
		bitrate: 1500, // 1.5 Mbps - balance entre calidad y tamaño
		format: 'mp4', // Formato estándar
	};

	// Mapeo de configuraciones a parámetros de react-native-compressor
	private static readonly COMPRESSION_PARAMS = {
		'720p': 1280, // maxSize para 720p
		'480p': 854, // maxSize para 480p
		'1080p': 1920, // maxSize para 1080p
	};

	// Store active compression IDs for potential cancellation
	private static activeCompressions = new Set<string>();

	/**
	 * ✅ CORRECCIÓN: Comprimir video usando react-native-compressor REAL
	 */
	static async compressVideo(
		videoUri: string,
		settings: Partial<CompressionSettings> = {},
	): Promise<CompressionResult> {
		let cancellationId: string | undefined;

		try {
			console.log(
				'🔄 Starting REAL video compression with react-native-compressor...',
			);

			// Combinar configuración estándar con configuración personalizada
			const config: Required<CompressionSettings> = {
				...this.STANDARD_CONFIG,
				...settings,
				onProgress: settings.onProgress || (() => {}),
			};

			// Verificar que el archivo existe
			const fileInfo = await FileSystem.getInfoAsync(videoUri);
			if (!fileInfo.exists) {
				throw new Error('Video file not found');
			}

			const originalSize = 'size' in fileInfo ? fileInfo.size : 0;
			const originalSizeMB = originalSize / (1024 * 1024);

			console.log(`📹 Original video: ${originalSizeMB.toFixed(2)}MB`);
			console.log(
				`🎯 Target: ${config.resolution}, max ${config.maxFileSize}MB, ${config.bitrate}kbps`,
			);

			config.onProgress(5);

			// ✅ USAR REACT-NATIVE-COMPRESSOR REALMENTE
			console.log('🚀 Using react-native-compressor for REAL compression...');

			// Configurar parámetros de compresión para react-native-compressor
			const compressionOptions = this.getCompressionOptions(config);
			console.log(`🔧 Compression options:`, compressionOptions);

			config.onProgress(10);

			// ✅ COMPRESIÓN REAL con react-native-compressor
			const compressedUri = await Video.compress(
				videoUri,
				{
					...compressionOptions,
					// Configurar callback para obtener ID de cancelación
					getCancellationId: (id: string) => {
						cancellationId = id;
						this.activeCompressions.add(id);
						console.log(`📋 Real compression started with ID: ${id}`);
					},
				},
				(progress: number) => {
					// El progreso viene como 0-1, convertir a 10-95%
					const mappedProgress = 10 + progress * 85;
					config.onProgress(mappedProgress);
					console.log(
						`📊 REAL compression progress: ${(progress * 100).toFixed(
							1,
						)}% (mapped: ${mappedProgress.toFixed(1)}%)`,
					);
				},
			);

			// Limpiar ID de compresión activa
			if (cancellationId) {
				this.activeCompressions.delete(cancellationId);
			}

			console.log(`✅ REAL compression completed! Output: ${compressedUri}`);
			config.onProgress(95);

			// Verificar archivo comprimido
			const compressedInfo = await FileSystem.getInfoAsync(compressedUri);
			if (!compressedInfo.exists) {
				throw new Error('Real compression failed - output file not created');
			}

			const compressedSize = 'size' in compressedInfo ? compressedInfo.size : 0;
			const compressedSizeMB = compressedSize / (1024 * 1024);
			const compressionRatio =
				originalSize > 0 ? originalSizeMB / compressedSizeMB : 1;

			console.log(
				`🎉 REAL compression SUCCESS: ${originalSizeMB.toFixed(
					2,
				)}MB → ${compressedSizeMB.toFixed(2)}MB (${compressionRatio.toFixed(
					1,
				)}x reduction)`,
			);

			// Verificar que el archivo comprimido no excede el límite
			if (compressedSizeMB > config.maxFileSize) {
				console.warn(
					`⚠️ Compressed file (${compressedSizeMB.toFixed(
						2,
					)}MB) exceeds target (${config.maxFileSize}MB) but proceeding...`,
				);
			}

			config.onProgress(100);

			return {
				success: true,
				uri: compressedUri,
				compressionRatio,
				originalSize,
				compressedSize,
				cancellationId,
			};
		} catch (error) {
			// Limpiar ID de compresión activa en caso de error
			if (cancellationId) {
				this.activeCompressions.delete(cancellationId);
			}

			console.error('❌ REAL video compression failed:', error);

			// Manejar errores específicos de react-native-compressor
			let errorMessage = 'Real compression failed';
			if (error instanceof Error) {
				if (error.message.includes('cancelled')) {
					errorMessage = 'Compression was cancelled';
				} else if (error.message.includes('not found')) {
					errorMessage = 'Video file not found';
				} else if (error.message.includes('format')) {
					errorMessage = 'Video format not supported';
				} else {
					errorMessage = error.message;
				}
			}

			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Cancelar compresión en curso
	 */
	static cancelCompression(cancellationId: string): void {
		try {
			Video.cancelCompression(cancellationId);
			this.activeCompressions.delete(cancellationId);
			console.log(`🛑 Compression cancelled: ${cancellationId}`);
		} catch (error) {
			console.warn(`Failed to cancel compression ${cancellationId}:`, error);
		}
	}

	/**
	 * Cancelar todas las compresiones activas
	 */
	static cancelAllCompressions(): void {
		for (const id of this.activeCompressions) {
			this.cancelCompression(id);
		}
		this.activeCompressions.clear();
	}

	/**
	 * ✅ CORRECCIÓN: Background tasks opcionales (pueden no estar disponibles)
	 */
	static async activateBackgroundTask(): Promise<void> {
		try {
			if (Video.activateBackgroundTask) {
				await Video.activateBackgroundTask(() => {
					console.log('⏰ Background compression task expired');
				});
				console.log('🔄 Background compression task activated');
			} else {
				console.log('⚠️ Background task not available, skipping...');
			}
		} catch (error) {
			console.warn('⚠️ Failed to activate background task (optional):', error);
		}
	}

	/**
	 * ✅ CORRECCIÓN: Background tasks opcionales
	 */
	static async deactivateBackgroundTask(): Promise<void> {
		try {
			if (Video.deactivateBackgroundTask) {
				await Video.deactivateBackgroundTask();
				console.log('⏹️ Background compression task deactivated');
			} else {
				console.log('⚠️ Background task not available, skipping...');
			}
		} catch (error) {
			console.warn(
				'⚠️ Failed to deactivate background task (optional):',
				error,
			);
		}
	}

	/**
	 * Obtener configuración estándar recomendada
	 */
	static getRecommendedSettings(
		durationSeconds: number,
		fileSizeMB: number,
	): CompressionSettings {
		// Siempre usar configuración estándar independientemente del input
		return {
			...this.STANDARD_CONFIG,
		};
	}

	/**
	 * Limpiar archivos temporales de compresión
	 */
	static async cleanupTempFiles(): Promise<void> {
		try {
			const cacheDir = FileSystem.cacheDirectory;
			if (!cacheDir) return;

			const files = await FileSystem.readDirectoryAsync(cacheDir);

			// Buscar archivos temporales de react-native-compressor
			const tempVideoFiles = files.filter(
				(file) =>
					(file.includes('compressed') || file.includes('RNCompressor')) &&
					(file.endsWith('.mp4') || file.endsWith('.mov')),
			);

			for (const file of tempVideoFiles) {
				try {
					await FileSystem.deleteAsync(`${cacheDir}${file}`, {
						idempotent: true,
					});
					console.log(`🧹 Cleaned up temp file: ${file}`);
				} catch (error) {
					console.warn(`Failed to delete temp file ${file}:`, error);
				}
			}
		} catch (error) {
			console.warn('Failed to cleanup temp files:', error);
		}
	}

	/**
	 * Configurar parámetros específicos para react-native-compressor
	 */
	private static getCompressionOptions(config: Required<CompressionSettings>) {
		const maxSize = this.COMPRESSION_PARAMS[config.resolution];

		// ✅ USAR COMPRESIÓN MANUAL para mayor control
		const compressionMethod = 'manual'; // Siempre manual para control preciso

		const options: any = {
			compressionMethod,
			maxSize,
			minimumFileSizeForCompress: 0, // Siempre comprimir
			bitrate: config.bitrate * 1000, // Convertir kbps a bps
			progressDivider: 1, // Progreso más frecuente
		};

		console.log(`🎯 React-native-compressor options:`, {
			compressionMethod: options.compressionMethod,
			maxSize: options.maxSize,
			bitrate: `${config.bitrate}kbps (${options.bitrate}bps)`,
			minimumFileSizeForCompress: options.minimumFileSizeForCompress,
		});

		return options;
	}

	/**
	 * Verificar si un video necesita compresión
	 */
	static async needsCompression(
		videoUri: string,
		maxSizeMB: number = 25,
	): Promise<boolean> {
		try {
			const fileInfo = await FileSystem.getInfoAsync(videoUri);
			const sizeMB = 'size' in fileInfo ? fileInfo.size / (1024 * 1024) : 0;

			// Siempre comprimir para garantizar formato y calidad estándar
			if (sizeMB > maxSizeMB) {
				console.log(
					`📏 Video size (${sizeMB.toFixed(
						2,
					)}MB) exceeds limit (${maxSizeMB}MB) - compression needed`,
				);
			} else {
				console.log(
					`📏 Video size (${sizeMB.toFixed(
						2,
					)}MB) is acceptable, but compressing for format standardization`,
				);
			}

			return true;
		} catch (error) {
			console.warn('Failed to check video size:', error);
			return true; // Comprimir por defecto en caso de error
		}
	}

	/**
	 * Obtener compresiones activas
	 */
	static getActiveCompressions(): string[] {
		return Array.from(this.activeCompressions);
	}

	/**
	 * Verificar si hay compresiones activas
	 */
	static hasActiveCompressions(): boolean {
		return this.activeCompressions.size > 0;
	}

	/**
	 * Obtener información del video
	 */
	static async getVideoInfo(videoUri: string): Promise<{
		duration?: number;
		size?: number;
		width?: number;
		height?: number;
	}> {
		try {
			const fileInfo = await FileSystem.getInfoAsync(videoUri);

			return {
				size: 'size' in fileInfo ? fileInfo.size : undefined,
			};
		} catch (error) {
			console.warn('Failed to get video info:', error);
			return {};
		}
	}
}
