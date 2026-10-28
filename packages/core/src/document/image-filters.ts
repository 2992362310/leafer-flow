export const IMAGE_FILTERS = [
    { type: "exposure", label: "曝光", min: -1, max: 1, step: 0.01 },
    { type: "contrast", label: "对比度", min: -1, max: 1, step: 0.01 },
    { type: "saturation", label: "饱和度", min: -1, max: 1, step: 0.01 },
] as const;

export type ImageFilterType = (typeof IMAGE_FILTERS)[number]["type"];
export type ImageFilterSettings = Record<ImageFilterType, number>;
export type LeaferImageFilter = { type: ImageFilterType; value: number };

export function normalizeImageFilterSettings(value: unknown): ImageFilterSettings {
    const record = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const settings: ImageFilterSettings = { exposure: 0, contrast: 0, saturation: 0 };
    for (const filter of IMAGE_FILTERS) {
        const candidate = record[filter.type];
        if (typeof candidate === "number" && Number.isFinite(candidate)) {
            settings[filter.type] = Math.min(filter.max, Math.max(filter.min, candidate));
        }
    }
    return settings;
}

export function toLeaferImageFilters(value: unknown): LeaferImageFilter[] {
    const settings = normalizeImageFilterSettings(value);
    return IMAGE_FILTERS.flatMap(({ type }) => {
        const filterValue = settings[type];
        return filterValue === 0 ? [] : [{ type, value: filterValue }];
    });
}

export function fromLeaferImageFilters(value: unknown): ImageFilterSettings {
    const settings: ImageFilterSettings = { exposure: 0, contrast: 0, saturation: 0 };
    if (!Array.isArray(value)) return settings;
    for (const item of value) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const filter = item as Record<string, unknown>;
        if (typeof filter.type === "string" && typeof filter.value === "number") {
            if (filter.type === "exposure" || filter.type === "contrast" || filter.type === "saturation") {
                settings[filter.type] = filter.value;
            }
        }
    }
    return normalizeImageFilterSettings(settings);
}
