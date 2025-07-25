import { useCallback, useRef } from 'react';

export interface OptimisticUpdate<T> {
	id: string;
	optimisticData: Partial<T>;
	revertData: Partial<T>;
}

export const useOptimisticUpdates = <T extends { id: string }>(
	items: T[],
	setItems: (updater: (prev: T[]) => T[]) => void
) => {
	const pendingUpdates = useRef<Map<string, OptimisticUpdate<T>>>(new Map());

	const applyOptimisticUpdate = useCallback((
		itemId: string,
		optimisticData: Partial<T>,
		apiCall: () => Promise<Partial<T> | void>
	) => {
		// Find current item to store revert data
		const currentItem = items.find(item => item.id === itemId);
		if (!currentItem) return;

		const revertData: Partial<T> = {};
		Object.keys(optimisticData).forEach(key => {
			revertData[key as keyof T] = currentItem[key as keyof T];
		});

		// Store update info
		pendingUpdates.current.set(itemId, {
			id: itemId,
			optimisticData,
			revertData,
		});

		// Apply optimistic update
		setItems(prev => prev.map(item => 
			item.id === itemId ? { ...item, ...optimisticData } : item
		));

		// Execute API call
		apiCall()
			.then((result) => {
				// Apply real result if different from optimistic
				if (result) {
					setItems(prev => prev.map(item => 
						item.id === itemId ? { ...item, ...result } : item
					));
				}
			})
			.catch((error) => {
				console.error('Optimistic update failed:', error);
				// Revert optimistic update
				const update = pendingUpdates.current.get(itemId);
				if (update) {
					setItems(prev => prev.map(item => 
						item.id === itemId ? { ...item, ...update.revertData } : item
					));
				}
			})
			.finally(() => {
				pendingUpdates.current.delete(itemId);
			});
	}, [items, setItems]);

	return {
		applyOptimisticUpdate,
		hasPendingUpdate: (itemId: string) => pendingUpdates.current.has(itemId),
	};
};
