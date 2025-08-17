import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Image,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormattedText } from '@/components/ui/FormattedText';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { geminiService } from '@/services/geminiService';

interface Message {
	id: string;
	type: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

interface SuggestedQuestion {
	id: string;
	text: string;
	category: string;
}

export default function AIAssistantScreen() {
	const { user } = useRequireAuth();
	const { t } = useTranslation();

	const [messages, setMessages] = useState<Message[]>([
		{
			id: '1',
			type: 'assistant',
			content: t('assistant.welcomeMessage'),
			timestamp: new Date(),
		},
	]);
	const [inputText, setInputText] = useState('');
	const [isTyping, setIsTyping] = useState(false);
	const flatListRef = useRef<FlatList>(null);

	// Suggested questions for the AI assistant
	const suggestedQuestions: SuggestedQuestion[] = [
		{
			id: '1',
			text: t('assistant.questions.increaseViews'),
			category: 'growth',
		},
		{
			id: '2',
			text: t('assistant.questions.bestTime'),
			category: 'timing',
		},
		{
			id: '3',
			text: t('assistant.questions.viralContent'),
			category: 'content',
		},
		{
			id: '4',
			text: t('assistant.questions.improveEngagement'),
			category: 'engagement',
		},
	];

	const handleSendMessage = useCallback(
		async (messageText?: string) => {
			// Capture current inputText value immediately
			const currentInputText = inputText;
			const textToSend = messageText || currentInputText.trim();

			if (!textToSend) return;

			// Check rate limit before proceeding
			try {
				const remainingRequests = await geminiService.getRemainingRequests(user?.id || '');
				if (remainingRequests <= 0) {
					const errorMessage: Message = {
						id: Date.now().toString(),
						type: 'assistant',
						content: 'Has superado el límite de tu quota de RedBee AI (5 consultas cada 2 horas). Podrás volver a usar RedBee AI más tarde.',
						timestamp: new Date(),
					};
					setMessages((prev) => [...prev, errorMessage]);
					return;
				}
			} catch (error) {
				console.error('Error checking rate limit:', error);
			}

			const userMessage: Message = {
				id: Date.now().toString(),
				type: 'user',
				content: textToSend,
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, userMessage]);
			setInputText('');
			setIsTyping(true);

			try {
				// Get response from secure Gemini service
				const response = await geminiService.generateResponse(
					textToSend,
					user?.id || '',
				);

				// Create assistant message with the complete response
				const assistantMessage: Message = {
					id: (Date.now() + 1).toString(),
					type: 'assistant',
					content: response,
					timestamp: new Date(),
				};

				setMessages((prev) => [...prev, assistantMessage]);
				setIsTyping(false);
			} catch (error) {
				console.error('Error with Gemini response:', error);

				// Show user-friendly error message from the service
				const errorMessage: Message = {
					id: (Date.now() + 2).toString(),
					type: 'assistant',
					content:
						error instanceof Error
							? error.message
							: '🚀 Disculpa, hay un problema temporal con la conexión. Te recomiendo intentar de nuevo en unos momentos.',
					timestamp: new Date(),
				};

				setMessages((prev) => [...prev, errorMessage]);
				setIsTyping(false);
			}
		},
		[inputText, user?.id],
	);

	const handleSendPress = useCallback(() => {
		handleSendMessage();
	}, [handleSendMessage]);

	const renderMessage = ({ item }: { item: Message }) => (
		<View
			style={[
				styles.messageContainer,
				item.type === 'user' ? styles.userMessage : styles.assistantMessage,
			]}
		>
			{item.type === 'assistant' && (
				<View style={styles.avatarContainer}>
					<LinearGradient
						colors={Colors.gradientPrimary}
						style={styles.assistantAvatar}
					>
						<Image
							source={require('../../assets/images/adaptative-icon.png')}
							style={{
								width: 16,
								height: 16,
								tintColor: Colors.text,
							}}
							resizeMode="contain"
						/>
					</LinearGradient>
				</View>
			)}
			<View
				style={[
					styles.messageBubble,
					item.type === 'user' ? styles.userBubble : styles.assistantBubble,
				]}
			>
				{item.type === 'assistant' ? (
					<FormattedText
						text={item.content}
						style={[styles.messageText, styles.assistantText]}
					/>
				) : (
					<Text style={[styles.messageText, styles.userText]}>
						{item.content}
					</Text>
				)}
			</View>
		</View>
	);

