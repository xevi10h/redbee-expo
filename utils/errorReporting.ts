import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";

export class ErrorReporting {
	/**
	 * Report error to logging service
	 */
	static async reportError(
		error: Error, 
		context: string, 
		userId?: string,
		additionalData?: any
	): Promise<void> {
		try {
			const errorData = {
				message: error.message,
				stack: error.stack,
				context,
				user_id: userId,
				timestamp: new Date().toISOString(),
				platform: Platform.OS,
				app_version: process.env.EXPO_PUBLIC_APP_VERSION,
				additional_data: additionalData,
			};

			// TODO: Send to your error reporting service (Sentry, Bugsnag, etc.)
			console.error('Error reported:', errorData);
			
			// Also log to Supabase for internal tracking
			await supabase
				.from('error_logs')
				.insert(errorData);

		} catch (reportingError) {
			console.error('Failed to report error:', reportingError);
		}
	}

	/**
	 * Report performance issue
	 */
	static async reportPerformanceIssue(
		issue: string,
		metrics: {
			loadTime?: number;
			frameDrops?: number;
			memoryUsage?: number;
		},
		userId?: string
	): Promise<void> {
		try {
			const performanceData = {
				issue,
				metrics,
				user_id: userId,
				timestamp: new Date().toISOString(),
				platform: Platform.OS,
				app_version: process.env.EXPO_PUBLIC_APP_VERSION,
			};

			console.log('Performance issue reported:', performanceData);
			
			// TODO: Send to analytics service
		} catch (error) {
			console.error('Failed to report performance issue:', error);
		}
	}
}