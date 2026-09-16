
import MasterySVG from './MasterySVG';
import { MASTERY_LABELS_VI, MASTERY_COLORS } from '../../lib/srs/srsTypes';

interface MasteryIconProps {
  level: number | 'unlearned';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

const svgSizeMap = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export default function MasteryIcon({
  level,
  size = 'md',
  showLabel = false,
}: MasteryIconProps) {
  const safeLevel = level === 'unlearned' ? 'unlearned' : Math.max(0, Math.min(7, Math.floor(level as number)));
  const label = safeLevel === 'unlearned' ? 'Chưa học' : MASTERY_LABELS_VI[safeLevel as number];
  const color = safeLevel === 'unlearned' ? 'text-slate-400' : MASTERY_COLORS[safeLevel as number];

  return (
    <span className="inline-flex items-center justify-center gap-1.5" title={`Level ${safeLevel}: ${label}`}>
      <MasterySVG level={safeLevel} className={`${svgSizeMap[size]} shrink-0`} />
      {showLabel && (
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
      )}
    </span>
  );
}
