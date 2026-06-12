import type { BasesViewConfig, ViewOption } from 'obsidian';

export function getProgressBarViewOptions(): ViewOption[] {
	return [
		{
			type: 'dropdown',
			displayName: 'Duration format',
			key: 'duration-format',
			default: 'auto',
			options: {
				auto:       'Auto-detect',
				'HH:MM:SS': 'HH:MM:SS',
				'HH:MM':    'HH:MM',
				'MM:SS':    'MM:SS',
			},
		},
		{
			type: 'text',
			displayName: 'Max duration',
			key: 'max-duration',
			placeholder: 'e.g. 8:00 or 1:30:00 (blank = auto)',
		},
		{
			type: 'dropdown',
			displayName: 'Guide lines',
			key: 'guide-interval',
			default: 'none',
			options: {
				none:  'None',
				'15':  'Every 15 min',
				'30':  'Every 30 min',
				'60':  'Every 1 hr',
				'120': 'Every 2 hr',
			},
		},
		{
			type: 'dropdown',
			displayName: 'Guide prominence',
			key: 'guide-prominence',
			default: 'medium',
			options: {
				subtle: 'Subtle',
				medium: 'Medium',
				strong: 'Strong',
			},
			shouldHide: (config: BasesViewConfig) => config.get('guide-interval') === 'none',
		},
		{
			type: 'toggle',
			displayName: 'Show label',
			key: 'show-label',
			default: true,
		},
		{
			type: 'dropdown',
			displayName: 'Bar height',
			key: 'bar-height',
			default: 'medium',
			options: {
				thin:   'Thin',
				medium: 'Medium',
				thick:  'Thick',
			},
		},
	];
}
