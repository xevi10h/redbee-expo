import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';

export function useDeepLinks() {
	useEffect(() => {
		// Handle initial URL when app is opened from a deep link
		const handleInitialURL = async () => {
			const initialUrl = await Linking.getInitialURL();
			if (initialUrl) {
				handleDeepLink(initialUrl);
			}
		};

		// Handle URL when app is already open
		const handleUrlChange = (event: { url: string }) => {
			handleDeepLink(event.url);
		};

		const subscription = Linking.addEventListener('url', handleUrlChange);
		handleInitialURL();

		return () => {
			subscription?.remove();
		};
	}, []);

	const handleDeepLink = (url: string) => {
		try {
			console.log('Deep link received:', url);

			// Parse the URL to extract components
			const urlObj = new URL(url);
			
			// Handle custom scheme (redbeeapp://)
			if (urlObj.protocol === 'redbeeapp:') {
				handleCustomScheme(url);
				return;
			}
			
			// Handle universal links (https://redbeeapp.com/...)
			if (urlObj.hostname === 'redbeeapp.com') {
				handleUniversalLink(urlObj);
				return;
			}

		} catch (error) {
			console.error('Error handling deep link:', error);
		}
	};

	const handleCustomScheme = (url: string) => {
		// Handle custom scheme deep links like redbeeapp://auth/confirm-email
		const path = url.replace('redbeeapp://', '');
		
		if (path.startsWith('auth/')) {
			router.push(`/${path}` as any);
		} else {
			router.push(`/${path}` as any);
		}
	};

	const handleUniversalLink = (urlObj: URL) => {
		const pathname = urlObj.pathname;
		const searchParams = urlObj.searchParams;

		console.log('Universal link pathname:', pathname);

		// Handle different URL patterns
		if (pathname.startsWith('/profile/')) {
			const userId = pathname.replace('/profile/', '');
			router.push(`/user/${userId}` as any);
		} else if (pathname.startsWith('/video/')) {
			const videoId = pathname.replace('/video/', '');
			router.push(`/video/${videoId}` as any);
		} else if (pathname.startsWith('/hashtag/')) {
			const hashtag = pathname.replace('/hashtag/', '').replace('#', '');
			router.push(`/hashtag/${hashtag}` as any);
		} else if (pathname === '/') {
			// Home page
			router.push('/' as any);
		} else if (pathname.startsWith('/auth/')) {
			// Auth related pages
			const authPath = pathname.replace('/auth/', '');
			
			if (authPath === 'confirm-email') {
				// Handle email confirmation with query params
				const token = searchParams.get('token_hash');
				const type = searchParams.get('type');
				if (token && type) {
					router.push(`/auth/confirm-email?token_hash=${token}&type=${type}` as any);
				} else {
					router.push('/auth/confirm-email' as any);
				}
			} else if (authPath === 'confirm-password') {
				// Handle password reset with query params
				const token = searchParams.get('token_hash');
				const type = searchParams.get('type');
				if (token && type) {
					router.push(`/auth/confirm-password?token_hash=${token}&type=${type}` as any);
				} else {
					router.push('/auth/confirm-password' as any);
				}
			} else {
				router.push(`/auth/${authPath}` as any);
			}
		} else {
			// Default fallback - go to home
			console.log('Unknown deep link path, redirecting to home:', pathname);
			router.push('/' as any);
		}
	};
}