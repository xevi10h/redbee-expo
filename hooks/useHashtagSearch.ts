import { SearchService } from '@/services/searchService';
import { Video } from '@/shared/types';
import { useCallback, useEffect, useState } from 'react';

export interface HashtagWithTrending {
	hashtag: string;
	count: number;
	trending_score: number;
}

export const useHashtagSearch = (viewerId?: string) => {
	const [trendingHashtags, setTrendingHashtags] = useState<HashtagWithTrending[]>([]);
	const [isLoadingTrending, setIsLoadingTrending] = useState(false);
	const [trendingError, setTrendingError] = useState<string | null>(null);

	// Load trending hashtags
	const loadTrendingHashtags = useCallback(async (limit = 20) => {
		setIsLoadingTrending(true);
		setTrendingError(null);
		try {
			const result = await SearchService.searchHashtags(undefined, limit);
			if (result.success && result.data) {
				setTrendingHashtags(result.data.hashtags);
			} else {
				setTrendingError(result.error || 'Failed to load trending hashtags');
			}
		} catch (error) {
			setTrendingError(
				error instanceof Error ? error.message : 'Failed to load trending hashtags'
			);
		} finally {
			setIsLoadingTrending(false);
		}
	}, []);

	// Load trending hashtags on mount
	useEffect(() => {
		loadTrendingHashtags();
	}, [loadTrendingHashtags]);

	return {
		trendingHashtags,
		isLoadingTrending,
		trendingError,
		loadTrendingHashtags,
	};
};

export const useHashtagVideos = (hashtag: string, viewerId?: string) => {
	const [videos, setVideos] = useState<Video[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [page, setPage] = useState(0);

	const loadVideos = useCallback(
		async (pageNum = 0, shouldAppend = false) => {
			if (!hashtag) return;

			setIsLoading(true);
			setError(null);
			try {
				const limit = 20;
				const offset = pageNum * limit;
				const result = await SearchService.getVideosByHashtag(
					hashtag,
					viewerId,
					limit,
					offset
				);

				if (result.success && result.data) {
					setVideos(prev =>
						shouldAppend ? [...prev, ...result.data!.videos] : result.data!.videos
					);
					setHasMore(result.data.hasMore);
				} else {
					setError(result.error || 'Failed to load videos');
				}
			} catch (error) {
				setError(
					error instanceof Error ? error.message : 'Failed to load videos'
				);
			} finally {
				setIsLoading(false);
			}
		},
		[hashtag, viewerId]
	);

	const loadMore = useCallback(() => {
		if (!isLoading && hasMore) {
			const nextPage = page + 1;
			setPage(nextPage);
			loadVideos(nextPage, true);
		}
	}, [isLoading, hasMore, page, loadVideos]);

	const refresh = useCallback(() => {
		setPage(0);
		loadVideos(0, false);
	}, [loadVideos]);

	// Load videos when hashtag changes
	useEffect(() => {
		if (hashtag) {
			setPage(0);
			loadVideos(0, false);
		} else {
			setVideos([]);
			setHasMore(false);
		}
	}, [hashtag, loadVideos]);

	return {
		videos,
		isLoading,
		error,
		hasMore,
		loadMore,
		refresh,
		canLoadMore: hasMore && !isLoading,
	};
};