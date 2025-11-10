import fs from 'fs';
import { createLogger } from '../utils/debug-logger.mjs';
import { classifyLayout, getMinAreaRequirement } from '../utils/layout-classifier.mjs';

const logger = createLogger('validate-template');

async function validateTemplate() {
    logger.log('Starting template validation');
    
    const results = {
        layoutCount: 0,
        validLayouts: 0,
        overlaps: [],
        footerIssues: [],
        sizingIssues: []
    };

    try {
        // Load template map
        const map = JSON.parse(fs.readFileSync('layouts/template_map.json', 'utf-8'));
        results.layoutCount = map.layouts?.length || 0;
        logger.log(`Found ${results.layoutCount} layouts to validate`);

        // Validate each layout
        for (const layout of map.layouts || []) {
            logger.log(`Validating layout: ${layout.id}`);
            
            // Check placeholders
            const placeholders = layout.placeholders || [];
            const bodies = placeholders.filter(p => !['title', 'ctrTitle', 'subTitle', 'dt', 'sldNum', 'ftr'].includes(p.type));
            
            // Enhanced size validation with layout classification
            const canvas = map.canvas || { w: 1280, h: 720 };
            const layoutType = classifyLayout(placeholders);
            const minBodyArea = getMinAreaRequirement(layoutType, canvas);
            
            logger.log(`Layout ${layout.id} classified as: ${layoutType}`);
            
            for (const body of bodies) {
                const area = body.w * body.h;
                if (area < minBodyArea) {
                    results.sizingIssues.push({
                        layoutId: layout.id,
                        layoutType,
                        area: area,
                        minRequired: minBodyArea,
                        elementType: body.type
                    });
                }
            }

            // Overlap checks
            if (bodies.length > 1) {
                for (let i = 0; i < bodies.length; i++) {
                    for (let j = i + 1; j < bodies.length; j++) {
                        const overlapArea = calculateOverlap(bodies[i], bodies[j]);
                        if (overlapArea > 0) {
                            results.overlaps.push({
                                layoutId: layout.id,
                                elements: [bodies[i].type, bodies[j].type],
                                area: overlapArea
                            });
                        }
                    }
                }
            }

            // Footer validation
            const footers = placeholders.filter(p => ['dt', 'sldNum', 'ftr'].includes(p.type));
            if (footers.length > 0 && !validateFooterPlacement(footers, canvas)) {
                results.footerIssues.push({
                    layoutId: layout.id,
                    footerCount: footers.length
                });
            }
        }

    } catch (error) {
        logger.error('Validation failed', error);
        throw error;
    }

    logger.log('Validation complete', results);
    return results;
}

function calculateOverlap(a, b) {
    if (!(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)) {
        const overlapWidth = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapHeight = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        return overlapWidth * overlapHeight;
    }
    return 0;
}

function validateFooterPlacement(footers, canvas) {
    const FOOTER_MARGIN = 20; // pixels from bottom
    return footers.every(footer => 
        footer.y + footer.h >= canvas.h - FOOTER_MARGIN && 
        footer.y < canvas.h
    );
}

// Run validation if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
    validateTemplate().catch(console.error);
}

export { validateTemplate };