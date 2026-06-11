import { BasesEntry, BasesPropertyId, BasesView, MarkdownView, NumberValue, QueryController, getIcon } from 'obsidian';
import CadencePlugin from './main';
import { DurationFormat, formatDuration, parseDuration } from './duration-utils';
import { formatDate } from './date-utils';

export const PROGRESS_BAR_VIEW_TYPE = 'cadence-progress-bar';

type LabelMode = 'property-name' | 'first-letter' | 'text' | 'lucide';

export class ProgressBarView extends BasesView {
	readonly type = PROGRESS_BAR_VIEW_TYPE;

	private readonly containerEl: HTMLElement;
	private readonly plugin: CadencePlugin;

	constructor(controller: QueryController, parentEl: HTMLElement, plugin: CadencePlugin) {
		super(controller);
		this.plugin = plugin;
		this.containerEl = parentEl.createDiv({ cls: 'pb-view' });
	}

	public onDataUpdated(): void {
		this.plugin.progressBarConfig = this.config;
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		const format = (this.readString('duration-format') || 'auto') as DurationFormat;
		const guideIntervalStr = this.readString('guide-interval') || 'none';
		const barHeight = this.readString('bar-height') || 'medium';

		this.containerEl.className = `pb-view pb-view--${barHeight}`;

		const propertyOrder = this.config.getOrder();
		const entryMap = this.buildEntryMap();

		// Parse all durations first to compute auto max
		const parsedValues: (number | null)[] = propertyOrder.map(propId =>
			this.readLatestDuration(propId, entryMap, format)
		);

		// Resolve max duration
		const maxDurationStr = this.readString('max-duration');
		let maxSeconds: number;
		if (maxDurationStr) {
			maxSeconds = parseDuration(maxDurationStr, 'auto') ?? 0;
		} else {
			maxSeconds = parsedValues.reduce<number>((acc, v) => (v !== null && v > acc ? v : acc), 0);
		}

		// Guide interval in seconds
		const guideIntervalSeconds = guideIntervalStr !== 'none' ? parseInt(guideIntervalStr, 10) * 60 : 0;

		for (let i = 0; i < propertyOrder.length; i++) {
			const propId = propertyOrder[i]!;
			const seconds = parsedValues[i] ?? null;
			const labelStr = this.resolveLabel(propId, i);
			this.renderRow(propId, labelStr, i, seconds, maxSeconds, guideIntervalSeconds);
		}
	}

	private renderRow(
		_propId: BasesPropertyId,
		labelStr: string,
		index: number,
		seconds: number | null,
		maxSeconds: number,
		guideIntervalSeconds: number
	): void {
		const row = this.containerEl.createDiv({ cls: 'pb-row' });

		// Label
		const labelEl = row.createSpan({ cls: 'pb-label' });
		const labelMode = (this.readString(`label-mode-${index}`) || 'property-name') as LabelMode;
		if (labelMode === 'lucide') {
			const svg = getIcon(labelStr);
			if (svg) labelEl.appendChild(svg);
		} else {
			labelEl.textContent = labelStr;
		}

		// Duration text
		const durationEl = row.createSpan({ cls: 'pb-duration' });
		if (seconds !== null) {
			durationEl.textContent = formatDuration(seconds);
		} else {
			durationEl.textContent = '—';
			durationEl.classList.add('pb-duration--empty');
		}

		// Bar track
		const track = row.createDiv({ cls: 'pb-track' });

		const fillPct = maxSeconds > 0 && seconds !== null
			? Math.min(seconds / maxSeconds, 1) * 100
			: 0;

		const fill = track.createDiv({ cls: 'pb-fill' });
		fill.style.width = `${fillPct}%`;

		// Guide lines
		if (guideIntervalSeconds > 0 && maxSeconds > 0) {
			const count = Math.floor(maxSeconds / guideIntervalSeconds);
			for (let n = 1; n < count; n++) {
				const pct = (n * guideIntervalSeconds / maxSeconds) * 100;
				const guide = track.createDiv({ cls: 'pb-guide' });
				guide.style.left = `${pct}%`;
			}
		}
	}

	private resolveLabel(propId: BasesPropertyId, index: number): string {
		const mode = (this.readString(`label-mode-${index}`) || 'property-name') as LabelMode;
		const dot = propId.indexOf('.');
		const name = dot >= 0 ? propId.slice(dot + 1) : propId;

		if (mode === 'text' || mode === 'lucide') {
			return this.readString(`label-${index}`);
		}
		if (mode === 'first-letter') {
			const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
			return [...segmenter.segment(name)][0]?.segment ?? '';
		}
		return name;
	}

	private readLatestDuration(
		propertyId: BasesPropertyId,
		entryMap: Record<string, BasesEntry>,
		format: DurationFormat
	): number | null {
		const sortedKeys = Object.keys(entryMap).sort();
		for (let i = sortedKeys.length - 1; i >= 0; i--) {
			const key = sortedKeys[i]!;
			const entry = entryMap[key]!;
			const raw = entry.getValue(propertyId);
			if (raw === null || raw === undefined) continue;

			// Accept string values (duration stored as text) or numbers (stored as seconds)
			const rawStr = raw.toString().trim();
			if (!rawStr || rawStr === 'null') continue;

			// If it looks like a number, treat it directly as seconds
			if (/^\d+(\.\d+)?$/.test(rawStr)) {
				const n = parseFloat(rawStr);
				if (!isNaN(n)) return n;
				continue;
			}

			// Try parsing as a duration string — also handles NumberValue with colon format
			const parsed = parseDuration(rawStr, format);
			if (parsed !== null) return parsed;
		}
		return null;
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
}
