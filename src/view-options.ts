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
			displayName: 'Label alignment',
			key: 'label-align',
			default: 'right',
			options: { left: 'Left', right: 'Right' },
		},
	];
}
