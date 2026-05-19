import { Plugin } from 'obsidian';

import { CadenceView } from './view';
import { getHeatmapViewOptions } from './view-options';
import { CurrentTargetView, CURRENT_TARGET_VIEW_TYPE } from './current-target-view';
import { getCurrentTargetViewOptions } from './current-target-view-options';

export const CADENCE_VIEW_TYPE = 'cadence';

export default class CadencePlugin extends Plugin {
	async onload() {
		const registered = this.registerBasesView(CADENCE_VIEW_TYPE, {
			name: 'Cadence',
			icon: 'lucide-calendar-days',
			factory: (controller, containerEl) => {
				return new CadenceView(controller, containerEl, this);
			},
			options: getHeatmapViewOptions,
		});

		if (!registered) {
			console.warn('Bases not enabled — Cadence view unavailable');
		}

		this.registerBasesView(CURRENT_TARGET_VIEW_TYPE, {
			name: 'Current / target',
			icon: 'lucide-target',
			factory: (controller, containerEl) => {
				return new CurrentTargetView(controller, containerEl, this);
			},
			options: getCurrentTargetViewOptions,
		});
	}
}
