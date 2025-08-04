import React, { useState } from 'react';

import { VideoMetadata, VideoTrimmer } from '@/components/video';
import { useTranslation } from '@/hooks/useTranslation';

interface VideoEditorProps {
	videoUri: string;
	duration: number;
	onSave: (data: {
		startTime: number;
		endTime: number;
		title: string;
		description: string;
		hashtags: string[];
		isPremium: boolean;
	}) => void;
	onCancel: () => void;
	isUploading?: boolean;
}

export function VideoEditor({
	videoUri,
	duration,
	onSave,
	onCancel,
	isUploading = false,
}: VideoEditorProps) {
	const { t } = useTranslation();
	
	// State for the two-step process
	const [step, setStep] = useState<'trim' | 'metadata'>('trim');
	const [startTime, setStartTime] = useState(0);
	const [endTime, setEndTime] = useState(Math.min(duration, 60));

	const handleTrimNext = () => {
		setStep('metadata');
	};

	const handleTrimCancel = () => {
		onCancel();
	};

	const handleTrimChange = (start: number, end: number) => {
		setStartTime(start);
		setEndTime(end);
	};

	const handleMetadataBack = () => {
		setStep('trim');
	};

	const handleMetadataSave = (metadata: {
		title: string;
		description: string;
		hashtags: string[];
		isPremium: boolean;
	}) => {
		onSave({
			startTime,
			endTime,
			...metadata,
		});
	};

	if (step === 'trim') {
		return (
			<VideoTrimmer
				videoUri={videoUri}
				duration={duration}
				onTrimChange={handleTrimChange}
				onNext={handleTrimNext}
				onCancel={handleTrimCancel}
			/>
		);
	}

	return (
		<VideoMetadata
			videoUri={videoUri}
			startTime={startTime}
			endTime={endTime}
			onSave={handleMetadataSave}
			onBack={handleMetadataBack}
			isUploading={isUploading}
		/>
	);
}