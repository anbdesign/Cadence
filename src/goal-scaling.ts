export type GoalMode = 'linear' | 'three-day' | 'front-loaded' | 'weekend-heavy' | 'even' | 'consistency' | 'none';

// dayIndex: 0 = Monday … 6 = Sunday (Monday-anchored, matching startOfWeek in date-utils)
// Returns null when mode is 'none' (count-only display).
export function computeGoal(mode: GoalMode, max: number, dayIndex: number): number | null {
	if (mode === 'none') return null;
	const d = Math.max(0, Math.min(6, dayIndex));
	const m = Math.max(1, max);

	if (mode === 'linear' || mode === 'consistency') return Math.min(d + 1, m);
	if (mode === 'three-day')     return Math.round((d + 0.5) * m / 7);
	if (mode === 'front-loaded')  return Math.min((d + 1) * Math.ceil(m / 3), m);
	if (mode === 'weekend-heavy') return d < 3 ? 0 : Math.min(Math.ceil((d - 2) * m / 4), m);
	// 'even'
	return Math.round((d + 1) * m / 7);
}
