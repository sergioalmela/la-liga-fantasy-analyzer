import { formatDistanceToNow } from 'date-fns';
import { type Player, type MarketPlayer } from '@/types/api';

export const positionNames = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
  5: 'CH'
} as const;

export type PositionId = keyof typeof positionNames;

export interface BuyoutStatus {
  status: 'protected' | 'unprotected' | 'expired' | 'expiring';
  message: string;
  color: string;
}

export interface SaleStatus {
  status: 'active' | 'expired';
  message: string;
  color: string;
}

export function getBuyoutClauseStatus(player: Player): BuyoutStatus | null {
  if (!player.buyoutClause) return null;
  
  if (!player.buyoutClauseLockedEndTime) {
    return { status: 'unprotected', message: 'No protection', color: 'text-red-600' };
  }
  
  const protectionEnd = new Date(player.buyoutClauseLockedEndTime);
  const now = new Date();
  
  if (protectionEnd <= now) {
    return { status: 'expired', message: 'Protection expired', color: 'text-red-600' };
  }
  
  const hoursLeft = Math.ceil((protectionEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
  
  if (hoursLeft <= 24) {
    return { status: 'expiring', message: `${hoursLeft}h left`, color: 'text-orange-600' };
  }
  
  const daysLeft = Math.ceil(hoursLeft / 24);
  return { status: 'protected', message: `${daysLeft}d left`, color: 'text-green-600' };
}

export function getSaleStatus(player: Player): SaleStatus | null {
  if (!player.saleInfo) return null;
  
  const expirationDate = new Date(player.saleInfo.expirationDate);
  const now = new Date();
  
  if (expirationDate <= now) {
    return { status: 'expired', message: 'Sale expired', color: 'text-red-600' };
  }
  
  const timeLeft = formatDistanceToNow(expirationDate, { addSuffix: true });
  return { status: 'active', message: `Expires ${timeLeft}`, color: 'text-blue-600' };
}

export function getMarketSaleStatus(player: MarketPlayer): SaleStatus {
  const expirationDate = new Date(player.expirationDate);
  const now = new Date();
  
  if (expirationDate <= now) {
    return { status: 'expired', message: 'Expired', color: 'text-red-600' };
  }
  
  const hoursLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  
  if (hoursLeft <= 24) {
    const timeLeft = formatDistanceToNow(expirationDate, { addSuffix: true });
    return { status: 'active', message: `Ends ${timeLeft}`, color: 'text-orange-600' };
  }
  
  const timeLeft = formatDistanceToNow(expirationDate, { addSuffix: true });
  return { status: 'active', message: `Ends ${timeLeft}`, color: 'text-green-600' };
}

export function getPositionName(positionId: number): string {
  return positionNames[positionId as PositionId] || 'Unknown';
}

export function calculatePriceDifference(salePrice: number, marketValue: number) {
  const difference = salePrice - marketValue;
  const percentDiff = ((difference / marketValue) * 100).toFixed(1);
  const isGoodDeal = difference < 0;
  
  return {
    difference,
    percentDiff,
    isGoodDeal
  };
}