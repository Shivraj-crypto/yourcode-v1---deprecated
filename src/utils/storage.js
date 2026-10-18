// ─────────────────────────────────────────────────────────
//  Local Storage Persistence (Zero Backend)
// ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'yourcode_state_v3';

const DEFAULT_STATE = {
  currentProblemId: 'two-sum',
  language: 'python',
  activeTestIndex: 0,
  customProblems: [],
  userCode: {},
  notes: {},
  bookmarks: {},
  statusByProblem: {},
  submissions: {},
  sessions: [],
  activeSession: {
    running: false,
    elapsedSeconds: 0,
    startedAt: null,
    solvedInSession: []
  }
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load state:', err);
  }
  return { ...DEFAULT_STATE };
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save state:', err);
  }
}

export function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_STATE };
}

export function exportBackup(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yourcode_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(String(ev.target.result));
        resolve({ ...DEFAULT_STATE, ...imported });
      } catch (err) {
        reject(new Error('Invalid JSON backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
