import { Colors } from '@/constants/Colors';
import React, { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface FormattedTextProps {
	text: string;
	style?: any;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
	text,
	style,
}) => {
	const formatText = (text: string) => {
		const lines = text.split('\n');
		const formattedElements: JSX.Element[] = [];

		lines.forEach((line, lineIndex) => {
			// Check if line is a bullet point
			if (line.trim().startsWith('* ')) {
				const bulletText = line.trim().substring(2); // Remove "* "
				const formattedBulletText = formatInlineText(bulletText);

				formattedElements.push(
					<View key={lineIndex} style={styles.bulletContainer}>
						<Text style={[styles.bulletPoint, style]}>•</Text>
						<View style={styles.bulletTextContainer}>
							<Text style={[styles.bulletText, style]}>
								{formattedBulletText}
							</Text>
						</View>
					</View>,
				);
			} else if (line.trim() === '') {
				// Empty line for spacing
				formattedElements.push(
					<View key={lineIndex} style={styles.lineBreak} />,
				);
			} else {
				// Regular text line
				const formattedLineText = formatInlineText(line);
				formattedElements.push(
					<Text key={lineIndex} style={[styles.regularText, style]}>
						{formattedLineText}
					</Text>,
				);
			}
		});

		return formattedElements;
	};

	const formatInlineText = (text: string): (string | JSX.Element)[] => {
		const parts: (string | JSX.Element)[] = [];
		let currentText = text;
		let partIndex = 0;

		// Process bold text **text**
		const boldRegex = /\*\*(.*?)\*\*/g;
		let lastIndex = 0;
		let match;

		while ((match = boldRegex.exec(currentText)) !== null) {
			// Add text before the bold part
			if (match.index > lastIndex) {
				parts.push(currentText.substring(lastIndex, match.index));
			}

			// Add the bold part
			parts.push(
				<Text key={`bold-${partIndex++}`} style={styles.boldText}>
					{match[1]}
				</Text>,
			);

			lastIndex = match.index + match[0].length;
		}

		// Add remaining text
		if (lastIndex < currentText.length) {
			parts.push(currentText.substring(lastIndex));
		}

		return parts;
	};

	return <View>{formatText(text)}</View>;
};

const styles = StyleSheet.create({
	bulletContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginVertical: 2,
		paddingLeft: 8,
	},
	bulletPoint: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		marginRight: 8,
		marginTop: 1,
	},
	bulletTextContainer: {
		flex: 1,
	},
	bulletText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		lineHeight: 18,
	},
	regularText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		lineHeight: 18,
		marginVertical: 1,
	},
	boldText: {
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
	},
	lineBreak: {
		height: 8,
	},
});
