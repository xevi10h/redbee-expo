import { create } from 'zustand';

interface UploadState {
	isSelecting: boolean;
	isUploading: boolean;
	isEditing: boolean;
	setSelecting: (selecting: boolean) => void;
	setUploading: (uploading: boolean) => void;
	setEditing: (editing: boolean) => void;
	isAnyProcessActive: () => boolean;
}

export const useUploadState = create<UploadState>((set, get) => ({
	isSelecting: false,
	isUploading: false,
	isEditing: false,
	setSelecting: (selecting) => set({ isSelecting: selecting }),
	setUploading: (uploading) => set({ isUploading: uploading }),
	setEditing: (editing) => set({ isEditing: editing }),
	isAnyProcessActive: () => {
		const state = get();
		return state.isSelecting || state.isUploading || state.isEditing;
	},
}));