import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';

// hooks/useHapticFeedback.ts - Standardized haptic feedback

export type VideoQuality = 'low' | 'medium' | 'high';
export type ConnectionType = 'wifi' | 'cellular' | 'unknown';

export const useNetworkOptimization = () => {
	const [connectionType, setConnectionType] = useState<ConnectionType>('unknown');
	const [isConnected, setIsConnected] = useState(true);
	const [connectionStrength, setConnectionStrength] = useState<'poor' | 'good' | 'excellent'>('good');

	// Monitor network state
	useEffect(() => {
		const unsubscribe = NetInfo.addEventListener(state => {
			setIsConnected(state.isConnected ?? false);
			
			if (state.type === 'wifi') {
				setConnectionType('wifi');
				setConnectionStrength('excellent');
			} else if (state.type === 'cellular') {
				setConnectionType('cellular');
				// Estimate strength based on cellular generation
				if (state.details?.cellularGeneration === '4g' || state.details?.cellularGeneration === '5g') {
					setConnectionStrength('good');
				} else {
					setConnectionStrength('poor');
				}
			} else {
				setConnectionType('unknown');
				setConnectionStrength('poor');
			}
		});

		return unsubscribe;
	}, []);

	// Get optimal video quality based on connection
	const getOptimalQuality = useCallback((): VideoQuality => {
		if (!isConnected) return 'low';
		
		if (connectionType === 'wifi') {
			return 'high';
		} else if (connectionType === 'cellular') {
			switch (connectionStrength) {
				case 'excellent':
					return 'high';
				case 'good':
					return 'medium';
				case 'poor':
					return 'low';
				default:
					return 'medium';
			}
		}
		
		return 'medium';
	}, [isConnected, connectionType, connectionStrength]);

	// Check if we should preload videos
	const shouldPreloadVideos = useCallback((): boolean => {
		return isConnected && (connectionType === 'wifi' || connectionStrength === 'excellent');
	}, [isConnected, connectionType, connectionStrength]);

	// Check if we should auto-play videos
	const shouldAutoPlay = useCallback((): boolean => {
		return isConnected;
	}, [isConnected]);

	return {
		connectionType,
		isConnected,
		connectionStrength,
		getOptimalQuality,
		shouldPreloadVideos,
		shouldAutoPlay,
	};
};
