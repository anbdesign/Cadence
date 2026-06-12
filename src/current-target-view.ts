import { BasesEntry, BasesPropertyId, BasesView, BooleanValue, ListValue, MarkdownView, NumberValue, QueryController, getIcon } from 'obsidian';
import CadencePlugin from './main';
import { buildDateColumns, formatDate, getCurrentDate, startOfWeek } from './date-utils';
import { GoalMode, computeGoal, computeDailyDelta } from './goal-scaling';

export const CURRENT_TARGET_VIEW_TYPE = 'cadence-current-target';

type IconMode = 'property-name' | 'first-letter' | 'text' | 'lucide';
type ProgressStyle = 'dots' | 'ring';
type TrendDirection = 'up' | 'down' | 'stable';

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
		this.plugin.currentTargetConfig = this.config;
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

		const iconStyle = this.readString('icon-style') === 'subtle' ? 'var(--text-muted)' : 'var(--text-normal)';
		this.containerEl.style.setProperty('--ct-icon-color', iconStyle);

		const progressStyle: ProgressStyle = this.readString('progress-style') === 'ring' ? 'ring' : 'dots';
		const timescale = (this.readString('timescale') || 'week') as 'week' | 'month';

		const skipIndices = new Set<number>();
		for (let i = 0; i < propertyOrder.length; i++) {
			if (skipIndices.has(i)) continue;

			const propertyId = propertyOrder[i]!;
			const iconMode = (this.readString(`icon-mode-${i}`) || 'property-name') as IconMode;
			const label    = this.getPropertyLabel(propertyId);
			let iconStr: string;
			if (iconMode === 'text' || iconMode === 'lucide') {
				iconStr = this.readString(`icon-${i}`);
			} else if (iconMode === 'first-letter') {
				const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
				iconStr = [...segmenter.segment(label)][0]?.segment ?? '';
			} else {
				iconStr = label;
			}

			const propType = this.readString(`prop-type-${i}`) || 'boolean';
			if (propType === 'number') {
				this.renderNumberCell(propertyId, iconStr, iconMode, referenceDate, timescale, entryMap);
				continue;
			}

			let current = this.countTruthy(propertyId, weekDates, entryMap);

			const mergeNext = this.config.get(`merge-next-${i}`) === true;
			if (mergeNext && i + 1 < propertyOrder.length) {
				const nextPropType = this.readString(`prop-type-${i + 1}`) || 'boolean';
				if (nextPropType !== 'number') {
					current += this.countTruthy(propertyOrder[i + 1]!, weekDates, entryMap);
					skipIndices.add(i + 1);
				}
			}

			const modeStr = this.readString(`goal-${i}`) || 'three-day';
			const maxVal  = this.config.get(`goal-max-${i}`);
			const max     = typeof maxVal === 'number' ? Math.max(1, Math.round(maxVal)) : 5;

			let goal = computeGoal(modeStr as GoalMode, max, dayIndex);
			let neutralWindow = 1;
			if (skipIndices.has(i + 1)) {
				const nextModeStr = this.readString(`goal-${i + 1}`) || 'three-day';
				const nextMaxVal  = this.config.get(`goal-max-${i + 1}`);
				const nextMax     = typeof nextMaxVal === 'number' ? Math.max(1, Math.round(nextMaxVal)) : 5;
				const nextGoal    = computeGoal(nextModeStr as GoalMode, nextMax, dayIndex);
				goal = (goal === null && nextGoal === null) ? null : (goal ?? 0) + (nextGoal ?? 0);
				neutralWindow = computeDailyDelta(modeStr as GoalMode, max, dayIndex)
					+ computeDailyDelta(nextModeStr as GoalMode, nextMax, dayIndex);
				if (neutralWindow < 1) neutralWindow = 1;
			}
			this.renderCell(propertyId, iconStr, iconMode, current, goal, progressStyle, neutralWindow);
		}
	}

	private renderCell(
		propertyId: BasesPropertyId,
		iconStr: string,
		iconMode: IconMode,
		current: number,
		goal: number | null,
		progressStyle: ProgressStyle = 'dots',
		neutralWindow: number = 1
	): void {
		const cell = this.containerEl.createDiv({ cls: 'ct-cell' });

		const iconEl = cell.createSpan({ cls: 'ct-icon' });
		if (iconStr) {
			renderIcon(iconEl, iconStr, iconMode);
		}

		let stateClass = '';
		if (goal !== null) {
			if (current === 0 && goal === 0) {
				stateClass = ' ct-state--neutral';
			} else if (current >= goal) {
				stateClass = ' ct-state--ahead';
			} else if (current >= goal - neutralWindow) {
				stateClass = ' ct-state--neutral';
			} else {
				stateClass = ' ct-state--behind';
			}
		}

		const label = this.getPropertyLabel(propertyId);
		const countText = goal !== null ? `${current} / ${goal}` : String(current);

		const contentEl = cell.createDiv({ cls: `ct-content${stateClass}` });

		contentEl.createSpan({
			cls: 'ct-count',
			text: countText,
			attr: { 'aria-label': `${label}: ${countText}` },
		});

		if (goal !== null && goal > 0) {
			if (progressStyle === 'ring') {
				renderRing(contentEl, current, goal);
			} else {
				const progressEl = contentEl.createDiv({ cls: 'ct-progress' });
				const filled = Math.min(current, goal);
				for (let i = 0; i < goal; i++) {
					progressEl.createSpan({
						cls: i < filled ? 'ct-progress-dot ct-progress-dot--filled' : 'ct-progress-dot ct-progress-dot--empty',
					});
				}
			}
		}
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

	private readLatestNumber(
		propertyId: BasesPropertyId,
		referenceDate: Date,
		entryMap: Record<string, BasesEntry>
	): number | null {
		const refStr = formatDate(referenceDate);
		const sortedKeys = Object.keys(entryMap).sort();
		// Walk backward from referenceDate (inclusive)
		for (let i = sortedKeys.length - 1; i >= 0; i--) {
			const key = sortedKeys[i]!;
			if (key > refStr) continue;
			const raw = entryMap[key]!.getValue(propertyId);
			if (!(raw instanceof NumberValue)) continue;
			const n = parseFloat(raw.toString());
			if (!isNaN(n)) return n;
		}
		return null;
	}

	private computeTrend(
		current: number | null,
		propertyId: BasesPropertyId,
		referenceDate: Date,
		timescale: 'week' | 'month',
		entryMap: Record<string, BasesEntry>
	): TrendDirection {
		if (current === null) return 'stable';

		// Build previous period date range
		let prevStart: Date;
		let prevEnd: Date;
		if (timescale === 'month') {
			const y = referenceDate.getFullYear();
			const m = referenceDate.getMonth();
			prevStart = new Date(y, m - 1, 1, 0, 0, 0);
			prevEnd   = new Date(y, m, 0, 23, 59, 59); // last day of previous month
		} else {
			const thisWeekStart = startOfWeek(referenceDate);
			prevEnd   = new Date(thisWeekStart.getTime() - 1);
			prevStart = new Date(thisWeekStart.getTime() - 7 * 86400000);
		}

		const prevStartStr = formatDate(prevStart);
		const prevEndStr   = formatDate(prevEnd);

		const prevValues: number[] = [];
		for (const key of Object.keys(entryMap)) {
			if (key < prevStartStr || key > prevEndStr) continue;
			const raw = entryMap[key]!.getValue(propertyId);
			if (!(raw instanceof NumberValue)) continue;
			const n = parseFloat(raw.toString());
			if (!isNaN(n)) prevValues.push(n);
		}

		if (prevValues.length === 0) return 'stable';

		const prev = prevValues.reduce((a, b) => a + b, 0) / prevValues.length;
		const threshold = Math.abs(prev) > 1 ? Math.abs(prev) * 0.03 : 0.5;
		const delta = current - prev;

		if (delta > threshold) return 'up';
		if (delta < -threshold) return 'down';
		return 'stable';
	}

	private renderNumberCell(
		propertyId: BasesPropertyId,
		iconStr: string,
		iconMode: IconMode,
		referenceDate: Date,
		timescale: 'week' | 'month',
		entryMap: Record<string, BasesEntry>
	): void {
		const cell = this.containerEl.createDiv({ cls: 'ct-cell' });

		const iconEl = cell.createSpan({ cls: 'ct-icon' });
		if (iconStr) {
			renderIcon(iconEl, iconStr, iconMode);
		}

		const current = this.readLatestNumber(propertyId, referenceDate, entryMap);
		const trend   = this.computeTrend(current, propertyId, referenceDate, timescale, entryMap);

		const valueText = current === null
			? '—'
			: Number.isInteger(current) ? String(current) : current.toFixed(1);

		const label = this.getPropertyLabel(propertyId);
		const contentEl = cell.createDiv({ cls: 'ct-content' });

		contentEl.createSpan({
			cls: 'ct-count',
			text: valueText,
			attr: { 'aria-label': `${label}: ${valueText}` },
		});

		const arrowIcon = trend === 'up' ? 'arrow-up-right' : trend === 'down' ? 'arrow-down-right' : 'arrow-right-to-line';
		const trendEl = contentEl.createSpan({ cls: `ct-trend ct-trend--${trend}` });
		const svg = getIcon(arrowIcon);
		if (svg) trendEl.appendChild(svg);
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

function renderRing(parent: HTMLElement, current: number, goal: number): void {
	const progress = Math.min(current / goal, 1);
	const size = 16;
	const r = 5.5;
	const cx = size / 2;
	const circumference = 2 * Math.PI * r;

	const svgNS = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(svgNS, 'svg');
	svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
	svg.setAttribute('class', 'ct-ring');

	if (progress >= 1) {
		const solid = document.createElementNS(svgNS, 'circle');
		solid.setAttribute('cx', String(cx));
		solid.setAttribute('cy', String(cx));
		solid.setAttribute('r', String(r));
		solid.setAttribute('class', 'ct-ring-dot');
		svg.appendChild(solid);
	} else {
		const track = document.createElementNS(svgNS, 'circle');
		track.setAttribute('cx', String(cx));
		track.setAttribute('cy', String(cx));
		track.setAttribute('r', String(r));
		track.setAttribute('class', 'ct-ring-track');
		svg.appendChild(track);

		if (progress > 0) {
			const fill = document.createElementNS(svgNS, 'circle');
			fill.setAttribute('cx', String(cx));
			fill.setAttribute('cy', String(cx));
			fill.setAttribute('r', String(r));
			fill.setAttribute('class', 'ct-ring-fill');
			fill.style.strokeDasharray = String(circumference);
			fill.style.strokeDashoffset = String(circumference * (1 - progress));
			svg.appendChild(fill);
		}
	}

	parent.appendChild(svg);
}

function renderIcon(el: HTMLElement, iconStr: string, iconMode: IconMode): void {
	const s = iconStr.trim();
	if (!s) return;
	if (iconMode === 'lucide') {
		const svg = getIcon(s);
		if (svg) el.appendChild(svg);
		return;
	}
	el.textContent = s;
}
