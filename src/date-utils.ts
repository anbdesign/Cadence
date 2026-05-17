declare global {
	interface Window {
		__cadenceDevDate?: Date;
	}
}

export type HeatmapTimescale = 'week' | 'month';

export function getCurrentDate(): Date {
	if (typeof window !== 'undefined' && window.__cadenceDevDate) {
		return new Date(window.__cadenceDevDate);
	}
	return new Date();
}

export function buildDateColumns(timescale: string, referenceDate?: Date | null): Date[] {
	const anchor = referenceDate ?? getCurrentDate();

	if (timescale === 'month') {
		return buildMonthColumns(anchor);
	}

	return buildWeekColumns(anchor);
}

export function buildCurrentWeekColumns(): Date[] {
	return buildWeekColumns(getCurrentDate());
}

function buildWeekColumns(anchor: Date): Date[] {
	const start = startOfWeek(anchor);

	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(start);
		date.setDate(start.getDate() + index);
		return date;
	});
}

export function buildCurrentMonthColumns(): Date[] {
	return buildMonthColumns(getCurrentDate());
}

function buildMonthColumns(anchor: Date): Date[] {
	const year = anchor.getFullYear();
	const month = anchor.getMonth();

	const columns: Date[] = [];
	const cursor = new Date(year, month, 1, 12, 0, 0);

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
