// ─────────────────────────────────────────────────────────
//  Code Execution Engine
//  Python via Pyodide (WASM) · JavaScript via Function()
//  100% client-side — no backend or API calls
// ─────────────────────────────────────────────────────────

let pyodideInstance = null;
let pyodideLoading = false;

async function ensurePyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) {
    while (pyodideLoading) {
      await new Promise(r => setTimeout(r, 150));
    }
    return pyodideInstance;
  }
  pyodideLoading = true;

  try {
    if (!window.loadPyodide) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Could not load Pyodide from CDN'));
        document.head.appendChild(s);
      });
    }
    pyodideInstance = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
    });
    return pyodideInstance;
  } finally {
    pyodideLoading = false;
  }
}

export function getPyodideStatus() {
  if (pyodideInstance) return 'ready';
  if (pyodideLoading) return 'loading';
  return 'idle';
}

function compareOutputs(actual, expected, unordered) {
  if (unordered && Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    const aSorted = [...actual].map(x => JSON.stringify(x)).sort();
    const eSorted = [...expected].map(x => JSON.stringify(x)).sort();
    return JSON.stringify(aSorted) === JSON.stringify(eSorted);
  }
  return JSON.stringify(actual) === JSON.stringify(expected);
}

async function runJavaScript(code, fnName, testCases, unordered) {
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const logs = [];
    const customConsole = {
      log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
    };
    const t0 = performance.now();
    try {
      const clonedArgs = JSON.parse(JSON.stringify(tc.args));
      const runner = new Function('console', `${code}\nreturn typeof ${fnName} !== 'undefined' ? ${fnName} : null;`);
      const fn = runner(customConsole);
      if (typeof fn !== 'function') throw new Error(`Function "${fnName}" not found.`);
      const actual = fn(...clonedArgs);
      const dt = Math.max(1, Math.round(performance.now() - t0));
      const passed = tc.expected == null || compareOutputs(actual, tc.expected, unordered || tc.unorderedArray);
      results.push({ index: i + 1, passed, args: tc.args, expected: tc.expected, actual, logs, runtimeMs: dt });
    } catch (err) {
      const dt = Math.max(1, Math.round(performance.now() - t0));
      results.push({ index: i + 1, passed: false, args: tc.args, expected: tc.expected, error: err.message || String(err), logs, runtimeMs: dt });
    }
  }
  return results;
}

async function runPython(code, fnName, testCases, unordered) {
  const py = await ensurePyodide();
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const t0 = performance.now();
    try {
      const pyWrapper = `
import json, io, sys
from typing import *
_stdout = io.StringIO()
sys.stdout = _stdout
${code}
_args = json.loads(${JSON.stringify(JSON.stringify(tc.args))})
if 'Solution' in globals() and hasattr(Solution, '${fnName}'):
    _res = getattr(Solution(), '${fnName}')(*_args)
elif '${fnName}' in globals():
    _res = ${fnName}(*_args)
else:
    raise NameError('Method "${fnName}" not found in Solution')
sys.stdout = sys.__stdout__
json.dumps({"actual": _res, "logs": _stdout.getvalue().splitlines()})
`;
      const rawJson = await py.runPythonAsync(pyWrapper);
      const parsed = JSON.parse(rawJson);
      const dt = Math.max(1, Math.round(performance.now() - t0));
      const passed = tc.expected == null || compareOutputs(parsed.actual, tc.expected, unordered || tc.unorderedArray);
      results.push({ index: i + 1, passed, args: tc.args, expected: tc.expected, actual: parsed.actual, logs: parsed.logs || [], runtimeMs: dt });
    } catch (err) {
      const dt = Math.max(1, Math.round(performance.now() - t0));
      results.push({ index: i + 1, passed: false, args: tc.args, expected: tc.expected, error: err.message || String(err), logs: [], runtimeMs: dt });
    }
  }
  return results;
}

export async function executeCode({ code, language, fnName, testCases, unordered = false }) {
  const start = performance.now();
  const results = language === 'javascript'
    ? await runJavaScript(code, fnName, testCases, unordered)
    : await runPython(code, fnName, testCases, unordered);

  const totalMs = Math.max(1, Math.round(performance.now() - start));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total && total > 0;
  const firstFailed = results.find(r => !r.passed) || null;

  return { results, passed, total, allPassed, firstFailed, totalMs };
}
