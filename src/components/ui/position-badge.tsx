import { type Player, getPlayerPositionMetadata } from '@/entities/player';

interface PositionBadgeProps {
  player: Player;
  variant?: 'default' | 'compact' | 'emoji-only';
}

const POSITION_STYLES = {
  1: { // Goalkeeper
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200'
  },
  2: { // Defender
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200'
  },
  3: { // Midfielder
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200'
  },
  4: { // Forward
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200'
  },
  5: { // Coach
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200'
  }
}

export function PositionBadge({ player, variant = 'default' }: PositionBadgeProps) {
  const metadata = getPlayerPositionMetadata(player);
  const styling = POSITION_STYLES[player.positionId as keyof typeof POSITION_STYLES] || {
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200'
  };
  
  if (variant === 'emoji-only') {
    return (
      <span className="text-lg" title={metadata.label}>
        {metadata.emoji}
      </span>
    );
  }
  
  if (variant === 'compact') {
    return (
      <span 
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styling.bgColor} ${styling.textColor} ${styling.borderColor}`}
      >
        <span className="mr-1">{metadata.emoji}</span>
        {metadata.label}
      </span>
    );
  }
  
  // Default variant
  return (
    <span 
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${styling.bgColor} ${styling.textColor} ${styling.borderColor}`}
    >
      <span className="mr-2">{metadata.emoji}</span>
      {metadata.label}
    </span>
  );
}