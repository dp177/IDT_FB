export const IST_TIME_ZONE = 'Asia/Kolkata'
export const DAILY_BASE_FEE = 0

export const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] as const
export const ORDER_STATUSES = ['BOOKED', 'SERVED', 'SKIPPED', 'NO_SHOW', 'DEFAULTED'] as const
export const DIETARY_PREFERENCES = ['JAIN', 'NON_JAIN'] as const
export const PORTION_TYPES = ['HALF', 'FULL'] as const

export type MealType = (typeof MEAL_TYPES)[number]
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number]
export type PortionType = (typeof PORTION_TYPES)[number]

export const CARB_PRICES: Record<string, number> = {
  '1': 5, '2': 10, '3': 15, '4': 20, '5': 25, '6': 30, '7': 35, '8': 40,
  'Plain Rice': 10, 'Jeera Rice': 15, 'No Rice': 0,
}

export const ITEM_PRICES: Record<string, number> = {
  '2-dosa': 40, '4-vada': 35, '3-idli': 30, 'aloo-paratha': 50, 'paneer-paratha': 65,
  'poha': 30, 'pav-bhaji': 55, 'boiled-eggs': 25, 'omelette': 30,
  'sprouts': 20, 'bread-butter': 25, 'bread-jam': 25, 'b-tea': 10, 'b-coffee': 15, 'b-bournvita': 20,
  'red-gravy': 15, 'yellow-gravy': 20, 'paneer': 40, 'soya': 20, 'kofta': 35, 'chhole': 25,
  'aloo-fry': 15, 'matar-aloo': 20, 'mix-veg': 20, 'jeera-aloo': 15, 'bhindi': 25,
  'samosa': 20, 'kachori': 25, 'sandwich': 35, 'patty': 20, 'veg-burger': 45,
  'tea': 10, 'coffee': 15, 'bournvita': 20, 'cold-coffee': 30, 'shikanji': 20, 'milkrose': 25, 'shake': 40
}

export const STATIC_MENU = {
  BREAKFAST: {
    southIndian: ['2 Dosa', '4 Medu Vada', '3 Idli'],
    northIndian: ['Aloo Paratha', 'Paneer Paratha', 'Poha', 'Pav-Bhaji'],
    proteinHealth: ['Boiled Eggs', 'Omelette', 'Sprouts'],
  },
  LUNCH_DINNER: {
    gravyBase: ['Red Gravy', 'Yellow/White Gravy'],
    topup: ['Paneer', 'Soya Chunks', 'Kofta', 'Chhole'],
    dryCurry: ['Aloo Fry', 'Mix Veg'],
    carbs: ['Plain Roti', 'Butter Roti', 'Plain Rice', 'Jeera Rice'],
  },
  SNACKS: {
    hotBite: ['Sandwich', 'Patty', 'Veg Burger', 'Kachori', 'Samosa'],
    beverages: ['Tea', 'Coffee', 'Hot Milk', 'Cold Coffee', 'Shikanji', 'Milkrose', 'Shakes'],
  },
}
