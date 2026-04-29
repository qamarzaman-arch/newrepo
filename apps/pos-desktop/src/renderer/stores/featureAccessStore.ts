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
    set({ isLoading: true });
    try {
      console.log('Loading feature access for role:', role);
      const response = await featureAccessService.getMyFeatureAccess();
      console.log('Feature access loaded:', response.data);
      set({
        features: response.data.features,
        role: response.data.role,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load feature access:', error);
      set({ isLoading: false });
    }
  },

  hasAccess: (feature: string) => {
    const { features, role } = get();
    // Admin always has access
    if (role === 'ADMIN') return true;
    
    const featureItem = features.find(f => f.feature === feature);
    return featureItem?.enabled ?? false; // Default to denied if not found
  },

  clear: () => {
    set({
      features: [],
      role: null,
      isLoading: false,
    });
  },
}));
