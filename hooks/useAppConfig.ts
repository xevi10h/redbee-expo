import { supabase } from '@/lib/supabase';
import { AppConfiguration } from '@/shared/types';
import { useCallback, useEffect, useState } from 'react';

const defaultConfig: AppConfiguration = {
	default_commission_rate: 30.00,
	min_video_duration: 15,
	max_video_duration: 300,
	preview_duration: 5,
	supported_currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CNY'],
	max_file_size: 100 * 1024 * 1024, // 100MB
	supported_video_formats: ['mp4', 'mov', 'avi'],
};

export const useAppConfig = () => {
	const [config, setConfig] = useState<AppConfiguration>(defaultConfig);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadConfig = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const { data, error: configError } = await supabase
				.from('app_config')
				.select('*')
				.limit(1)
				.single();

			if (configError && configError.code !== 'PGRST116') {
				throw configError;
			}

			if (data) {
				setConfig({
					...defaultConfig,
					...data,
					supported_currencies: data.supported_currencies || defaultConfig.supported_currencies,
				});
			}
		} catch (err) {
			console.error('Failed to load app config:', err);
			setError(err instanceof Error ? err.message : 'Failed to load configuration');
			// Use default config on error
			setConfig(defaultConfig);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadConfig();
	}, [loadConfig]);

	return {
		config,
		isLoading,
		error,
		reload: loadConfig,
	};
};
