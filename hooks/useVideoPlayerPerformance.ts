import { PerformanceMonitor } from '@/services/performanceMonitoringService.js';
import { ErrorReporting } from '@/utils/errorReporting';
import { useCallback, useEffect, useState } from 'react';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';

export const useVideoPlayerPerformance = (videoId: string) => {
	const { measureOperation } = usePerformanceMonitoring('VideoPlayer');
	const [metrics, setMetrics] = useState({
		loadTime: 0,
		firstFrameTime: 0,
		bufferingEvents: 0,
		totalBufferingTime: 0,
	});

	const trackVideoLoad = useCallback(async () => {
		return await measureOperation(async () => {
			// Video loading is handled by expo-av
			// This is more for tracking the load completion
		}, 'video_load');
	}, [measureOperation]);

	const trackBuffering = useCallback(
		(isBuffering: boolean) => {
			if (isBuffering) {
				PerformanceMonitor.startMeasurement(`buffering_${videoId}`);
				setMetrics((prev) => ({
					...prev,
					bufferingEvents: prev.bufferingEvents + 1,
				}));
			} else {
				const bufferingTime = PerformanceMonitor.endMeasurement(
					`buffering_${videoId}`,
				);
				setMetrics((prev) => ({
					...prev,
					totalBufferingTime: prev.totalBufferingTime + bufferingTime,
				}));
			}
		},
		[videoId],
	);

	const reportMetrics = useCallback(() => {
		PerformanceMonitor.logMetrics(`video_${videoId}`, metrics);

		// Report poor performance
		if (metrics.bufferingEvents > 5 || metrics.totalBufferingTime > 10000) {
			ErrorReporting.reportPerformanceIssue(
				'Poor video playback performance',
				metrics,
			);
		}
	}, [videoId, metrics]);

	// Report metrics when component unmounts
	useEffect(() => {
		return () => {
			reportMetrics();
		};
	}, [reportMetrics]);

	return {
		metrics,
		trackVideoLoad,
		trackBuffering,
		reportMetrics,
	};
};
