import type { BasesViewConfig, ViewOption } from 'obsidian';

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

export function getCurrentTargetViewOptions(): ViewOption[] {
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
		options.push({
			type: 'group',
			displayName: `Property ${i + 1}`,
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
