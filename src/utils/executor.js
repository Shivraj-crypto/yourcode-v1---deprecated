import { runPythonInWorker } from '../services/executionManager'

function compareOutputs(actual, expected, unordered) {
  if (unordered && Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false
    const actualSorted = [...actual].map(value => JSON.stringify(value)).sort()
    const expectedSorted = [...expected].map(value => JSON.stringify(value)).sort()
    return JSON.stringify(actualSorted) === JSON.stringify(expectedSorted)
  }
  return JSON.stringify(actual) === JSON.stringify(expected)
}

async function runJavaScript(code, fnName, testCases, unordered) {
  const results = []

  for (let index = 0; index < testCases.length; index += 1) {
    const testCase = testCases[index]
    const logs = []
    const customConsole = {
      log: (...values) => logs.push(values.map(value => typeof value === 'object' ? JSON.stringify(value) : String(value)).join(' ')),
    }
    const start = performance.now()
    try {
      const clonedArgs = JSON.parse(JSON.stringify(testCase.args))
      const runner = new Function('console', `${code}\nreturn typeof ${fnName} !== 'undefined' ? ${fnName} : null;`)
      const fn = runner(customConsole)
      if (typeof fn !== 'function') throw new Error(`Function "${fnName}" not found.`)
      const actual = fn(...clonedArgs)
      const runtimeMs = Math.max(1, Math.round(performance.now() - start))
      const passed = testCase.expected == null || compareOutputs(actual, testCase.expected, unordered || testCase.unorderedArray)
      results.push({ index: index + 1, passed, args: testCase.args, expected: testCase.expected, actual, logs, runtimeMs })
    } catch (error) {
      const runtimeMs = Math.max(1, Math.round(performance.now() - start))
      results.push({ index: index + 1, passed: false, args: testCase.args, expected: testCase.expected, error: error.message || String(error), errorType: error.name, logs, runtimeMs })
    }
  }
  return results
}

async function runPython(code, fnName, testCases, unordered, onStatus) {
  const executionResults = await runPythonInWorker({ code, fnName, testCases, onStatus })
  return executionResults.map((result, index) => {
    const testCase = testCases[index]
    const passed = !result.error && (testCase.expected == null || compareOutputs(result.actual, testCase.expected, unordered || testCase.unorderedArray))
    return {
      ...result,
      index: index + 1,
      passed,
      args: testCase.args,
      expected: testCase.expected,
    }
  })
}

export async function executeCode({ code, language, fnName, testCases, unordered = false, onStatus }) {
  const start = performance.now()
  const results = language === 'javascript'
    ? await runJavaScript(code, fnName, testCases, unordered)
    : await runPython(code, fnName, testCases, unordered, onStatus)

  const totalMs = Math.max(1, Math.round(performance.now() - start))
  const passed = results.filter(result => result.passed).length
  const total = results.length
  const allPassed = passed === total && total > 0
  const firstFailed = results.find(result => !result.passed) || null

  return { results, passed, total, allPassed, firstFailed, totalMs }
}
