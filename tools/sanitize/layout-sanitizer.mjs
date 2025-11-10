/**
 * Layout sanitization utility
 * Automatically adjusts layout elements to meet minimum size requirements
 */

import fs from 'fs';
import { createLogger } from '../utils/debug-logger.mjs';
import { classifyLayout, getMinAreaRequirement } from '../utils/layout-classifier.mjs';

const logger = createLogger('layout-sanitizer');

export async function sanitizeLayouts() {
    try {
        logger.log('Starting layout sanitization');
        
        // Read template map
        const mapPath = 'layouts/template_map.json';
        const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
        const canvas = map.canvas || { w: 1280, h: 720 };
        
        // Process each layout
        for (const layout of map.layouts || []) {
            const layoutType = classifyLayout(layout.placeholders || []);
            const minBodyArea = getMinAreaRequirement(layoutType, canvas);
            
            // Adjust element sizes
            let modified = false;
            for (const element of layout.placeholders || []) {
                if (['body', 'pic'].includes(element.type)) {
                    const area = element.w * element.h;
                    if (area < minBodyArea) {
                        // Calculate new dimensions maintaining aspect ratio
                        const ratio = element.w / element.h;
                        const newHeight = Math.sqrt(minBodyArea / ratio);
                        const newWidth = newHeight * ratio;
                        
                        element.w = Math.ceil(newWidth);
                        element.h = Math.ceil(newHeight);
                        modified = true;
                        
                        logger.log(`Adjusted element in layout ${layout.id}: ${element.type} (${area} -> ${element.w * element.h})`);
                    }
                }
            }
            
            if (modified) {
                logger.log(`Layout ${layout.id} was modified to meet size requirements`);
            }
        }
        
        // Save updated template map
        const backupPath = `${mapPath}.backup`;
        fs.copyFileSync(mapPath, backupPath);
        fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
        
        logger.log('Layout sanitization complete. Original file backed up.');
        
    } catch (error) {
        logger.error('Layout sanitization failed', error);
        throw error;
    }
}