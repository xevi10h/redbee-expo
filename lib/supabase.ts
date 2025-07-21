import '../polyfills/structuredClone';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState } from 'react-native';

export const supabase = createClient(
	process.env.EXPO_PUBLIC_SUPABASE_URL!,
	process.env.EXPO_PUBLIC_SUPABASE_KEY!,
	{
		auth: {
			storage: AsyncStorage,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
			lock: processLock,
		},
	},
);

// Auto-refresh session when app becomes active
AppState.addEventListener('change', (state) => {
	if (state === 'active') {
		supabase.auth.startAutoRefresh();
	} else {
		supabase.auth.stopAutoRefresh();
	}
});

// Database types for type safety
export type Database = {
	public: {
		Tables: {
			users: {
				Row: {
					id: string;
					email: string;
					username: string;
					display_name: string | null;
					bio: string | null;
					avatar_url: string | null;
					subscription_price: number;
					subscription_currency: string;
					commission_rate: number;
					followers_count: number;
					subscribers_count: number;
					videos_count: number;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email: string;
					username: string;
					display_name?: string | null;
					bio?: string | null;
					avatar_url?: string | null;
					subscription_price?: number;
					subscription_currency?: string;
					commission_rate?: number;
				};
				Update: {
					username?: string;
					display_name?: string | null;
					bio?: string | null;
					avatar_url?: string | null;
					subscription_price?: number;
					subscription_currency?: string;
					updated_at?: string;
				};
			};
			videos: {
				Row: {
					id: string;
					user_id: string;
					title: string | null;
					description: string | null;
					hashtags: string[] | null;
					video_url: string;
					thumbnail_url: string | null;
					duration: number | null;
					is_premium: boolean;
					likes_count: number;
					comments_count: number;
					views_count: number;
					created_at: string;
				};
				Insert: {
					user_id: string;
					title?: string | null;
					description?: string | null;
					hashtags?: string[] | null;
					video_url: string;
					thumbnail_url?: string | null;
					duration?: number | null;
					is_premium?: boolean;
				};
				Update: {
					title?: string | null;
					description?: string | null;
					hashtags?: string[] | null;
					thumbnail_url?: string | null;
					is_premium?: boolean;
				};
			};
			follows: {
				Row: {
					id: string;
					follower_id: string;
					following_id: string;
					created_at: string;
				};
				Insert: {
					follower_id: string;
					following_id: string;
				};
				Update: never;
			};
			subscriptions: {
				Row: {
					id: string;
					subscriber_id: string;
					creator_id: string;
					stripe_subscription_id: string | null;
					status: string;
					current_period_start: string | null;
					current_period_end: string | null;
					price: number | null;
					currency: string | null;
					created_at: string;
				};
				Insert: {
					subscriber_id: string;
					creator_id: string;
					stripe_subscription_id?: string | null;
					status?: string;
					current_period_start?: string | null;
					current_period_end?: string | null;
					price?: number | null;
					currency?: string | null;
				};
				Update: {
					status?: string;
					current_period_start?: string | null;
					current_period_end?: string | null;
				};
			};
			likes: {
				Row: {
					id: string;
					user_id: string;
					video_id: string;
					created_at: string;
				};
				Insert: {
					user_id: string;
					video_id: string;
				};
				Update: never;
			};
			comments: {
				Row: {
					id: string;
					user_id: string;
					video_id: string;
					text: string;
					created_at: string;
				};
				Insert: {
					user_id: string;
					video_id: string;
					text: string;
				};
				Update: {
					text?: string;
				};
			};
		};
	};
};
