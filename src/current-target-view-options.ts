import type { BasesViewConfig, ViewOption } from 'obsidian';
import type CadencePlugin from './main';

const MAX_PROPS = 9;

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
	];

	for (let i = 0; i < MAX_PROPS; i++) {
		const index = i;
		const order = plugin.currentTargetConfig?.getOrder() ?? [];
		const propId = order[index];
		const label = propId
			? propId.slice(propId.indexOf('.') + 1)
			: `Property ${index + 1}`;

		options.push({
			type: 'group',
			displayName: label,
			shouldHide: (config: BasesViewConfig) => config.getOrder().length <= index,
			items: [
				{
					type: 'dropdown',
					displayName: 'Icon',
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
					displayName: 'Icon value',
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
				},
				{
					type: 'slider',
					displayName: 'Target count',
					key: `goal-max-${i}`,
					default: 5,
					min: 1,
					max: 7,
					step: 1,
					shouldHide: (config: BasesViewConfig) => config.get(`goal-${i}`) !== 'count-to',
				},
			],
		});
	}

	return options;
}
