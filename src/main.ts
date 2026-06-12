import { BasesViewConfig, Plugin } from 'obsidian';

import { CadenceView } from './view';
import { getHeatmapViewOptions } from './view-options';
import { CurrentTargetView, CURRENT_TARGET_VIEW_TYPE } from './current-target-view';
import { getCurrentTargetViewOptions } from './current-target-view-options';
import { ProgressBarView, PROGRESS_BAR_VIEW_TYPE } from './progress-bar-view';
import { getProgressBarViewOptions } from './progress-bar-view-options';

export const CADENCE_VIEW_TYPE = 'cadence';

export default class CadencePlugin extends Plugin {
	currentTargetConfig: BasesViewConfig | null = null;

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
			options: () => getCurrentTargetViewOptions(this),
		});

		this.registerBasesView(PROGRESS_BAR_VIEW_TYPE, {
			name: 'Progress bar',
			icon: 'lucide-bar-chart-horizontal',
			factory: (controller, containerEl) => new ProgressBarView(controller, containerEl),
			options: getProgressBarViewOptions,
		});
	}
}
