import { PerformanceMonitor } from '@/components/VideoPlayerWrapper';
import { useCallback, useEffect, useRef } from 'react';

export const usePerformanceMonitoring = (componentName: string) => {
	const renderCount = useRef(0);
	const mountTime = useRef(Date.now());

	// Track renders
	useEffect(() => {
		renderCount.current++;
	});

	// Track mount/unmount
	useEffect(() => {
		const mountDuration = Date.now() - mountTime.current;

		PerformanceMonitor.logMetrics(`${componentName}_mount`, {
			mount_duration: mountDuration,
		});

		return () => {
			const totalLifetime = Date.now() - mountTime.current;
			PerformanceMonitor.logMetrics(`${componentName}_unmount`, {
				total_lifetime: totalLifetime,
				render_count: renderCount.current,
			});
		};
	}, [componentName]);

	const measureOperation = useCallback(
		async <T,>(
			operation: () => Promise<T>,
			operationName: string,
		): Promise<T> => {
			const { result, duration } = await PerformanceMonitor.measureAsync(
				operation,
				`${componentName}_${operationName}`,
			);

			PerformanceMonitor.logMetrics(`${componentName}_${operationName}`, {
				duration,
			});

			return result;
		},
		[componentName],
	);

	return {
		measureOperation,
		renderCount: renderCount.current,
	};
};
