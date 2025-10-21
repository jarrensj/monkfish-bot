import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.KEYVALUE_DIR
  ? path.resolve(process.env.KEYVALUE_DIR)
  : path.resolve(".data");

const FILE = process.env.KEYVALUE_PATH
  ? path.resolve(process.env.KEYVALUE_PATH)
  : path.join(DATA_DIR, "keyValue.json");

type KeyValue = Record<string, unknown>;

let cache: KeyValue = {};
let persistInProgress = false;
let pendingPersist = false;

// Initialize and load data
async function initialize() {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
  } catch (err) {
    console.error("[keyValue] mkdir failed:", err, { dir: path.dirname(FILE) });
  }

  try {
    const data = await fs.readFile(FILE, "utf8");
    cache = JSON.parse(data);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code !== 'ENOENT') {
      console.error("[keyValue] Failed to read/parse store; starting empty:", err, { file: FILE });
    }
    cache = {};
  }
}

// Atomic persist with write-to-tmp + rename
async function persist() {
  if (persistInProgress) {
    pendingPersist = true;
    return;
  }

  persistInProgress = true;

  try {
    const tmp = FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(cache, null, 2), "utf8");
    await fs.rename(tmp, FILE);
  } catch (err) {
    console.error("[keyValue] persist failed:", err, { file: FILE });
  } finally {
    persistInProgress = false;
    
    // If another persist was requested while we were working, do it now
    if (pendingPersist) {
      pendingPersist = false;
      setTimeout(persist, 0);
    }
  }
}

// Batch multiple set operations
let persistTimeout: NodeJS.Timeout | null = null;
function schedulePersist() {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
  }
  persistTimeout = setTimeout(() => {
    persistTimeout = null;
    persist();
  }, 100); // Batch writes within 100ms
}

export const keyValue = {
  async initialize() {
    await initialize();
  },

  get<T = unknown>(key: string, fallback?: T): T {
    return (key in cache ? cache[key] as T : fallback as T);
  },

  set(key: string, value: unknown, immediate: boolean = false) {
    cache[key] = value;
    if (immediate) {
      persist();
    } else {
      schedulePersist();
    }
  },

  // For cleanup
  destroy() {
    if (persistTimeout) {
      clearTimeout(persistTimeout);
    }
  }
};

// Auto-initialize on import
initialize().catch(err => {
  console.error("[keyValue] Initialization failed:", err);
});