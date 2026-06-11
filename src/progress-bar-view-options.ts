import type { BasesViewConfig, ViewOption } from 'obsidian';
import type CadencePlugin from './main';

export function getProgressBarViewOptions(plugin: CadencePlugin): ViewOption[] {
	const options: ViewOption[] = [
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
				none:   'None',
				'15':   'Every 15 min',
				'30':   'Every 30 min',
				'60':   'Every 1 hr',
				'120':  'Every 2 hr',
			},
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

	const order = plugin.progressBarConfig?.getOrder() ?? [];

	for (let i = 0; i < order.length; i++) {
		const index = i;
		const propId = order[index] ?? '';
		const label = propId.slice(propId.indexOf('.') + 1);

		options.push({
			type: 'group',
			displayName: label,
			items: [
				{
					type: 'dropdown',
					displayName: 'Label',
					key: `label-mode-${index}`,
					default: 'property-name',
					options: {
						'property-name': 'Property name',
						'first-letter':  'First letter',
						'text':          'Text',
						'lucide':        'Lucide icon',
					},
				},
				{
					type: 'text',
					displayName: 'Label value',
					key: `label-${index}`,
					placeholder: '★',
					shouldHide: (config: BasesViewConfig) => {
						const mode = config.get(`label-mode-${index}`);
						return mode !== 'text' && mode !== 'lucide';
					},
				},
			],
		});
	}

	return options;
}
