export const priorityFilter = (options, query, getOptionLabel = (opt) => opt) => {
    if (!query) return options;
    const q = query.toUpperCase();

    // 1. Initial filter: must contain the query
    const matches = options.filter((opt) => {
        const label = (getOptionLabel(opt) || "").toString().toUpperCase();
        return label.includes(q);
    });

    // 2. Sort by priority
    return matches.sort((a, b) => {
        const labelA = (getOptionLabel(a) || "").toString().toUpperCase();
        const labelB = (getOptionLabel(b) || "").toString().toUpperCase();

        const indexA = labelA.indexOf(q);
        const indexB = labelB.indexOf(q);

        // Priority 1: Exact match is king
        if (labelA === q && labelB !== q) return -1;
        if (labelB === q && labelA !== q) return 1;

        // Priority 2: Prefix match (starts with the query)
        const isPrefixA = indexA === 0;
        const isPrefixB = indexB === 0;
        if (isPrefixA && !isPrefixB) return -1;
        if (isPrefixB && !isPrefixA) return 1;

        // Priority 3: Match starts very close to the beginning (within first 4 characters)
        // But we distinguish between index 1, 2, 3 etc.
        const pA = indexA >= 0 && indexA <= 3 ? 0 : 1;
        const pB = indexB >= 0 && indexB <= 3 ? 0 : 1;

        if (pA !== pB) return pA - pB;

        // Priority 4: Earlier match starts are always better
        if (indexA !== indexB) return indexA - indexB;

        // Priority 5: Alphabetical
        return labelA.localeCompare(labelB);
    });
};
