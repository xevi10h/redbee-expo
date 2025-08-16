import React from 'react';
import { Modal } from 'react-native';

import { VideoAnalyticsPanel } from './VideoAnalyticsPanel';

interface VideoAnalyticsModalProps {
	isVisible: boolean;
	videoId: string;
	videoTitle?: string;
	onClose: () => void;
}

export const VideoAnalyticsModal: React.FC<VideoAnalyticsModalProps> = ({
	isVisible,
	videoId,
	videoTitle,
	onClose,
}) => {
	return (
		<Modal
			visible={isVisible}
			animationType="slide"
			presentationStyle="fullScreen"
			onRequestClose={onClose}
		>
			<VideoAnalyticsPanel 
				videoId={videoId}
				videoTitle={videoTitle}
				onClose={onClose}
			/>
		</Modal>
	);
};