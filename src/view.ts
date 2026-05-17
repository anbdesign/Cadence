import { BasesEntry, BasesPropertyId, BasesView, BooleanValue, ListValue, QueryController } from 'obsidian';

import CadencePlugin, { CADENCE_VIEW_TYPE } from './main';
import { buildDateColumns, formatDate, getCurrentDate } from './date-utils';

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

		// dev-only: auto-refresh when __cadenceDevDate is set, and expose a manual refresh function
		let _devDate: Date | undefined = (window as any).__cadenceDevDate;
		try {
			Object.defineProperty(window, '__cadenceDevDate', {
				get: () => _devDate,
				set: (val: Date | undefined) => { _devDate = val; this.render(); },
				configurable: true,
				enumerable: false,
			});
		} catch { /* ignore if not redefinable */ }
		(window as any).__cadenceRefresh = () => this.render();
	}

	public onDataUpdated(): void {
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		const timescaleValue = this.config.get('timescale');
		const timescale = typeof timescaleValue === 'string' ? timescaleValue : 'week';
		const propertyOrder = this.config.getOrder();
		const dateColumns = buildDateColumns(timescale);
		const entryMap = this.buildEntryMap();

		this.containerEl.style.setProperty('--hh-column-count', String(dateColumns.length));

		this.renderHeader(dateColumns);

		for (const propertyId of propertyOrder) {
			this.renderHabitRow(propertyId, dateColumns, entryMap);
		}

		// Measure after rendering so property icon glyphs (SF Symbols) are active in the font cache
		const labels = propertyOrder.map(id => this.getPropertyLabel(id));
		this.containerEl.style.setProperty('--hh-label-width', this.computeLabelWidth(labels));

		this.positionTodayPill(dateColumns);
	}

	private positionTodayPill(dateColumns: Date[]): void {
		const todayIndex = dateColumns.findIndex(d => this.isToday(d));
		if (todayIndex < 0) return;

		const rows = Array.from(this.containerEl.querySelectorAll<HTMLElement>('.hh-row'));
		if (rows.length === 0) return;

		const dots = rows
			.map(row => row.querySelectorAll<HTMLElement>('.hh-dot')[todayIndex])
			.filter((d): d is HTMLElement => !!d);

		const firstDot = dots[0];
		const lastDot = dots[dots.length - 1];
		if (!firstDot || !lastDot) return;

		const containerRect = this.containerEl.getBoundingClientRect();
		const firstRect = firstDot.getBoundingClientRect();
		const lastRect = lastDot.getBoundingClientRect();

		const pad = 5;
		const x = firstRect.left - containerRect.left + this.containerEl.scrollLeft - pad;
		const y = firstRect.top - containerRect.top + this.containerEl.scrollTop - pad;
		const W = firstRect.width + 2 * pad;
		const H = lastRect.bottom - firstRect.top + 2 * pad;

		this.renderTodayPill(x, y, W, H);
	}

	private renderTodayPill(x: number, y: number, W: number, H: number): void {
		const R = W / 2;
		// k > 0.5523 (circular) lowers curvature at cap-to-straight junctions for a squircle-like smoothness
		const k = 0.6;
		const c = R * k;

		const d = [
			`M ${R} 0`,
			`C ${R + c} 0, ${W} ${R - c}, ${W} ${R}`,
			`L ${W} ${H - R}`,
			`C ${W} ${H - R + c}, ${R + c} ${H}, ${R} ${H}`,
			`C ${R - c} ${H}, 0 ${H - R + c}, 0 ${H - R}`,
			`L 0 ${R}`,
			`C 0 ${R - c}, ${R - c} 0, ${R} 0`,
			'Z',
		].join(' ');

		const svgNS = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNS, 'svg');
		Object.assign(svg.style, {
			position: 'absolute',
			top: `${y}px`,
			left: `${x}px`,
			width: `${W}px`,
			height: `${H}px`,
			pointerEvents: 'none',
			overflow: 'visible',
		});

		const path = document.createElementNS(svgNS, 'path');
		path.setAttribute('d', d);
		path.style.fill = 'none';
		path.style.stroke = 'var(--interactive-accent)';
		path.style.strokeWidth = '1.5';
		svg.appendChild(path);

		this.containerEl.appendChild(svg);
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
		if (value instanceof ListValue && value.isTruthy()) return 'filled';

		return 'empty';
	}

	private computeLabelWidth(labels: string[]): string {
		const probe = this.containerEl.createSpan({ cls: 'hh-label' });
		Object.assign(probe.style, {
			position: 'absolute',
			visibility: 'hidden',
			overflow: 'visible',
			textOverflow: 'clip',
			whiteSpace: 'nowrap',
		});

		let maxWidth = 0;
		for (const label of labels) {
			probe.textContent = label;
			maxWidth = Math.max(maxWidth, probe.getBoundingClientRect().width);
		}
		probe.remove();

		return `${Math.ceil(maxWidth)}px`;
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
		return formatDate(date) === formatDate(getCurrentDate());
	}
}
