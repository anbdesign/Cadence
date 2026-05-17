import { BasesEntry, BasesPropertyId, BasesView, BooleanValue, QueryController } from 'obsidian';

import CadencePlugin, { CADENCE_VIEW_TYPE } from './main';
import { buildDateColumns, formatDate } from './date-utils';

type DotState = 'filled' | 'empty' | 'missing';

export class CadenceView extends BasesView {
	readonly type = CADENCE_VIEW_TYPE;

	private readonly containerEl: HTMLElement;
	private readonly plugin: CadencePlugin;

	constructor(
		controller: QueryController,
		parentEl: HTMLElement,
		plugin: CadencePlugin
	) {
		super(controller);

		this.plugin = plugin;
		this.containerEl = parentEl.createDiv({ cls: 'cadence-view' });
	}

	public onDataUpdated(): void {
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		const timescale = String(this.config.get('timescale') ?? 'week');
		const propertyOrder = this.config.getOrder();
		const dateColumns = buildDateColumns(timescale);
		const entryMap = this.buildEntryMap();

		this.containerEl.style.setProperty('--hh-column-count', String(dateColumns.length));

		this.renderHeader(dateColumns);

		for (const propertyId of propertyOrder) {
			this.renderHabitRow(propertyId, dateColumns, entryMap);
		}
	}

	private buildEntryMap(): Record<string, BasesEntry> {
		const entriesByDate: Record<string, BasesEntry> = {};

		for (const group of this.data.groupedData) {
			for (const entry of group.entries) {
				const basename = entry.file.basename;

				if (/^\d{4}-\d{2}-\d{2}$/.test(basename)) {
					entriesByDate[basename] = entry;
				}
			}
		}

		return entriesByDate;
	}

	private renderHeader(dateColumns: Date[]): void {
		const headerEl = this.containerEl.createDiv({ cls: 'hh-header' });

		headerEl.createDiv({ cls: 'hh-label hh-label--header', text: '' });

		for (const date of dateColumns) {
			headerEl.createDiv({
				cls: 'hh-day-label',
				text: this.getDayLabel(date),
			});
		}
	}

	private renderHabitRow(
		propertyId: BasesPropertyId,
		dateColumns: Date[],
		entryMap: Record<string, BasesEntry>
	): void {
		const label = this.getPropertyLabel(propertyId);
		const rowEl = this.containerEl.createDiv({ cls: 'hh-row' });

		rowEl.createDiv({
			cls: 'hh-label',
			text: label,
			attr: { title: label },
		});

		for (const date of dateColumns) {
			const dateStr = formatDate(date);
			const entry = entryMap[dateStr];
			const dotState = this.resolveDotState(entry, propertyId);

			const cls = [
				'hh-dot',
				`hh-dot--${dotState}`,
				this.isToday(date) ? 'hh-dot--today' : '',
			].filter(Boolean).join(' ');

			rowEl.createDiv({
				cls,
				attr: { 'aria-label': `${label} ${dateStr}: ${dotState}` },
			});
		}
	}

	private resolveDotState(
		entry: BasesEntry | undefined,
		propertyId: BasesPropertyId
	): DotState {
		if (!entry) return 'missing';

		const value = entry.getValue(propertyId);

		if (value === null) return 'empty';
		if (value instanceof BooleanValue && value.isTruthy()) return 'filled';

		return 'empty';
	}

	// Strip the BasesPropertyId type prefix (e.g. "note.workout" → "workout")
	private getPropertyLabel(propertyId: BasesPropertyId): string {
		const dot = propertyId.indexOf('.');
		return dot >= 0 ? propertyId.slice(dot + 1) : propertyId;
	}

	private getDayLabel(date: Date): string {
		return date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);
	}

	private isToday(date: Date): boolean {
		return formatDate(date) === formatDate(new Date());
	}
}
