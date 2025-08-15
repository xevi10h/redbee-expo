import { SearchService } from '@/services/searchService';
import { UserProfile } from '@/shared/types';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SearchType = 'users' | 'hashtags' | 'videos';

export const useSearch = (searchType: SearchType, viewerId?: string) => {
	const [query, setQuery] = useState('');
	const [isSearching, setIsSearching] = useState(false);
	const [results, setResults] = useState<{
		users: UserProfile[];
		hashtags: { hashtag: string; count: number; trending_score?: number }[];
		videos: any[];
	}>({
		users: [],
		hashtags: [],
		videos: [],
	});
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [page, setPage] = useState(0);
	const [total, setTotal] = useState(0);

	// Debounce search
	const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearResults = useCallback(() => {
		setResults({ users: [], hashtags: [], videos: [] });
		setPage(0);
		setHasMore(false);
		setTotal(0);
		setError(null);
	}, []);

	const performSearch = useCallback(
		async (searchQuery: string, pageNum = 0, shouldAppend = false) => {
			if (!searchQuery.trim() || searchQuery.length < 2) {
				clearResults();
				return;
			}

			setIsSearching(true);
			setError(null);
			try {
				const limit = 20;
				const offset = pageNum * limit;

				switch (searchType) {
					case 'users':
						const resultUsers = await SearchService.searchUsers(
							searchQuery,
							viewerId,
							limit,
							offset,
						);
						if (resultUsers.success && resultUsers.data) {
							setResults((prev) => ({
								...prev,
								users: shouldAppend
									? [...prev.users, ...resultUsers.data!.users]
									: resultUsers.data!.users,
							}));
							setHasMore(resultUsers.data.hasMore);
							setTotal(resultUsers.data.total);
						}
						if (!resultUsers?.success) {
							setError(resultUsers?.error || 'Search failed');
						}
						break;

					case 'hashtags':
						const resultHashtags = await SearchService.searchHashtags(
							searchQuery,
							limit,
						);
						if (resultHashtags.success && resultHashtags.data) {
							setResults((prev) => ({
								...prev,
								hashtags: shouldAppend
									? [...prev.hashtags, ...resultHashtags.data!.hashtags]
									: resultHashtags.data!.hashtags,
							}));
							setHasMore(resultHashtags.data.hasMore);
							setTotal(resultHashtags.data.total);
						}
						if (!resultHashtags?.success) {
							setError(resultHashtags?.error || 'Search failed');
						}
						break;

					case 'videos':
						const resultVideos = await SearchService.searchVideos(
							searchQuery,
							viewerId,
							limit,
							offset,
						);
						if (resultVideos.success && resultVideos.data) {
							setResults((prev) => ({
								...prev,
								videos: shouldAppend
									? [...prev.videos, ...resultVideos.data!.videos]
									: resultVideos.data!.videos,
							}));
							setHasMore(resultVideos.data.hasMore);
							setTotal(resultVideos.data.total);
						}
						if (!resultVideos?.success) {
							setError(resultVideos?.error || 'Search failed');
						}
						break;
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Search failed';
				setError(errorMessage);
				console.error('Search error:', error);
			} finally {
				setIsSearching(false);
			}
		},
		[searchType, viewerId, clearResults],
	);

	const loadSuggestions = useCallback(async (searchQuery: string) => {
		if (!searchQuery.trim() || searchQuery.length < 2) {
			setSuggestions([]);
			return;
		}

		try {
			const result = await SearchService.getSearchSuggestions(searchQuery, 5);
			if (result.success && result.data) {
				setSuggestions(result.data.suggestions);
			}
		} catch (error) {
			console.error('Error loading suggestions:', error);
		}
	}, []);

	const handleSearch = useCallback(
		(searchQuery: string) => {
			setQuery(searchQuery);

			// Clear existing timeout
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}

			if (!searchQuery.trim()) {
				clearResults();
				setSuggestions([]);
				return;
			}

			// Load suggestions immediately for short queries
			if (searchQuery.length >= 1) {
				loadSuggestions(searchQuery);
			}

			// Debounce the actual search
			debounceTimeoutRef.current = setTimeout(() => {
				setPage(0);
				performSearch(searchQuery, 0, false);
			}, 300);
		},
		[performSearch, loadSuggestions, clearResults],
	);

	const handleLoadMore = useCallback(() => {
		if (!isSearching && hasMore && query.trim()) {
			const nextPage = page + 1;
			setPage(nextPage);
			performSearch(query, nextPage, true);
		}
	}, [isSearching, hasMore, query, page, performSearch]);

	const handleRefresh = useCallback(() => {
		if (query.trim()) {
			setPage(0);
			performSearch(query, 0, false);
		}
	}, [query, performSearch]);

	const clearSearch = useCallback(() => {
		setQuery('');
		clearResults();
		setSuggestions([]);
		setError(null);

		if (debounceTimeoutRef.current) {
			clearTimeout(debounceTimeoutRef.current);
		}
	}, [clearResults]);

	// Handle suggestion selection - immediately search and close suggestions
	const handleSuggestionSelect = useCallback(
		(suggestion: string) => {
			// Remove @ or # prefix for search
			const cleanSuggestion = suggestion.replace(/^[@#]/, '');
			setQuery(cleanSuggestion);
			setSuggestions([]); // Close suggestions immediately
			
			// Clear any pending debounced search
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
			
			// Perform immediate search
			setPage(0);
			performSearch(cleanSuggestion, 0, false);
		},
		[performSearch],
	);

	// Update specific user in results (for follow/unfollow updates)
	const updateUserInResults = useCallback(
		(userId: string, updates: Partial<UserProfile>) => {
			setResults((prev) => ({
				...prev,
				users: prev.users.map((user) =>
					user.id === userId ? { ...user, ...updates } : user,
				),
			}));
		},
		[],
	);

	// Remove user from results
	const removeUserFromResults = useCallback((userId: string) => {
		setResults((prev) => ({
			...prev,
			users: prev.users.filter((user) => user.id !== userId),
		}));
	}, []);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
		};
	}, []);

	return {
		// State
		query,
		isSearching,
		results,
		suggestions,
		error,
		hasMore,
		total,
		page,

		// Actions
		handleSearch,
		handleLoadMore,
		handleRefresh,
		clearSearch,
		clearResults,
		updateUserInResults,
		removeUserFromResults,
		handleSuggestionSelect,

		// Computed
		isEmpty:
			!isSearching &&
			query.length >= 2 &&
			((searchType === 'users' && results.users.length === 0) ||
				(searchType === 'hashtags' && results.hashtags.length === 0) ||
				(searchType === 'videos' && results.videos.length === 0)),
		hasQuery: query.length > 0,
		canLoadMore: hasMore && !isSearching,
	};
};
