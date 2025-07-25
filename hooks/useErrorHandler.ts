import { ErrorReporting } from "@/utils/errorReporting";
import { useCallback } from "react";
import { Alert } from "react-native";

export const useErrorHandler = () => {
	const handleError = useCallback((
		error: Error,
		context: string = 'unknown',
		showAlert: boolean = true,
		userId?: string
	) => {
		// Report error
		ErrorReporting.reportError(error, context, userId);

		// Show user-friendly alert if requested
		if (showAlert) {
			Alert.alert(
				'Error',
				'Ha ocurrido un problema. Nuestro equipo ha sido notificado.',
				[{ text: 'OK' }]
			);
		}
	}, []);

	const handleAsyncError = useCallback(async (
		asyncOperation: () => Promise<any>,
		context: string = 'async_operation',
		userId?: string
	) => {
		try {
			return await asyncOperation();
		} catch (error) {
			handleError(error as Error, context, true, userId);
			throw error; // Re-throw for caller to handle
		}
	}, [handleError]);

	return {
		handleError,
		handleAsyncError,
	};
};
