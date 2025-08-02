export type Language =
	| 'es_ES'
	| 'ca_ES'
	| 'fr_FR'
	| 'it_IT'
	| 'en_US'
	| 'ja_JP'
	| 'zh_CN'
	| 'pt_PT'
	| 'th_TH'
	| 'id_ID'
	| 'ms_MY';

export type User = {
	id: string;
	email: string;
	username: string;
	display_name?: string;
	bio?: string;
	avatar_url?: string;
	subscription_price: number;
	subscription_currency: string;
	commission_rate: number;
	followers_count: number;
	subscribers_count: number;
	videos_count: number;
	created_at: string;
	updated_at: string;
	// Client-side only fields
	access_token?: string;
	language: Language;
};

export type Video = {
	id: string;
	user_id: string;
	user?: Pick<
		User,
		'id' | 'username' | 'display_name' | 'avatar_url' | 'subscription_price'
	>;
	title?: string;
	description?: string;
	hashtags?: string[];
	video_url: string;
	thumbnail_url?: string;
	duration?: number;
	is_premium: boolean;
	likes_count: number;
	comments_count: number;
	views_count: number;
	created_at: string;
	// Client-side state
	is_liked?: boolean;
	is_following?: boolean;
	is_subscribed?: boolean;
};

export type Follow = {
	id: string;
	follower_id: string;
	following_id: string;
	created_at: string;
};

export type Subscription = {
	id: string;
	subscriber_id: string;
	creator_id: string;
	stripe_subscription_id?: string;
	status: 'active' | 'canceled' | 'past_due' | 'incomplete';
	current_period_start?: string;
	current_period_end?: string;
	price?: number;
	currency?: string;
	created_at: string;
};

export type Like = {
	id: string;
	user_id: string;
	video_id: string;
	created_at: string;
};

// ✅ TIPO ACTUALIZADO CON LIKES
export type Comment = {
	id: string;
	user_id: string;
	video_id: string;
	user?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
	text: string;
	is_pinned?: boolean;
	reply_to?: string;
	replies_count?: number;
	likes_count: number; // ✅ Nueva propiedad obligatoria
	created_at: string;
	updated_at?: string;
	// Client-side state
	is_liked?: boolean; // ✅ Nueva propiedad para estado del cliente
};

// ✅ NUEVO TIPO PARA LIKES DE COMENTARIOS
export type CommentLike = {
	id: string;
	user_id: string;
	comment_id: string;
	created_at: string;
};

export type Report = {
	id: string;
	video_id?: string;
	comment_id?: string;
	reporter_id: string;
	reported_user_id: string;
	reason: string;
	description?: string;
	status: 'pending' | 'resolved' | 'dismissed';
	created_at: string;
	resolved_at?: string;
	resolved_by?: string;
};

export type Notification = {
	id: string;
	user_id: string;
	type:
		| 'like'
		| 'comment'
		| 'follow'
		| 'subscription'
		| 'milestone'
		| 'strike'
		| 'report_resolved'
		| 'comment_like'; // ✅ Nuevo tipo de notificación
	title: string;
	message: string;
	data?: {
		video_id?: string;
		user_id?: string;
		comment_id?: string;
		subscription_id?: string;
		milestone_type?: string;
		milestone_value?: number;
	};
	is_read: boolean;
	created_at: string;
};

export type AuthProvider = 'email' | 'google' | 'apple';

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterCredentials {
	email: string;
	username: string;
	display_name: string;
	password: string;
}

export interface AuthResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface UserProfile {
	id: string;
	email: string;
	username: string;
	display_name?: string;
	bio?: string;
	avatar_url?: string;
	subscription_price: number;
	subscription_currency: string;
	followers_count: number;
	subscribers_count: number;
	videos_count: number;
	created_at: string;
	is_following?: boolean;
	is_subscribed?: boolean;
}

// Upload types
export interface VideoUploadProgress {
	progress: number;
	isUploading: boolean;
	isCompleted: boolean;
	error?: string;
}

// App configuration
export interface AppConfig {
	default_commission_rate: number;
	min_video_duration: number;
	max_video_duration: number;
	preview_duration: number;
	supported_currencies: string[];
}

// Utility types for forms
export interface FormErrors {
	[key: string]: string | undefined;
}

export interface ValidationRule {
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	custom?: (value: any) => string | undefined;
}

export interface FormField {
	value: string;
	error?: string;
	touched: boolean;
}

// Search and filter types
export interface SearchFilters {
	query?: string;
	hashtags?: string[];
	user_id?: string;
	is_premium?: boolean;
	sort_by?: 'created_at' | 'likes_count' | 'views_count';
	sort_order?: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

// Pagination
export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	per_page: number;
	has_more: boolean;
}

export type FeedType = 'forYou' | 'following';

export interface AppConfiguration {
	default_commission_rate: number;
	min_video_duration: number;
	max_video_duration: number;
	preview_duration: number;
	supported_currencies: string[];
	max_file_size: number;
	supported_video_formats: string[];
}

export interface CommentLikeResult {
	liked: boolean;
	likes_count: number;
}

export interface CommentLikeData {
	comment_id: string;
	user_id: string;
	liked: boolean;
	likes_count: number;
	created_at?: string;
}

export interface CommentInteractionStates {
	isLiking: boolean;
	isReporting: boolean;
	isDeleting: boolean;
	isEditing: boolean;
}

export interface CommentEngagementMetrics {
	total_likes: number;
	total_replies: number;
	engagement_rate: number;
	top_liked_comments: Comment[];
}

export interface CommentFilters {
	video_id?: string;
	user_id?: string;
	reply_to?: string;
	has_likes?: boolean;
	min_likes?: number;
	sort_by?: 'created_at' | 'likes_count' | 'replies_count';
	sort_order?: 'asc' | 'desc';
}

export interface CommentWithLikesResponse {
	comment: Comment;
	user_liked: boolean;
	likes_count: number;
	recent_likers: Pick<User, 'id' | 'username' | 'avatar_url'>[];
}
