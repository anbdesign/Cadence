export const PROPERTY_COLOR_OPTIONS: Record<string, string> = {
	inherit: 'Default',
	red:     'Red',
	orange:  'Orange',
	yellow:  'Yellow',
	green:   'Green',
	cyan:    'Cyan',
	blue:    'Blue',
	purple:  'Purple',
	pink:    'Pink',
};

const PROPERTY_COLOR_VALUES = {
	inherit: null,
	red:     'var(--color-red)',
	orange:  'var(--color-orange)',
	yellow:  'var(--color-yellow)',
	green:   'var(--color-green)',
	cyan:    'var(--color-cyan)',
	blue:    'var(--color-blue)',
	purple:  'var(--color-purple)',
	pink:    'var(--color-pink)',
} as const;

type PropertyColor = keyof typeof PROPERTY_COLOR_VALUES;

/** Resolve a saved palette key to an Obsidian theme color, or inherit the view default. */
export function resolvePropertyColor(value: unknown): string | null {
	if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(PROPERTY_COLOR_VALUES, value)) {
		return null;
	}

	return PROPERTY_COLOR_VALUES[value as PropertyColor];
}
