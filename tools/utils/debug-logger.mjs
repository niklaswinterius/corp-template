/**
 * Debug logging utility for CORP-Template
 * Provides consistent logging across all template processing steps
 */

export class DebugLogger {
    constructor(module) {
        this.module = module;
        this.enabled = process.env.DEBUG === 'true';
    }

    log(message, data = null) {
        if (!this.enabled) return;
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${this.module}] ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    error(message, error = null) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [${this.module}] ERROR: ${message}`);
        if (error) {
            console.error(error);
        }
    }
}

export const createLogger = (module) => new DebugLogger(module);