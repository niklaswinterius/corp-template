/**
 * Layout classification and validation rules
 */

const LAYOUT_TYPES = {
    TITLE_ONLY: 'title-only',
    CONTENT: 'content',
    SECTION: 'section',
    COMPARISON: 'comparison',
    SPECIAL: 'special'
};

function classifyLayout(placeholders) {
    const types = new Set(placeholders.map(p => p.type));
    
    if (types.size === 1 && types.has('title')) {
        return LAYOUT_TYPES.TITLE_ONLY;
    }
    
    if (placeholders.filter(p => !['title', 'subtitle', 'footer'].includes(p.type)).length > 1) {
        return LAYOUT_TYPES.COMPARISON;
    }
    
    if (placeholders.some(p => p.type.includes('section'))) {
        return LAYOUT_TYPES.SECTION;
    }
    
    if (placeholders.some(p => p.type.includes('content'))) {
        return LAYOUT_TYPES.CONTENT;
    }
    
    return LAYOUT_TYPES.SPECIAL;
}

const getMinAreaRequirement = (layoutType, canvas) => {
    const totalArea = canvas.w * canvas.h;
    switch (layoutType) {
        case LAYOUT_TYPES.TITLE_ONLY:
            return 0.05 * totalArea;
        case LAYOUT_TYPES.SECTION:
            return 0.10 * totalArea;
        case LAYOUT_TYPES.COMPARISON:
            return 0.15 * totalArea;
        case LAYOUT_TYPES.CONTENT:
            return 0.18 * totalArea;
        default:
            return 0.12 * totalArea;
    }
};

export { LAYOUT_TYPES, classifyLayout, getMinAreaRequirement };