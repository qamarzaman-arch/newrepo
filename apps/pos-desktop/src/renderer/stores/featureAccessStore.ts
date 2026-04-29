import { create } from 'zustand';
import { featureAccessService } from '../services/featureAccessService';

interface FeatureAccessItem {
  feature: string;
  enabled: boolean;
}

interface FeatureAccessState {
  features: FeatureAccessItem[];
  role: string | null;
  isLoading: boolean;
  loadFeatureAccess: (role: string) => Promise<void>;
  hasAccess: (feature: string) => boolean;
  clear: () => void;
}

export const useFeatureAccessStore = create<FeatureAccessState>((set, get) => ({
  features: [],
  role: null,
  isLoading: false,

  loadFeatureAccess: async (role: string) => {
    // Set role immediately so ADMIN bypass and loading-state defaults work
    // even before the API responds.
    set({ role, isLoading: true });
    try {
      const response = await featureAccessService.getMyFeatureAccess();
      set({
        features: response.data.features,
        role: response.data.role || role,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load feature access:', error);
      // Keep role set so ADMIN still gets full access; non-admins fall back
      // to permissive defaults below.
      set({ isLoading: false });
    }
  },

  hasAccess: (feature: string) => {
    const { features, role, isLoading } = get();
    // Admin always has access
    if (role === 'ADMIN') return true;

    const featureItem = features.find(f => f.feature === feature);
    if (featureItem) return featureItem.enabled;

    // Feature record not found in DB. While loading, optimistically allow
    // (otherwise the sidebar collapses to empty before data arrives).
    // Once loading is done, deny by default.
    return isLoading;
  },

  clear: () => {
    set({
      features: [],
      role: null,
      isLoading: false,
    });
  },
}));
