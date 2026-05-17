export type HeatmapTimescale = 'week' | 'month';

export function buildDateColumns(timescale: string): Date[] {
	if (timescale === 'month') {
		return buildCurrentMonthColumns();
	}

	return buildCurrentWeekColumns();
}

export function buildCurrentWeekColumns(): Date[] {
	const today = new Date();
	const start = startOfWeek(today);

	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(start);
		date.setDate(start.getDate() + index);
		return date;
	});
}

export function buildCurrentMonthColumns(): Date[] {
	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth();

	const columns: Date[] = [];
	const cursor = new Date(year, month, 1);

	while (cursor.getMonth() === month) {
		columns.push(new Date(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}

	return columns;
}

// Monday-anchored week
export function startOfWeek(date: Date): Date {
	const result = new Date(date);
	const day = result.getDay();
	const diff = day === 0 ? -6 : 1 - day;

	result.setDate(result.getDate() + diff);
	result.setHours(0, 0, 0, 0);

	return result;
}

export function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}
