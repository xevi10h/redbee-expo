import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { VideoAnalyticsPanel } from '@/components/analytics/VideoAnalyticsPanel';

export default function VideoAnalyticsPage() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();

	if (!id) {
		return null;
	}

	const handleClose = () => {
		router.back();
	};

	return (
		<VideoAnalyticsPanel 
			videoId={id}
			onClose={handleClose}
		/>
	);
}