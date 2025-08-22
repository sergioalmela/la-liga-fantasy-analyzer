import { Player } from '@/entities/player';

export type PlayerSortField = 
    | 'name' 
    | 'marketValue' 
    | 'points' 
    | 'averagePoints' 
    | 'position'
    | 'buyoutClause'
    | 'salePrice';

export type SortOrder = 'asc' | 'desc';

export class PlayerSortingUtils {
    static sort(players: Player[], sortBy: PlayerSortField, order: SortOrder = 'desc'): Player[] {
        const sortedPlayers = [...players];
        
        return sortedPlayers.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'name':
                    comparison = (a.nickname || a.name).localeCompare(b.nickname || b.name);
                    break;
                    
                case 'marketValue':
                    comparison = a.marketValue - b.marketValue;
                    break;
                    
                case 'points':
                    comparison = a.points - b.points;
                    break;
                    
                case 'averagePoints':
                    comparison = a.averagePoints - b.averagePoints;
                    break;
                    
                case 'position':
                    comparison = a.positionId - b.positionId;
                    break;
                    
                case 'buyoutClause':
                    const aBuyout = a.buyoutClause || 0;
                    const bBuyout = b.buyoutClause || 0;
                    comparison = aBuyout - bBuyout;
                    break;
                    
                case 'salePrice':
                    const aSalePrice = a.saleInfo?.salePrice || 0;
                    const bSalePrice = b.saleInfo?.salePrice || 0;
                    comparison = aSalePrice - bSalePrice;
                    break;
                    
                default:
                    return 0;
            }
            
            return order === 'asc' ? comparison : -comparison;
        });
    }
    
    static sortByMultipleCriteria(
        players: Player[], 
        criteria: Array<{ field: PlayerSortField; order: SortOrder }>
    ): Player[] {
        const sortedPlayers = [...players];
        
        return sortedPlayers.sort((a, b) => {
            for (const criterion of criteria) {
                const comparison = this.comparePlayersByField(a, b, criterion.field);
                if (comparison !== 0) {
                    return criterion.order === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }
    
    private static comparePlayersByField(a: Player, b: Player, field: PlayerSortField): number {
        switch (field) {
            case 'name':
                return (a.nickname || a.name).localeCompare(b.nickname || b.name);
            case 'marketValue':
                return a.marketValue - b.marketValue;
            case 'points':
                return a.points - b.points;
            case 'averagePoints':
                return a.averagePoints - b.averagePoints;
            case 'position':
                return a.positionId - b.positionId;
            case 'buyoutClause':
                return (a.buyoutClause || 0) - (b.buyoutClause || 0);
            case 'salePrice':
                return (a.saleInfo?.salePrice || 0) - (b.saleInfo?.salePrice || 0);
            default:
                return 0;
        }
    }
}