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
