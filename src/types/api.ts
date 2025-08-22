export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface League {
  id: string;
  access: string;
  type: {
    id: string;
    canBeDuplicated: boolean;
    assets: {
      logo_list_item: string;
      logo_white: string;
    };
    sponsor: {
      id: number;
      name: string;
    };
    prizeInformation: {
      title: string;
      description: string;
    };
  };
  managersNumber: number;
  name: string;
  config: {
    features: {
      buyoutClause: boolean;
    };
    premiumFeatures: {
      formations: boolean;
      captain: boolean;
      bench: boolean;
      loan: boolean;
      ideal: boolean;
      coach: boolean;
    };
    premiumConfigurations: {
      loan: {
        duration: number;
        maxLoans: number;
        enableConclude: boolean;
        minPercentage: number;
      };
      ideal: {
        reward: number;
      };
    };
  };
  isDuplicated: boolean;
  isSecondRound: boolean;
  token: string;
  description: string;
  premium: boolean;
  team: {
    id: number;
    money: number;
    teamPoints: number;
    playersNumber: number;
    teamValue: number;
    canPunctuate: boolean;
    position: number | null;
    isAdmin: boolean;
  };
}

export interface Manager {
  id: string;
  managerName: string;
  avatar: string;
}

export interface PlayerImages {
  big: Record<string, string>;
  beat: Record<string, string>;
  transparent: Record<string, string>;
}

export interface PlayerMaster {
  id: string;
  name: string;
  nickname?: string;
  slug: string;
  positionId: number;
  playerStatus: string;
  lastSeasonPoints: number | null;
  images: PlayerImages;
  team: TeamInfo;
  lastStats: any[];
  averagePoints: number;
  points: number;
  marketValue: number;
}

export interface PlayerMarket {
  id: string;
  salePrice: number;
  expirationDate: string;
  numberOfOffers: number;
  directOffer: boolean;
}

export interface TeamPlayer {
  buyoutClause: number;
  manager: Manager;
  playerTeamId: string;
  buyoutClauseLockedEndTime: string;
  playerMaster: PlayerMaster;
  playerMarket?: PlayerMarket;
}

export interface Team {
  players: TeamPlayer[];
  loanedPlayers: any[];
  teamMoney: number;
  playersNumber: number;
  id: string;
  manager: Manager;
  startingWeek: string;
  banned: boolean;
  teamValue: number;
  teamPoints: number;
}

export interface Player {
  id: string;
  nickname?: string;
  name: string;
  positionId: number;
  team: {
    id: string;
    name: string;
  };
  marketValue: number;
  playerStatus: string;
  points: number;
  averagePoints: number;
  buyoutClause?: number;
  buyoutClauseLockedEndTime?: string;
  saleInfo?: {
    salePrice: number;
    expirationDate: string;
    numberOfOffers: number;
  };
}

export enum MarketPlayerType {
  LEAGUE = 'marketPlayerLeague',
  TEAM = 'marketPlayerTeam'
}

export interface MarketPlayer {
  id: string;
  discr: MarketPlayerType;
  playerMaster: {
    id: string;
    nickname?: string;
    name: string;
    positionId: number;
    team: {
      id: string;
      name: string;
    };
    marketValue: number;
    playerStatus: string;
    points: number;
    averagePoints: number;
  };
  salePrice: number;
  expirationDate: string;
  numberOfBids: number;
}

export interface MarketValuePoint {
  lfpId: number;
  marketValue: number;
  date: string;
  bids: number;
}

export interface TrendAnalysis {
  trend: 'rising' | 'falling' | 'stable' | 'insufficient_data' | 'unknown';
  change: number;
  changePercent: number;
  analysis: string;
  latestValue?: number;
  oldestValue?: number;
  dataPoints: number;
}

