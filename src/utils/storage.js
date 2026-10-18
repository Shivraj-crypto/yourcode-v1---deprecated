import initSqlJs from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const LEGACY_STORAGE_KEY = 'yourcode_state_v3'
const DATABASE_NAME = 'yourcode_local_storage'
const DATABASE_STORE = 'sqlite_files'
const DATABASE_FILE = 'yourcode.sqlite'

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
}

let databasePromise
let persistenceQueue = Promise.resolve()
let persistedCodeJson = null
let persistedSubmissionsJson = null

export function createDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE))
}

function openStorageDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(DATABASE_STORE)) database.createObjectStore(DATABASE_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open local storage'))
  })
}

async function readDatabaseFile() {
  const storage = await openStorageDatabase()
  return new Promise((resolve, reject) => {
    const transaction = storage.transaction(DATABASE_STORE, 'readonly')
    const request = transaction.objectStore(DATABASE_STORE).get(DATABASE_FILE)
    let result
    request.onsuccess = () => { result = request.result || null }
    transaction.oncomplete = () => {
      storage.close()
      resolve(result ? new Uint8Array(result) : null)
    }
    transaction.onerror = () => {
      storage.close()
      reject(transaction.error || new Error('Could not read the local SQLite database'))
    }
    transaction.onabort = () => {
      storage.close()
      reject(transaction.error || new Error('Reading the local SQLite database was aborted'))
    }
  })
}

async function writeDatabaseFile(databaseFile) {
  const storage = await openStorageDatabase()
  return new Promise((resolve, reject) => {
    const transaction = storage.transaction(DATABASE_STORE, 'readwrite')
    transaction.objectStore(DATABASE_STORE).put(databaseFile, DATABASE_FILE)
    transaction.oncomplete = () => {
      storage.close()
      resolve()
    }
    transaction.onerror = () => {
      storage.close()
      reject(transaction.error || new Error('Could not save the local SQLite database'))
    }
    transaction.onabort = () => {
      storage.close()
      reject(transaction.error || new Error('Saving the local SQLite database was aborted'))
    }
  })
}

function ensureSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_code (
      problem_id TEXT NOT NULL,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      PRIMARY KEY (problem_id, language)
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id TEXT NOT NULL,
      language TEXT NOT NULL,
      status TEXT NOT NULL,
      passed INTEGER NOT NULL,
      total INTEGER NOT NULL,
      runtime_ms REAL NOT NULL,
      timestamp TEXT NOT NULL,
      code TEXT NOT NULL
    );
  `)
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
      const savedFile = await readDatabaseFile()
      const database = savedFile ? new SQL.Database(savedFile) : new SQL.Database()
      ensureSchema(database)
      return database
    })()
  }
  return databasePromise
}

function queryRows(database, query) {
  const result = database.exec(query)[0]
  if (!result) return []
  return result.values.map(values => Object.fromEntries(result.columns.map((column, index) => [column, values[index]])))
}

function readLegacyState() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.warn('Could not read previous local data:', error)
    return null
  }
}

function saveAppState(database, state, codeJson, submissionsJson, forceAll = false) {
  const { userCode = {}, submissions = {}, ...appState } = state
  database.run('BEGIN TRANSACTION')
  try {
    database.run('INSERT OR REPLACE INTO app_state (id, payload) VALUES (1, ?)', [JSON.stringify(appState)])

    if (forceAll || codeJson !== persistedCodeJson) {
      database.run('DELETE FROM user_code')
      const insertCode = database.prepare('INSERT INTO user_code (problem_id, language, code) VALUES (?, ?, ?)')
      try {
        for (const [key, code] of Object.entries(userCode)) {
          const separator = key.lastIndexOf('__')
          if (separator < 0) continue
          insertCode.run([key.slice(0, separator), key.slice(separator + 2), String(code ?? '')])
        }
      } finally {
        insertCode.free()
      }
    }

    if (forceAll || submissionsJson !== persistedSubmissionsJson) {
      database.run('DELETE FROM submissions')
      const insertSubmission = database.prepare('INSERT INTO submissions (problem_id, language, status, passed, total, runtime_ms, timestamp, code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      try {
        for (const [problemId, items] of Object.entries(submissions)) {
          for (const item of [...items].reverse()) {
            insertSubmission.run([problemId, item.language || '', item.status || 'Attempted', Number(item.passed) || 0, Number(item.total) || 0, Number(item.runtimeMs) || 0, item.timestamp || '', item.code || ''])
          }
        }
      } finally {
        insertSubmission.free()
      }
    }

    database.run('COMMIT')
  } catch (error) {
    database.run('ROLLBACK')
    throw error
  }
}

function exportDatabaseFile(database) {
  const exported = database.export()
  return exported.buffer.slice(exported.byteOffset, exported.byteOffset + exported.byteLength)
}

function readState(database) {
  const appStateRow = queryRows(database, 'SELECT payload FROM app_state WHERE id = 1')[0]
  const appState = appStateRow ? JSON.parse(appStateRow.payload) : {}
  const userCode = Object.fromEntries(queryRows(database, 'SELECT problem_id, language, code FROM user_code').map(row => [`${row.problem_id}__${row.language}`, row.code]))
  const submissions = {}
  for (const row of queryRows(database, 'SELECT problem_id, language, status, passed, total, runtime_ms, timestamp, code FROM submissions ORDER BY id DESC')) {
    if (!submissions[row.problem_id]) submissions[row.problem_id] = []
    submissions[row.problem_id].push({ language: row.language, status: row.status, passed: row.passed, total: row.total, runtimeMs: row.runtime_ms, timestamp: row.timestamp, code: row.code })
  }
  const state = { ...createDefaultState(), ...appState, userCode, submissions }
  persistedCodeJson = JSON.stringify(userCode)
  persistedSubmissionsJson = JSON.stringify(submissions)
  return state
}

export async function loadState() {
  const database = await getDatabase()
  const saved = queryRows(database, 'SELECT id FROM app_state WHERE id = 1').length > 0
  if (!saved) {
    const state = { ...createDefaultState(), ...(readLegacyState() || {}) }
    const codeJson = JSON.stringify(state.userCode || {})
    const submissionsJson = JSON.stringify(state.submissions || {})
    saveAppState(database, state, codeJson, submissionsJson, true)
    await writeDatabaseFile(exportDatabaseFile(database))
    persistedCodeJson = codeJson
    persistedSubmissionsJson = submissionsJson
    try { localStorage.removeItem(LEGACY_STORAGE_KEY) } catch {}
  }
  return readState(database)
}

export function saveState(state) {
  const saving = persistenceQueue.then(async () => {
    const database = await getDatabase()
    const codeJson = JSON.stringify(state.userCode || {})
    const submissionsJson = JSON.stringify(state.submissions || {})
    saveAppState(database, state, codeJson, submissionsJson)
    await writeDatabaseFile(exportDatabaseFile(database))
    persistedCodeJson = codeJson
    persistedSubmissionsJson = submissionsJson
  })
  persistenceQueue = saving.catch(error => console.error('Failed to save local SQLite data:', error))
  return saving
}

export async function resetState() {
  await persistenceQueue
  const database = await getDatabase()
  const state = createDefaultState()
  const codeJson = JSON.stringify(state.userCode)
  const submissionsJson = JSON.stringify(state.submissions)
  saveAppState(database, state, codeJson, submissionsJson, true)
  await writeDatabaseFile(exportDatabaseFile(database))
  persistedCodeJson = codeJson
  persistedSubmissionsJson = submissionsJson
  try { localStorage.removeItem(LEGACY_STORAGE_KEY) } catch {}
  return state
}

export function exportBackup(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `yourcode_backup_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => {
      try {
        const imported = JSON.parse(String(event.target.result))
        resolve({ ...createDefaultState(), ...imported })
      } catch {
        reject(new Error('Invalid JSON backup file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