	const renderSuggestedQuestion = ({ item }: { item: SuggestedQuestion }) => (
		<TouchableOpacity
			style={styles.suggestedQuestionCard}
			onPress={() => handleSendMessage(item.text)}
		>
			<Text style={styles.suggestedQuestionText}>{item.text}</Text>
			<Feather name="send" size={16} color={Colors.primary} />
		</TouchableOpacity>
	);

	useEffect(() => {
		flatListRef.current?.scrollToEnd({ animated: true });
	}, [messages]);

	if (!user) {
		return null;
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<LinearGradient
					colors={Colors.gradientPrimary}
					style={styles.headerGradient}
				>
					<View style={styles.headerContent}>
						<View style={styles.headerLeft}>
							<View style={styles.aiIcon}>
								<Image
									source={require('../../assets/images/adaptative-icon.png')}
									style={{
										width: 24,
										height: 24,
										tintColor: Colors.text,
									}}
									resizeMode="contain"
								/>
							</View>
							<View>
								<Text style={styles.headerTitle}>{t('assistant.title')}</Text>
								<Text style={styles.headerSubtitle}>
									{t('assistant.subtitle')}
								</Text>
							</View>
						</View>
						<TouchableOpacity
							style={styles.headerButton}
							onPress={() => {
								Alert.alert(
									t('assistant.clearConfirmTitle'),
									t('assistant.clearConfirmMessage'),
									[
										{ text: t('common.cancel'), style: 'cancel' },
										{
											text: t('assistant.clearConfirmButton'),
											onPress: () => {
												setMessages([
													{
														id: '1',
														type: 'assistant',
														content: t('assistant.welcomeMessage'),
														timestamp: new Date(),
													},
												]);
											},
										},
									],
								);
							}}
						>
							<Feather name="plus-square" size={20} color={Colors.text} />
						</TouchableOpacity>
					</View>
				</LinearGradient>
			</View>

			{/* Premium Feature Teaser */}
			<View style={styles.premiumTeaser}>
				<LinearGradient
					colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 165, 0, 0.05)']}
					style={styles.premiumTeaserGradient}
				>
					<View style={styles.premiumTeaserContent}>
						<View style={styles.premiumTeaserIcon}>
							<Text style={styles.premiumTeaserEmoji}>✨</Text>
						</View>
						<View style={styles.premiumTeaserTextContainer}>
							<Text style={styles.premiumTeaserTitle}>
								Próximamente: RedBee AI Pro
							</Text>
							<Text style={styles.premiumTeaserSubtitle}>
								Asistente personalizado con acceso a tus analytics y contenido
							</Text>
						</View>
						<View style={styles.premiumTeaserBadge}>
							<Text style={styles.premiumTeaserBadgeText}>PRÓXIMAMENTE</Text>
						</View>
					</View>
				</LinearGradient>
			</View>

			<View style={styles.content}>
				{/* Suggested Questions */}
				{messages.length === 1 && (
					<View style={styles.suggestedQuestionsContainer}>
						<Text style={styles.suggestedQuestionsTitle}>
							{t('assistant.suggestedQuestionsTitle')}
						</Text>
						<FlatList
							data={suggestedQuestions}
							renderItem={renderSuggestedQuestion}
							keyExtractor={(item) => item.id}
							numColumns={2}
							scrollEnabled={false}
							columnWrapperStyle={styles.suggestedQuestionsRow}
							ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
						/>
					</View>
				)}

				{/* Chat Messages */}
				<FlatList
					ref={flatListRef}
					data={messages}
					renderItem={renderMessage}
					keyExtractor={(item) => item.id}
					style={styles.messagesList}
					contentContainerStyle={styles.messagesContent}
					showsVerticalScrollIndicator={false}
				/>

