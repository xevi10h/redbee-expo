import { useCallback, useEffect, useRef } from 'react';

export interface VideoAnalytics {
	videoId: string;
	watchTime: number;
	completionRate: number;
	interactions: {
		liked: boolean;
		commented: boolean;
		shared: boolean;
		reported: boolean;
	};
}

export const useVideoAnalytics = () => {
	const analytics = useRef<Map<string, VideoAnalytics>>(new Map());
	const watchStartTime = useRef<number>(0);
	const currentVideoId = useRef<string>('');

	// Start tracking video
	const startTracking = useCallback((videoId: string) => {
		if (currentVideoId.current !== videoId) {
			// Finish tracking previous video
			if (currentVideoId.current && watchStartTime.current) {
				finishTracking(currentVideoId.current);
			}
			
			// Start new tracking
			currentVideoId.current = videoId;
			watchStartTime.current = Date.now();
			
			if (!analytics.current.has(videoId)) {
				analytics.current.set(videoId, {
					videoId,
					watchTime: 0,
					completionRate: 0,
					interactions: {
						liked: false,
						commented: false,
						shared: false,
						reported: false,
					},
				});
			}
		}
	}, []);

	// Finish tracking video
	const finishTracking = useCallback((videoId: string) => {
		if (watchStartTime.current) {
			const watchTime = Date.now() - watchStartTime.current;
			const current = analytics.current.get(videoId);
			
			if (current) {
				analytics.current.set(videoId, {
					...current,
					watchTime: current.watchTime + watchTime,
				});
			}
		}
		
		watchStartTime.current = 0;
	}, []);

	// Track interaction
	const trackInteraction = useCallback((
		videoId: string, 
		type: keyof VideoAnalytics['interactions']
	) => {
		const current = analytics.current.get(videoId);
		if (current) {
			analytics.current.set(videoId, {
				...current,
				interactions: {
					...current.interactions,
					[type]: true,
				},
			});
		}
	}, []);

	// Update completion rate
	const updateProgress = useCallback((videoId: string, progress: number) => {
		const current = analytics.current.get(videoId);
		if (current) {
			analytics.current.set(videoId, {
				...current,
				completionRate: Math.max(current.completionRate, progress),
			});
		}
	}, []);

	// Send analytics to backend
	const flushAnalytics = useCallback(async () => {
		const analyticsData = Array.from(analytics.current.values());
		
		if (analyticsData.length === 0) return;

		try {
			// TODO: Send to analytics backend
			// await AnalyticsService.trackVideoEngagement(analyticsData);
			console.log('Analytics data:', analyticsData);
			
			// Clear sent analytics
			analytics.current.clear();
		} catch (error) {
			console.error('Failed to send analytics:', error);
		}
	}, []);

	// Flush analytics periodically or on app state change
	useEffect(() => {
		const interval = setInterval(flushAnalytics, 30000); // Every 30 seconds
		return () => clearInterval(interval);
	}, [flushAnalytics]);

	return {
		startTracking,
		finishTracking,
		trackInteraction,
		updateProgress,
		flushAnalytics,
	};
};