export interface VideoFilters {
	feed_type?: 'forYou' | 'following';
	user_id?: string;
	is_premium?: boolean;
	hashtags?: string[];
	search_query?: string;
	page?: number;
	limit?: number;
}

export interface SubscriptionPlan {
	price: number;
	currency: string;
	interval: 'month' | 'year';
	creator_id: string;
}

export interface ReportData {
	video_id?: string;
	comment_id?: string;
	user_id?: string;
	reporter_id: string;
	reason: string;
	description?: string;
}

export interface NotificationData {
	id: string;
	user_id: string;
	type: 'like' | 'comment' | 'follow' | 'subscription' | 'milestone' | 'strike';
	title: string;
	message: string;
	data?: Record<string, any>;
	is_read: boolean;
	created_at: string;
}