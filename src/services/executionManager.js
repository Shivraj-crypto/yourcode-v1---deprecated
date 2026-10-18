let worker
let nextExecutionId = 0
const pendingExecutions = new Map()

function failPendingExecutions(message) {
  for (const pending of pendingExecutions.values()) {
    pending.reject(new Error(message))
  }
  pendingExecutions.clear()
}

function ensureWorker() {
  if (worker) return worker

  worker = new Worker(new URL('../workers/python.worker.js', import.meta.url), { type: 'module' })
  worker.addEventListener('message', event => {
    const message = event.data
    const pending = pendingExecutions.get(message.executionId)
    if (!pending) return

    if (message.type === 'execution-status') {
      pending.onStatus?.(message.status)
    } else if (message.type === 'execution-result') {
      pending.resolve(message.results)
      pendingExecutions.delete(message.executionId)
    } else if (message.type === 'execution-error') {
      pending.reject(new Error(message.error))
      pendingExecutions.delete(message.executionId)
    }
  })

  const onWorkerFailure = event => {
    const message = event.message || 'Python worker failed unexpectedly.'
    worker?.terminate()
    worker = undefined
    failPendingExecutions(message)
  }
  worker.addEventListener('error', onWorkerFailure)
  worker.addEventListener('messageerror', () => onWorkerFailure({ message: 'Could not read the Python worker response.' }))
  return worker
}

export function runPythonInWorker({ code, fnName, testCases, onStatus }) {
  const executionId = `python-${++nextExecutionId}`
  const currentWorker = ensureWorker()

  return new Promise((resolve, reject) => {
    pendingExecutions.set(executionId, { resolve, reject, onStatus })
    try {
      currentWorker.postMessage({ type: 'run-python', executionId, code, fnName, testCases })
    } catch (error) {
      pendingExecutions.delete(executionId)
      reject(error)
    }
  })
}
