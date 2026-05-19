import type { ViewOption } from 'obsidian';

export function getHeatmapViewOptions(): ViewOption[] {
	return [
		{
			type: 'dropdown',
			displayName: 'Timescale',
			key: 'timescale',
			default: 'week',
			// Record<string, string>: key = stored value, value = display label
			options: { week: 'Week', month: 'Month' },
		},
		{
			type: 'dropdown',
			displayName: 'Size',
			key: 'size',
			default: 'small',
			options: { small: 'Small', medium: 'Medium', large: 'Large' },
		},
	];
}
