export type GoalMode = 'three-day' | 'weekdays' | 'count-to' | 'none';

// dayIndex: 0 = Monday … 6 = Sunday (Monday-anchored, matching startOfWeek in date-utils)
// Returns null when mode is 'none' (count-only display).
export function computeGoal(mode: GoalMode, max: number, dayIndex: number): number | null {
	if (mode === 'none') return null;
	const d = Math.max(0, Math.min(6, dayIndex));

	if (mode === 'three-day') return Math.round((d + 0.5) * 3 / 7);
	if (mode === 'weekdays')  return Math.min(d + 1, 5);
	// 'count-to' OLD CODE
	// return Math.round((d + 0.5) * Math.max(1, max) / 7);

	// 'count-to' new code
	return Math.min(d + 1, Math.max(1, max));
}

// Returns how much the goal increases on dayIndex compared to the previous day.
// dayIndex 0 is compared against 0 (start of week), so Monday gets its full expected increment.
export function computeDailyDelta(mode: GoalMode, max: number, dayIndex: number): number {
	if (mode === 'none') return 0;
	const today = computeGoal(mode, max, dayIndex) ?? 0;
	const prev  = dayIndex <= 0 ? 0 : (computeGoal(mode, max, dayIndex - 1) ?? 0);
	return Math.max(0, today - prev);
}
