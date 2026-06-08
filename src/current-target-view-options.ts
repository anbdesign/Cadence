import type { BasesViewConfig, ViewOption } from 'obsidian';
import type CadencePlugin from './main';

const GOAL_OPTIONS: Record<string, string> = {
	'three-day': '3× per week',
	weekdays:    'Weekdays',
	'count-to':  'Count to…',
	none:        'No goal',
};

export function getCurrentTargetViewOptions(plugin: CadencePlugin): ViewOption[] {
	const options: ViewOption[] = [
		{
			type: 'slider',
			displayName: 'Columns',
			key: 'columns',
			default: 3,
			min: 1,
			max: 6,
			step: 1,
		},
		{
			type: 'dropdown',
			displayName: 'Identifier style',
			key: 'icon-style',
			default: 'normal',
			options: {
				normal: 'Normal',
				subtle: 'Subtle',
			},
		},
		{
			type: 'dropdown',
			displayName: 'Progress style',
			key: 'progress-style',
			default: 'dots',
			options: {
				dots: 'Dots',
				ring: 'Ring',
			},
		},
		{
			type: 'dropdown',
			displayName: 'Trend timescale',
			key: 'timescale',
			default: 'week',
			options: {
				week: 'Week',
				month: 'Month',
			},
		},
	];

	const order = plugin.currentTargetConfig?.getOrder() ?? [];

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
					displayName: 'Type',
					key: `prop-type-${index}`,
					default: 'boolean',
					options: {
						boolean: 'Boolean / list',
						number:  'Number',
					},
				},
				{
					type: 'dropdown',
					displayName: 'Identifier',
					key: `icon-mode-${index}`,
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
					displayName: 'Identifier value',
					key: `icon-${index}`,
					placeholder: '★',
					shouldHide: (config: BasesViewConfig) => {
						const mode = config.get(`icon-mode-${index}`);
						return mode !== 'text' && mode !== 'lucide';
					},
				},
				{
					type: 'dropdown',
					displayName: 'Goal',
					key: `goal-${i}`,
					default: 'three-day',
					options: GOAL_OPTIONS,
					shouldHide: (config: BasesViewConfig) => config.get(`prop-type-${i}`) === 'number',
				},
				{
					type: 'slider',
					displayName: 'Target count',
					key: `goal-max-${i}`,
					default: 5,
					min: 1,
					max: 14,
					step: 1,
					shouldHide: (config: BasesViewConfig) => config.get(`goal-${i}`) !== 'count-to' || config.get(`prop-type-${i}`) === 'number',
				},
				...(index < order.length - 1
					? [{
						type: 'toggle' as const,
						displayName: 'Merge with next property',
						key: `merge-next-${index}`,
						default: false,
						shouldHide: (config: BasesViewConfig) => config.get(`prop-type-${index}`) === 'number',
					}]
					: []),
			],
		});
	}

	return options;
}
