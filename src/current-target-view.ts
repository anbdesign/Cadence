import { BasesEntry, BasesPropertyId, BasesView, BooleanValue, ListValue, MarkdownView, QueryController, getIcon } from 'obsidian';
import CadencePlugin from './main';
import { buildDateColumns, formatDate, getCurrentDate, startOfWeek } from './date-utils';
import { GoalMode, computeGoal } from './goal-scaling';

export const CURRENT_TARGET_VIEW_TYPE = 'cadence-current-target';

export class CurrentTargetView extends BasesView {
	readonly type = CURRENT_TARGET_VIEW_TYPE;

	private readonly containerEl: HTMLElement;
	private readonly plugin: CadencePlugin;

	constructor(
		controller: QueryController,
		parentEl: HTMLElement,
		plugin: CadencePlugin
	) {
		super(controller);
		this.plugin = plugin;
		this.containerEl = parentEl.createDiv({ cls: 'ct-view' });
	}

	public onDataUpdated(): void {
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		const columnsVal = this.config.get('columns');
		const columns = typeof columnsVal === 'number' ? Math.max(1, Math.round(columnsVal)) : 3;
		this.containerEl.style.setProperty('--ct-columns', String(columns));

		const propertyOrder = this.config.getOrder();
		const entryMap = this.buildEntryMap();

		// Prefer the host note's date (embedded case), then today.
		// If the resolved week has no entries at all, fall back to the most
		// recent entry's date so standalone bases with older data still render.
		const hostDate = this.detectHostNoteDate();
		const referenceDate = hostDate ?? this.fallbackDate(entryMap) ?? getCurrentDate();

		const refWeekStart = startOfWeek(referenceDate);
		const dayIndex = Math.min(6, Math.floor((referenceDate.getTime() - refWeekStart.getTime()) / 86400000));
		const weekDates = buildDateColumns('week', referenceDate);

		propertyOrder.forEach((propertyId, i) => {
			const current = this.countTruthy(propertyId, weekDates, entryMap);

			const iconStr = this.readString(`icon-${i}`);
			const modeStr = this.readString(`mode-${i}`) || 'linear';
			const maxVal  = this.config.get(`max-${i}`);
			const max     = typeof maxVal === 'number' ? Math.max(1, Math.round(maxVal)) : 5;

			const goal = computeGoal(modeStr as GoalMode, max, dayIndex);
			this.renderCell(propertyId, iconStr, current, goal);
		});
	}

	private renderCell(
		propertyId: BasesPropertyId,
		iconStr: string,
		current: number,
		goal: number | null
	): void {
		const cell = this.containerEl.createDiv({ cls: 'ct-cell' });

		const iconEl = cell.createSpan({ cls: 'ct-icon' });
		if (iconStr) {
			renderIcon(iconEl, iconStr);
		}

		let countClass = 'ct-count';
		if (goal !== null) {
			countClass += current >= goal ? ' ct-count--ahead' : ' ct-count--behind';
		}

		const label = this.getPropertyLabel(propertyId);
		const countText = goal !== null ? `${current} / ${goal}` : String(current);

		cell.createSpan({
			cls: countClass,
			text: countText,
			attr: { 'aria-label': `${label}: ${countText}` },
		});
	}

	private countTruthy(
		propertyId: BasesPropertyId,
		weekDates: Date[],
		entryMap: Record<string, BasesEntry>
	): number {
		let count = 0;
		for (const date of weekDates) {
			const entry = entryMap[formatDate(date)];
			if (!entry) continue;
			const val = entry.getValue(propertyId);
			if ((val instanceof BooleanValue || val instanceof ListValue) && val.isTruthy()) count++;
		}
		return count;
	}

	private buildEntryMap(): Record<string, BasesEntry> {
		const map: Record<string, BasesEntry> = {};
		for (const group of this.data.groupedData) {
			for (const entry of group.entries) {
				const { basename } = entry.file;
				if (/^\d{4}-\d{2}-\d{2}$/.test(basename)) {
					map[basename] = entry;
				}
			}
		}
		return map;
	}

	private readString(key: string): string {
		const val = this.config.get(key);
		return typeof val === 'string' ? val : '';
	}

	private getPropertyLabel(propertyId: BasesPropertyId): string {
		const dot = propertyId.indexOf('.');
		return dot >= 0 ? propertyId.slice(dot + 1) : propertyId;
	}

	// When embedded inside a YYYY-MM-DD note, return that date (same as CadenceView).
	private detectHostNoteDate(): Date | null {
		const leaves = this.app.workspace.getLeavesOfType('markdown');
		for (const leaf of leaves) {
			const view = leaf.view as MarkdownView;
			if (view.containerEl.contains(this.containerEl) && view.file) {
				const { basename } = view.file;
				const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(basename);
				if (match) {
					return new Date(parseInt(match[1]!), parseInt(match[2]!) - 1, parseInt(match[3]!), 12, 0, 0);
				}
			}
		}
		return null;
	}

	// Find the most recent date key in the entry map. Used as a fallback reference
	// date when the current calendar week has no entries (e.g. a standalone base
	// whose newest note is from a previous week).
	private fallbackDate(entryMap: Record<string, BasesEntry>): Date | null {
		const keys = Object.keys(entryMap);
		if (keys.length === 0) return null;
		const latest = keys.sort().at(-1)!;
		const [y, m, d] = latest.split('-').map(Number);
		return new Date(y!, m! - 1, d, 12, 0, 0);
	}
}

function renderIcon(el: HTMLElement, iconStr: string): void {
	const s = iconStr.trim();
	if (!s) return;
	// Lucide icon names are kebab-case lowercase strings
	if (/^[a-z][a-z0-9-]*$/.test(s)) {
		const svg = getIcon(s);
		if (svg) {
			el.appendChild(svg);
			return;
		}
	}
	el.textContent = s;
}
