
import { Currency, FinanceCategory } from './types';

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', rate: 1 },
  { code: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'MXN', symbol: '$', rate: 17.05 },
  { code: 'COP', symbol: '$', rate: 3950 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
];

export const INITIAL_CATEGORIES: FinanceCategory[] = [
  { id: 'inc-1', parentId: null, name: 'Sueldo Principal', type: 'income', amount: 2500, budget: 2500, color: '#13ec6a', icon: 'payments' },
  { id: 'exp-1', parentId: null, name: 'Vivienda', type: 'expense', amount: 800, budget: 800, color: '#3b82f6', icon: 'home' },
  { id: 'exp-1-1', parentId: 'exp-1', name: 'Alquiler', type: 'expense', amount: 700, budget: 700, color: '#60a5fa', icon: 'vpn_key' },
  { id: 'exp-1-2', parentId: 'exp-1', name: 'Servicios', type: 'expense', amount: 100, budget: 100, color: '#93c5fd', icon: 'bolt' },
  { id: 'exp-2', parentId: null, name: 'Alimentación', type: 'expense', amount: 400, budget: 450, color: '#10b981', icon: 'restaurant' },
];