				{isTyping && (
					<View style={styles.typingIndicator}>
						<View style={styles.avatarContainer}>
							<LinearGradient
								colors={Colors.gradientPrimary}
								style={styles.assistantAvatar}
							>
								<Image
									source={require('../../assets/images/adaptative-icon.png')}
									style={{
										width: 16,
										height: 16,
										tintColor: Colors.text,
									}}
									resizeMode="contain"
								/>
							</LinearGradient>
						</View>
						<View style={styles.typingBubble}>
							<ActivityIndicator size="small" color={Colors.primary} />
							<Text style={styles.typingText}>{t('assistant.typing')}</Text>
						</View>
					</View>
				)}
			</View>

			{/* Input Section */}
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.inputSection}
			>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.textInput}
						placeholder={t('assistant.placeholder')}
						placeholderTextColor={Colors.textTertiary}
						value={inputText}
						onChangeText={setInputText}
						multiline
						maxLength={500}
					/>
					<TouchableOpacity
						style={[
							styles.sendButton,
							inputText.trim()
								? styles.sendButtonActive
								: styles.sendButtonInactive,
						]}
						onPress={handleSendPress}
						disabled={!inputText.trim() || isTyping}
					>
						<Feather
							name="send"
							size={20}
							color={inputText.trim() ? Colors.text : Colors.textTertiary}
						/>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		backgroundColor: Colors.background,
	},
	headerGradient: {
		paddingHorizontal: 20,
		paddingVertical: 16,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	aiIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		color: Colors.text,
	},
	headerSubtitle: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
	},
	headerButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
	},
	suggestedQuestionsContainer: {
		paddingVertical: 20,
	},
	suggestedQuestionsTitle: {
		fontSize: 16,
		fontFamily: 'Raleway-SemiBold',
		color: Colors.text,
		marginBottom: 16,
	},
	suggestedQuestionsRow: {
		justifyContent: 'space-between',
		gap: 12,
	},
	suggestedQuestionCard: {
		flex: 1,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	suggestedQuestionText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
		flex: 1,
	},
	messagesList: {
		flex: 1,
	},
	messagesContent: {
		padding: 16,
		flexGrow: 1,
	},
	messageContainer: {
		marginBottom: 16,
	},
	userMessage: {
		alignItems: 'flex-end',
	},
	assistantMessage: {
		alignItems: 'flex-start',
		flexDirection: 'row',
		gap: 8,
	},
	avatarContainer: {
		marginTop: 4,
	},
	assistantAvatar: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	messageBubble: {
		maxWidth: '80%',
		padding: 12,
		borderRadius: 16,
	},
	userBubble: {
		backgroundColor: Colors.primary,
	},
	assistantBubble: {
		backgroundColor: Colors.background,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	messageText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		lineHeight: 18,
	},
	userText: {
		color: Colors.text,
	},
	assistantText: {
		color: Colors.text,
	},
	typingIndicator: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	typingBubble: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: Colors.background,
		padding: 12,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	typingText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	inputSection: {
		backgroundColor: Colors.background,
		borderTopWidth: 1,
		borderTopColor: Colors.borderSecondary,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		padding: 16,
		gap: 12,
	},
	textInput: {
		flex: 1,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		maxHeight: 100,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	sendButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sendButtonActive: {
		backgroundColor: Colors.primary,
	},
	sendButtonInactive: {
		backgroundColor: Colors.backgroundSecondary,
	},
	premiumTeaser: {
		marginHorizontal: 16,
		marginVertical: 6,
		borderRadius: 10,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: 'rgba(255, 215, 0, 0.2)',
	},
	premiumTeaserGradient: {
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	premiumTeaserContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	premiumTeaserIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(255, 215, 0, 0.2)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	premiumTeaserEmoji: {
		fontSize: 12,
	},
	premiumTeaserTextContainer: {
		flex: 1,
	},
	premiumTeaserTitle: {
		fontSize: 12,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
		marginBottom: 1,
	},
	premiumTeaserSubtitle: {
		fontSize: 10,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		lineHeight: 12,
	},
	premiumTeaserBadge: {
		backgroundColor: 'rgba(255, 215, 0, 0.2)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	premiumTeaserBadgeText: {
		fontSize: 8,
		fontFamily: 'Inter-Bold',
		color: '#D4AF37',
		letterSpacing: 0.3,
	},
});
