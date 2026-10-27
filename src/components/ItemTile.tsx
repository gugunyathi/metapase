import { DealCategory } from '../types/metapase';
import { CATEGORY_STYLE } from './DealCard';

export default function ItemTile({ category, size = 'md' }: { category: DealCategory; size?: 'sm' | 'md' }) {
  const style = CATEGORY_STYLE[category];
  const Icon = style.icon;
  const box = size === 'sm' ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl';
  return (
    <span className={`grid shrink-0 place-items-center bg-gradient-to-br ${style.tile} ${box}`}>
      <Icon className={size === 'sm' ? 'h-4 w-4 text-white' : 'h-5 w-5 text-white'} />
    </span>
  );
}
