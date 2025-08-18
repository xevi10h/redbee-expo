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
	has_premium_content: boolean; // Nueva propiedad para indicar si ofrece contenido premium
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
	is_hidden?: boolean;
	hidden_at?: string;
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

// Report type moved to analytics section with enhanced fields

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

// VIDEO ANALYTICS TYPES
export interface VideoView {
	id: string;
	video_id: string;
	viewer_id?: string; // null para vistas anónimas
	viewer_country?: string;
	viewer_city?: string;
	viewer_ip_hash?: string;
	device_type?: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'web';
	browser?: string;
	platform?: 'ios' | 'android' | 'web';
	referrer_source?: string;
	watch_duration_seconds: number;
	video_duration_at_view?: number;
	completion_percentage: number;
	is_premium_viewer: boolean;
	is_follower: boolean;
	session_id?: string;
	created_at: string;
	viewed_at: string;
}

export interface VideoShare {
	id: string;
	video_id: string;
	sharer_id?: string;
	platform: string; // 'whatsapp', 'telegram', 'twitter', 'copy_link', etc.
	sharer_country?: string;
	created_at: string;
}

export interface VideoDailyMetrics {
	id: string;
	video_id: string;
	date: string;
	views_count: number;
	unique_views_count: number;
	likes_count: number;
	comments_count: number;
	shares_count: number;
	reports_count: number;
	avg_watch_duration: number;
	avg_completion_percentage: number;
	premium_views_count: number;
	follower_views_count: number;
	top_countries: CountryMetric[];
	created_at: string;
	updated_at: string;
}

export interface VideoHourlyMetrics {
	id: string;
	video_id: string;
	date: string;
	hour: number;
	views_count: number;
	unique_views_count: number;
	created_at: string;
	updated_at: string;
}

export interface CountryMetric {
	country: string;
	count: number;
}

export interface VideoAnalyticsSummary {
	total_views: number;
	unique_views: number;
	total_likes: number;
	total_comments: number;
	total_shares: number;
	total_reports: number;
	avg_watch_duration: number;
	avg_completion_rate: number;
	premium_viewer_percentage: number;
	follower_percentage: number;
	top_countries: CountryMetric[];
}

export interface VideoHourlyData {
	hour: number;
	views: number;
	unique_views: number;
}

export interface VideoAnalyticsData {
	summary: VideoAnalyticsSummary;
	hourly_views: VideoHourlyData[];
	daily_metrics: VideoDailyMetrics[];
	recent_likes: VideoAnalyticsInteraction[];
	recent_comments: VideoAnalyticsInteraction[];
	recent_shares: VideoShare[];
	reports_by_reason: ReportsByReason[];
}

export interface VideoAnalyticsInteraction {
	id: string;
	user: User;
	created_at: string;
	text?: string; // Para comentarios
	country?: string;
}

export interface ReportsByReason {
	reason: string;
	count: number;
	percentage: number;
}

// UPDATED Report type con campos adicionales para analíticas
export interface Report {
	id: string;
	video_id?: string;
	comment_id?: string;
	reporter_id?: string;
	reported_user_id: string;
	reason: 'inappropriate' | 'spam' | 'harassment' | 'copyright' | 'violence' | 'adult_content' | 'hate_speech' | 'misinformation' | 'other';
	description?: string;
	reporter_country?: string;
	status: 'pending' | 'resolved' | 'dismissed';
	automated_action?: string;
	created_at: string;
	resolved_at?: string;
	resolved_by?: string;
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

// AUDIENCE ANALYTICS TYPES
export interface AudienceMetricsSummary {
	total_videos: number;
	total_views: number;
	unique_viewers: number;
	total_likes: number;
	total_comments: number;
	total_shares: number;
	total_reports: number;
	avg_watch_duration: number;
	avg_completion_rate: number;
	premium_viewer_percentage: number;
	follower_percentage: number;
	audience_retention_rate: number;
	top_performing_videos: {
		id: string;
		title: string;
		views: number;
		likes: number;
	}[];
	period_growth: {
		views_growth: number;
		likes_growth: number;
		followers_growth: number;
	};
}

export interface AudienceEngagementTrends {
	date: string;
	views: number;
	likes: number;
	comments: number;
	shares: number;
	engagement_rate: number;
}

export interface AudienceGeographicData {
	country: string;
	views: number;
	percentage: number;
	cities_count: number;
}

export interface AudienceHourlyPattern {
	hour: number;
	views: number;
	unique_views: number;
	percentage: number;
}

export interface AudienceVideoPerformance {
	video_id: string;
	title: string;
	views: number;
	likes: number;
	comments: number;
	shares: number;
	avg_watch_duration: number;
	completion_rate: number;
	engagement_rate: number;
	created_at: string;
}

export interface AudienceAnalyticsData {
	summary: AudienceMetricsSummary;
	engagement_trends: AudienceEngagementTrends[];
	geographic_data: AudienceGeographicData[];
	hourly_patterns: AudienceHourlyPattern[];
	video_performance: AudienceVideoPerformance[];
}

export interface AuthResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}

// ✅ Agregar ApiResponse como alias de AuthResponse
export type ApiResponse<T = any> = AuthResponse<T>;