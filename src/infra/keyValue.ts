import fs from "node:fs";
import path from "node:path";


// Simple file-backed key-value store for persisting wallet data across restarts

const DATA_DIR = process.env.KEYVALUE_DIR
  ? path.resolve(process.env.KEYVALUE_DIR)
  : path.resolve(".data");

const FILE = process.env.KEYVALUE_PATH
  ? path.resolve(process.env.KEYVALUE_PATH)
  : path.join(DATA_DIR, "keyValue.json");


type KeyValue = Record<string, unknown>;

try {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
} catch (err) {
  console.error("[keyValue] mkdir failed:", err, { dir: path.dirname(FILE) });
}

// Load existing data from disk on startup
let cache: KeyValue = {};
if (fs.existsSync(FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(FILE, "utf8")) as KeyValue;
    } catch (err) {
        console.error("[keyValue] Failed to read/parse store; starting empty:", err, { file: FILE });
        cache = {};
    }
}

// Write current cache to disk
function persist() {
  try {
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf8");
    fs.renameSync(tmp, FILE);
  } catch (err) {
    console.error("[keyValue] persist failed:", err, { file: FILE });
  }
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