export interface PlayerAnalysis {
  id: string;
  name: string;
  isMyPlayer: boolean;
  playerType?: 'market' | 'other-manager';
  currentValue: number;
  currentValueFormatted: string;
  position: string;
  team: string;
  trends: {
    last5Days: TrendAnalysis;
    last10Days: TrendAnalysis;
  };
  alerts: string[];
  saleExpirationHours: number | null;
  buyoutProtectionHours: number | null;
  buyoutClause?: number;
  worthItScore?: number;
  saleInfo?: {
    salePrice: number;
    expirationDate: string;
    numberOfOffers: number;
  };
}

export interface MarketHistoryEntry {
  player: {
    id: string;
    name: string;
    nickname: string;
    positionId: number;
    images: {
      transparent: {
        [size: string]: string;
      };
    };
    team: {
      id: string;
      name: string;
      shortName: string;
      badgeColor: string;
    };
  };
  date: string;
  operation: string;
  money: number;
}

export interface MarketValueHistory {
  lfpId: number;
  marketValue: number;
  date: string;
  bids: number;
}

export interface UserRegion {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDivision {
  id: number;
  name: string;
  shortName: string;
  upgradePoints: number;
  images: {
    medium: string;
    small: string;
  };
}

export interface UserInfo {
  id: string;
  managerName: string;
  avatar: string;
  banned: boolean;
  region: UserRegion;
  division: UserDivision;
}

export interface TeamMoney {
  teamMoney: number;
  teamInvestment: number;
}

export interface TeamLineUp {
  formation: {
    goalkeeper: PlayerPosition[];
    defender: PlayerPosition[];
    midfielder: PlayerPosition[];
    forward: PlayerPosition[];
  };
}

export interface PlayerPosition {
  playerMaster: PlayerMaster;
  playerMarket?: {
    id: string;
    salePrice: number;
    expirationDate: string;
  };
  buyoutClause: number;
  playerTeamId: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  badgeColor: string;
  badgeGray: string;
  badgeWhite: string;
  mainName?: string;
}

export interface LeagueRankingTeam {
  managerWarned: boolean;
  id: string;
  manager: {
    id: string;
    managerName: string;
    avatar: string;
  };
  banned: boolean;
  teamValue: number;
  teamPoints: number;
  teamMoney: number | null;
  isAdmin: boolean;
}

export interface LeagueRanking {
  position: number;
  previousPosition: number;
  points: number;
  livePoints?: number;
  team: LeagueRankingTeam;
}

export interface Match {
  id: number;
  date: string;
  local: {
    id: number;
    badgeColor: string;
    mainName: string;
    players: any[];
  };
  visitor: {
    id: number;
    badgeColor: string;
    mainName: string;
    players: any[];
  };
  matchState: number;
  localScore: number | null;
  visitorScore: number | null;
}

export interface MarketEvolutionPlayer {
  id: number;
  teamId: number;
  name: string;
  nickname: string;
  playerStatus: string;
  images: {
    transparent: {
      "256x256": string;
    };
  };
  positionId: number;
  playerValue: number;
  createdAt: string;
  updatedAt: string;
  previousMarketValue: number;
  evolution: number;
  team: TeamInfo;
}

export interface MarketEvolution {
  rises: MarketEvolutionPlayer[];
  falls?: MarketEvolutionPlayer[];
}

export interface UserLeague {
  id: string;
  access: string;
  type: {
    id: string;
    canBeDuplicated: boolean;
    assets: any;
    sponsor: any;
    prizeInformation: any;
  };
  managersNumber: number;
  name: string;
  config: {
    features: any;
    premiumFeatures: any;
    premiumConfigurations: any;
  };
  isDuplicated: boolean;
  isSecondRound: boolean;
  token: string;
  description: string;
  premium: boolean;
  team: {
    id: number;
    money: number;
    teamPoints: number;
    playersNumber: number;
    teamValue: number;
    canPunctuate: boolean;
    position: number | null;
    isAdmin: boolean;
  };
}

export interface TeamLineupByWeek {
  formation: {
    id: string;
    name: string;
    positions: Array<{
      id: string;
      positionId: number;
      playerId: string | null;
      player?: {
        id: string;
        name: string;
        points: number;
      };
    }>;
  };
  points: number;
  initialPoints: number;
  teamSnapshotTookOn: string;
}