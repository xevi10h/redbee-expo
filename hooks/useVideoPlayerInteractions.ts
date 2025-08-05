import { Video } from '@/shared/types';
import { useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useUserInteractions } from './useUserInteractions';
import { useVideoInteractions } from './useVideoInteractions';

export const useVideoPlayerInteractions = () => {
	const { user } = useAuth();
	const videoInteractions = useVideoInteractions();
	const userInteractions = useUserInteractions();
	const [videos, setVideos] = useState<Video[]>([]);

	// Update video in state
	const updateVideo = useCallback((videoId: string, updates: Partial<Video>) => {
		setVideos(prev => prev.map(video => 
			video.id === videoId ? { ...video, ...updates } : video
		));
	}, []);

	// Handle like with optimistic update
	const handleLike = useCallback(async (videoId: string) => {
		if (!user) return;

		// Optimistic update
		updateVideo(videoId, {
			is_liked: !videos.find(v => v.id === videoId)?.is_liked,
			likes_count: (videos.find(v => v.id === videoId)?.likes_count || 0) + 
				(videos.find(v => v.id === videoId)?.is_liked ? -1 : 1),
		});

		try {
			const liked = await videoInteractions.handleLike(videoId);
			// Update with actual result
			updateVideo(videoId, { is_liked: liked });
		} catch (error) {
			// Revert optimistic update on error
			const video = videos.find(v => v.id === videoId);
			if (video) {
				updateVideo(videoId, {
					is_liked: !video.is_liked,
					likes_count: video.likes_count + (video.is_liked ? 1 : -1),
				});
			}
		}
	}, [user, videos, videoInteractions, updateVideo]);

	// Handle follow with optimistic update
	const handleFollow = useCallback(async (userId: string) => {
		if (!user) return;

		// Optimistic update
		setVideos(prev => prev.map(video => 
			video.user?.id === userId 
				? { ...video, is_following: !video.is_following }
				: video
		));

		try {
			const following = await userInteractions.handleFollow(userId);
			// Update with actual result
			setVideos(prev => prev.map(video => 
				video.user?.id === userId 
					? { ...video, is_following: following }
					: video
			));
		} catch (error) {
			// Revert optimistic update on error
			setVideos(prev => prev.map(video => 
				video.user?.id === userId 
					? { ...video, is_following: !video.is_following }
					: video
			));
		}
	}, [user, userInteractions]);

	// Handle subscribe with optimistic update
	const handleSubscribe = useCallback(async (creatorId: string) => {
		if (!user) return;

		try {
			const subscribed = await userInteractions.handleSubscribe(creatorId);
			if (subscribed) {
				// Update all videos from this creator
				setVideos(prev => prev.map(video => 
					video.user?.id === creatorId 
						? { ...video, is_subscribed: true }
						: video
				));
			}
		} catch (error) {
			console.error('Subscribe error:', error);
		}
	}, [user, userInteractions]);

	// Handle comment action (for opening comments)
	const handleComment = useCallback((videoId: string) => {
		// This function is used to trigger opening the comments modal
		// The actual comment functionality is handled by the VideoPlayer component
		console.log('Opening comments for video:', videoId);
	}, []);

	// Handle comment count update
	const handleCommentAdded = useCallback((videoId: string) => {
		updateVideo(videoId, {
			comments_count: (videos.find(v => v.id === videoId)?.comments_count || 0) + 1,
		});
	}, [videos, updateVideo]);

	// Handle report
	const handleReport = useCallback(async (videoId: string, reason: string = 'inappropriate') => {
		if (!user) return;

		try {
			await videoInteractions.handleReport(videoId, reason);
		} catch (error) {
			console.error('Report error:', error);
		}
	}, [user, videoInteractions]);

	return {
		videos,
		setVideos,
		handleLike,
		handleComment,
		handleFollow,
		handleSubscribe,
		handleCommentAdded,
		handleReport,
		updateVideoState: updateVideo,
		isLoading: (action: string, id: string) => 
			videoInteractions.isLoading(`${action}-${id}`) || 
			userInteractions.isLoading(`${action}-${id}`),
	};
};