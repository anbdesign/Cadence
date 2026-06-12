import { BasesEntry, BasesPropertyId, BasesView, QueryController } from 'obsidian';
import { DurationFormat, formatDuration, parseDuration } from './duration-utils';

export const PROGRESS_BAR_VIEW_TYPE = 'cadence-progress-bar';

export class ProgressBarView extends BasesView {
	readonly type = PROGRESS_BAR_VIEW_TYPE;

	private readonly containerEl: HTMLElement;

	constructor(controller: QueryController, parentEl: HTMLElement) {
		super(controller);
		this.containerEl = parentEl.createDiv({ cls: 'pb-view' });
	}

	public onDataUpdated(): void {
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		const format = (this.readString('duration-format') || 'auto') as DurationFormat;
		const guideIntervalStr = this.readString('guide-interval') || 'none';
		const barHeight = this.readString('bar-height') || 'medium';

		this.containerEl.className = `pb-view pb-view--${barHeight}`;

		const propertyOrder = this.config.getOrder();
		if (propertyOrder.length === 0) return;
		// Use the first configured property as the duration source
		const propId = propertyOrder[0]!;

		// Collect every entry the base returns
		const entries: BasesEntry[] = [];
		for (const group of this.data.groupedData) {
			for (const entry of group.entries) {
				entries.push(entry);
			}
		}

		// Parse each entry's duration upfront so we can compute the auto max
		const parsedSeconds = entries.map(entry => this.parseEntryDuration(entry, propId, format));

		// Resolve max duration
		const maxDurationStr = this.readString('max-duration');
		let maxSeconds: number;
		if (maxDurationStr) {
			maxSeconds = parseDuration(maxDurationStr, 'auto') ?? 0;
		} else {
			maxSeconds = parsedSeconds.reduce<number>((acc, v) => (v !== null && v > acc ? v : acc), 0);
		}

		const guideIntervalSeconds = guideIntervalStr !== 'none' ? parseInt(guideIntervalStr, 10) * 60 : 0;

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i]!;
			const seconds = parsedSeconds[i] ?? null;
			this.renderRow(entry.file.basename, seconds, maxSeconds, guideIntervalSeconds);
		}
	}

	private parseEntryDuration(entry: BasesEntry, propertyId: BasesPropertyId, format: DurationFormat): number | null {
		const raw = entry.getValue(propertyId);
		if (raw === null || raw === undefined) return null;
		const rawStr = raw.toString().trim();
		if (!rawStr || rawStr === 'null') return null;
		// Plain number → treat as seconds
		if (/^\d+(\.\d+)?$/.test(rawStr)) {
			const n = parseFloat(rawStr);
			return isNaN(n) ? null : n;
		}
		return parseDuration(rawStr, format);
	}

	private renderRow(
		label: string,
		seconds: number | null,
		maxSeconds: number,
		guideIntervalSeconds: number
	): void {
		const row = this.containerEl.createDiv({ cls: 'pb-row' });

		row.createSpan({ cls: 'pb-label', text: label });

		const durationEl = row.createSpan({ cls: 'pb-duration' });
		if (seconds !== null) {
			durationEl.textContent = formatDuration(seconds);
		} else {
			durationEl.textContent = '—';
			durationEl.classList.add('pb-duration--empty');
		}

		const track = row.createDiv({ cls: 'pb-track' });

		const fillPct = maxSeconds > 0 && seconds !== null
			? Math.min(seconds / maxSeconds, 1) * 100
			: 0;
		track.createDiv({ cls: 'pb-fill' }).style.width = `${fillPct}%`;

		if (guideIntervalSeconds > 0 && maxSeconds > 0) {
			const count = Math.floor(maxSeconds / guideIntervalSeconds);
			for (let n = 1; n < count; n++) {
				const pct = (n * guideIntervalSeconds / maxSeconds) * 100;
				const guide = track.createDiv({ cls: 'pb-guide' });
				guide.style.left = `${pct}%`;
			}
		}
	}

	private readString(key: string): string {
		const val = this.config.get(key);
		return typeof val === 'string' ? val : '';
	}
}
