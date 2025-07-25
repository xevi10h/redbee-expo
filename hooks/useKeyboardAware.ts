import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

export const useKeyboardAware = () => {
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

	useEffect(() => {
		const keyboardWillShow = (event: KeyboardEvent) => {
			setKeyboardHeight(event.endCoordinates.height);
			setIsKeyboardVisible(true);
		};

		const keyboardWillHide = () => {
			setKeyboardHeight(0);
			setIsKeyboardVisible(false);
		};

		const showSubscription = Keyboard.addListener('keyboardDidShow', keyboardWillShow);
		const hideSubscription = Keyboard.addListener('keyboardDidHide', keyboardWillHide);

		return () => {
			showSubscription?.remove();
			hideSubscription?.remove();
		};
	}, []);

	return {
		keyboardHeight,
		isKeyboardVisible,
	};
};