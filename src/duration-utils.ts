export type DurationFormat = 'auto' | 'HH:MM:SS' | 'HH:MM' | 'MM:SS';

export function parseDuration(str: string, format: DurationFormat): number | null {
	const s = str.trim();
	if (!s) return null;

	const parts = s.split(':');

	let resolved: 'HH:MM:SS' | 'HH:MM' | 'MM:SS';
	if (format === 'auto') {
		resolved = parts.length >= 3 ? 'HH:MM:SS' : 'HH:MM';
	} else {
		resolved = format;
	}

	if (resolved === 'HH:MM:SS') {
		if (parts.length < 3) return null;
		const h = parseInt(parts[0]!, 10);
		const m = parseInt(parts[1]!, 10);
		const sec = parseFloat(parts[2]!);
		if (isNaN(h) || isNaN(m) || isNaN(sec)) return null;
		return h * 3600 + m * 60 + sec;
	}

	if (resolved === 'HH:MM') {
		if (parts.length < 2) return null;
		const h = parseInt(parts[0]!, 10);
		const m = parseInt(parts[1]!, 10);
		if (isNaN(h) || isNaN(m)) return null;
		return h * 3600 + m * 60;
	}

	// MM:SS
	if (parts.length < 2) return null;
	const min = parseInt(parts[0]!, 10);
	const sec = parseFloat(parts[1]!);
	if (isNaN(min) || isNaN(sec)) return null;
	return min * 60 + sec;
}

export function formatDuration(totalSeconds: number): string {
	const s = Math.round(totalSeconds);
	const hours = Math.floor(s / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	const seconds = s % 60;

	if (hours > 0) {
		return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
	}
	if (minutes > 0) {
		return seconds > 0 ? `${minutes} min ${seconds} sec` : `${minutes} min`;
	}
	return `${seconds} sec`;
}
