/**
 * Vitest setup file to polyfill missing globals that discord.js/undici needs
 */

// Polyfill File API for undici (used by discord.js)
// @ts-ignore
if (typeof global.File === 'undefined') {
    // @ts-ignore
    global.File = class File {
        constructor(
            public parts: BlobPart[],
            public name: string,
            public options?: FilePropertyBag
        ) {}
    };
}

// Polyfill FormData if needed
// @ts-ignore
if (typeof global.FormData === 'undefined') {
    // @ts-ignore
    global.FormData = class FormData {
        private data = new Map<string, any>();

        append(key: string, value: any) {
            this.data.set(key, value);
        }

        get(key: string) {
            return this.data.get(key);
        }

        has(key: string) {
            return this.data.has(key);
        }
    };
}
