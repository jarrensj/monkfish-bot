import fs from "node:fs";
import path from "node:path";


// Simple file-backed key-value store for persisting wallet data across restarts

const DIR = ".data";
const FILE = process.env.KeyValue_PATH || path.join(DIR, "keyValue.json");

type KeyValue = Record<string, unknown>;

// Load existing data from disk on startup
let cache: KeyValue = {};
if (fs.existsSync(FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(FILE, "utf8")) as KeyValue;
    } catch {
        cache = {};
    }
}

// Write current cache to disk
function persist() {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2), "utf8");
}

export const keyValue = {
    // Retrieve a value by key, with optional fallback
    get<T = unknown>(key: string, fallback?: T): T {
        return (key in cache ? (cache[key] as T) : (fallback as T));
    },

    // Store a value and immediately persist to disk
    set(key: string, value: unknown) {
        cache[key] = value;
        persist();
    },
};
