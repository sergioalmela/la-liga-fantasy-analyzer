import { Player } from '@/entities/player';

export class PlayerAnalyticsService {
    static calculateSummaryStats(players: Player[]) {
        const totalValue = players.reduce((sum, player) => sum + player.marketValue, 0);
        const totalPoints = players.reduce((sum, player) => sum + player.points, 0);
        const averagePoints = players.length > 0 ? totalPoints / players.length : 0;

        return {
            totalPlayers: players.length,
            totalValue,
            totalPoints,
            averagePoints
        };
    }

    static getPlayersOnSale(players: Player[]): Player[] {
        return players.filter(p => p.saleInfo);
    }

    static getPlayersWithLowBuyout(players: Player[]): Player[] {
        return players.filter(player => {
            if (!player.buyoutClause) return false;
            
            const isBuyoutLowComparedToValue = player.buyoutClause < player.marketValue * 1.2;
            const isProtectionExpiringSoon = this.isProtectionExpiringSoon(player);
            
            return isBuyoutLowComparedToValue && isProtectionExpiringSoon;
        });
    }

    private static isProtectionExpiringSoon(player: Player): boolean {
        if (!player.buyoutClauseLockedEndTime) return true;
        
        const protectionEndTime = new Date(player.buyoutClauseLockedEndTime).getTime();
        const currentTime = new Date().getTime();
        const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
        
        return (protectionEndTime - currentTime) <= twoDaysInMs;
    }

    static getPlayersWithExpiringProtection(players: Player[]): Player[] {
        return players.filter(p => {
            if (!p.buyoutClauseLockedEndTime) return false;
            const protectionEnd = new Date(p.buyoutClauseLockedEndTime);
            const hoursLeft = (protectionEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60);

            return hoursLeft > 0 && hoursLeft <= 48;
        });
    }
}
