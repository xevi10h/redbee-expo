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

// Updated database types for the new structure
export type Database = {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
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
					username: string;
					display_name?: string | null;
					bio?: string | null;
					avatar_url?: string | null;
					subscription_price?: number;
					subscription_currency?: string;
					commission_rate?: number;
					followers_count?: number;
					subscribers_count?: number;
					videos_count?: number;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					username?: string;
					display_name?: string | null;
					bio?: string | null;
					avatar_url?: string | null;
					subscription_price?: number;
					subscription_currency?: string;
					commission_rate?: number;
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
			app_config: {
				Row: {
					id: string;
					default_commission_rate: number;
					min_video_duration: number;
					max_video_duration: number;
					preview_duration: number;
					supported_currencies: string[];
				};
				Insert: {
					default_commission_rate?: number;
					min_video_duration?: number;
					max_video_duration?: number;
					preview_duration?: number;
					supported_currencies?: string[];
				};
				Update: {
					default_commission_rate?: number;
					min_video_duration?: number;
					max_video_duration?: number;
					preview_duration?: number;
					supported_currencies?: string[];
				};
			};
		};
		Views: {
			users_with_email: {
				Row: {
					id: string;
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
					email: string;
					email_confirmed_at: string | null;
					auth_created_at: string;
					auth_updated_at: string;
				};
			};
		};
		Functions: {
			check_username_availability: {
				Args: { username_to_check: string };
				Returns: boolean;
			};
			check_username_availability_for_update: {
				Args: { username_to_check: string; user_id: string };
				Returns: boolean;
			};
		};
	};
};
