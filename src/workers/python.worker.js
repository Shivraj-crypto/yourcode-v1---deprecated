import { loadPyodide } from 'pyodide'

let pyodidePromise

function loadRuntime() {
  if (!pyodidePromise) {
    const indexURL = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href
    pyodidePromise = loadPyodide({ indexURL, jsglobals: {} })
  }
  return pyodidePromise
}

const pythonLiteral = value => JSON.stringify(JSON.stringify(value))

async function runCase(pyodide, code, fnName, args) {
  const globalsFactory = pyodide.globals.get('dict')
  const globals = globalsFactory()
  globalsFactory.destroy()

  const script = `
import contextlib, io, json, traceback

_code = json.loads(${pythonLiteral(code)})
_args = json.loads(${pythonLiteral(args)})
_function_name = json.loads(${pythonLiteral(fnName)})
_stdout = io.StringIO()
_stderr = io.StringIO()
_namespace = {"__name__": "__main__"}
_response = {}

try:
    with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stderr):
        exec(compile(_code, "<solution>", "exec"), _namespace)
        if "Solution" in _namespace and hasattr(_namespace["Solution"], _function_name):
            _actual = getattr(_namespace["Solution"](), _function_name)(*_args)
        elif _function_name in _namespace:
            _actual = _namespace[_function_name](*_args)
        else:
            raise NameError(f"Method '{_function_name}' not found in Solution")
    _response = {"actual": _actual}
except BaseException as _error:
    _response = {
        "error": f"{type(_error).__name__}: {_error}",
        "errorType": type(_error).__name__,
        "traceback": traceback.format_exc(),
    }

_response["logs"] = _stdout.getvalue().splitlines()
_response["stderr"] = _stderr.getvalue().splitlines()
json.dumps(_response, ensure_ascii=False)
`

  try {
    const result = await pyodide.runPythonAsync(script, { globals })
    return JSON.parse(result)
  } finally {
    globals.destroy()
  }
}

self.addEventListener('message', async event => {
  const message = event.data
  if (message?.type !== 'run-python') return

  const { executionId, code, fnName, testCases } = message
  try {
    if (!pyodidePromise) self.postMessage({ type: 'execution-status', executionId, status: 'loading' })
    const pyodide = await loadRuntime()
    self.postMessage({ type: 'execution-status', executionId, status: 'running' })

    const results = []
    for (let index = 0; index < testCases.length; index += 1) {
      const testCase = testCases[index]
      const start = performance.now()
      try {
        const result = await runCase(pyodide, code, fnName, testCase.args ?? [])
        results.push({ ...result, runtimeMs: Math.max(1, Math.round(performance.now() - start)) })
      } catch (error) {
        results.push({
          error: error.message || String(error),
          errorType: 'InternalError',
          logs: [],
          stderr: [],
          runtimeMs: Math.max(1, Math.round(performance.now() - start)),
        })
      }
    }

    self.postMessage({ type: 'execution-result', executionId, results })
  } catch (error) {
    pyodidePromise = undefined
    self.postMessage({
      type: 'execution-error',
      executionId,
      error: error.message || String(error),
    })
  }
})
