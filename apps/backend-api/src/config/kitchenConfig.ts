export const KITCHEN_PRIORITY_MAP: Record<string, string> = {
  WALK_IN: 'high',
  TAKEAWAY: 'medium-high',
  DINE_IN: 'medium',
  DELIVERY: 'low',
  PICKUP: 'medium-high',
};

export const KITCHEN_STATION_MAP: Record<string, string> = {
  'Pizza': 'pizza',
  'Pasta': 'pizza',
  'Drinks': 'bar',
  'Beverages': 'bar',
  'Appetizers': 'cold',
  'Salads': 'cold',
  'Desserts': 'cold',
  'Grill': 'grill',
  'BBQ': 'grill',
  'Main Course': 'grill',
};

export const DEFAULT_KITCHEN_STATION = 'grill';
export const DEFAULT_KITCHEN_PRIORITY = 'medium';
