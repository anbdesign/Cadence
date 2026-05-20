import type { BasesViewConfig, ViewOption } from 'obsidian';
import type CadencePlugin from './main';

const MAX_PROPS = 9;

const GOAL_MODE_OPTIONS: Record<string, string> = {
	none:           'None (count only)',
	linear:         'Linear daily',
	'three-day':    '3× per week',
	'front-loaded': 'Front-loaded',
	'weekend-heavy': 'Weekend-heavy',
	even:           'Even spacing',
	consistency:    'Consistency',
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
					type: 'text',
					displayName: 'Icon',
					key: `icon-${i}`,
					placeholder: '★',
				},
				{
					type: 'dropdown',
					displayName: 'Goal mode',
					key: `mode-${i}`,
					default: 'linear',
					options: GOAL_MODE_OPTIONS,
				},
				{
					type: 'slider',
					displayName: 'Weekly goal',
					key: `max-${i}`,
					default: 5,
					min: 1,
					max: 14,
					step: 1,
				},
			],
		});
	}

	return options;
}
