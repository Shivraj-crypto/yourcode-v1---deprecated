import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { faAmazon, faApple, faGoogle, faMeta, faTiktok, faUber } from '@fortawesome/free-brands-svg-icons'
import { siAutodesk, siGoldmansachs, siNetflix } from 'simple-icons'
import { COMPANY_LIST, DEFAULT_PROBLEMS, getProblemCompanies } from './data/problems'
import { useTimer, useToast } from './hooks/useToast'
import { executeCode } from './utils/executor'
import { createDefaultState, exportBackup, importBackup, loadState, resetState, saveState } from './utils/storage'
import { highlightCode as highlightSolution } from './utils/highlighter'
import './Platform.css'

const json = value => JSON.stringify(value, null, 2)
const formatTime = value => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
const formatInput = (args, names = []) => args.map((value, index) => `${names[index] || `arg${index + 1}`} =\n${JSON.stringify(value)}`).join('\n')
const formatOutput = value => typeof value === 'string' ? value : JSON.stringify(value) ?? String(value)
const COMPANY_BRANDS = {
  Amazon: { fontAwesome: faAmazon, color: '#ff9900' },
  Google: { fontAwesome: faGoogle, color: '#4285f4' },
  Meta: { fontAwesome: faMeta, color: '#0866ff' },
  Microsoft: { custom: 'microsoft' },
  Apple: { fontAwesome: faApple, color: '#f4f4f4' },
  'Goldman Sachs': { simpleIcon: siGoldmansachs, color: '#75aadb' },
  Bloomberg: { custom: 'bloomberg' },
  Uber: { fontAwesome: faUber, color: '#f4f4f4' },
  Netflix: { simpleIcon: siNetflix, color: '#e50914' },
  Adobe: { custom: 'adobe' },
  TikTok: { fontAwesome: faTiktok, color: '#25f4ee' },
  'Capital One': { custom: 'capital-one' },
  Autodesk: { simpleIcon: siAutodesk, color: '#0696d7' },
  'Scale AI': { custom: 'scale-ai' },
}
const CompanyLogo = ({ name }) => {
  const brand = COMPANY_BRANDS[name]
  const svgColor = brand?.color || '#b8b8b8'
  if (brand?.fontAwesome) {
    const [width, height, , , paths] = brand.fontAwesome.icon
    return <span className="company-logo" title={`${name} logo`}><svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`}><path fill={svgColor} d={Array.isArray(paths) ? paths.join(' ') : paths} /></svg></span>
  }
  if (brand?.simpleIcon) return <span className="company-logo" title={`${name} logo`}><svg aria-hidden="true" viewBox="0 0 24 24"><path fill={svgColor} d={brand.simpleIcon.path} /></svg></span>
  return <span className="company-logo" title={`${name} logo`}><svg aria-hidden="true" viewBox="0 0 24 24">{brand?.custom === 'microsoft' ? <><path fill="#f25022" d="M1 1h10v10H1z" /><path fill="#7fba00" d="M13 1h10v10H13z" /><path fill="#00a4ef" d="M1 13h10v10H1z" /><path fill="#ffb900" d="M13 13h10v10H13z" /></> : brand?.custom === 'adobe' ? <path fill="#ed1c24" fillRule="evenodd" d="M2 22 9.2 2h5.6L22 22h-5.4L12 9.6 7.4 22H2Zm7.2-4h5.6L12 10.5 9.2 18Z" /> : brand?.custom === 'capital-one' ? <><path fill="none" stroke="#0052a4" strokeLinecap="round" strokeWidth="3" d="M18.5 8.5A8 8 0 1 0 19 16" /><path fill="none" stroke="#0052a4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M7 6.5c4.8-3.7 10.7-4.2 15-2.5l-2.2 4.1" /></> : brand?.custom === 'bloomberg' ? <text fill="#f4f4f4" x="3" y="21" fontFamily="Arial,sans-serif" fontSize="21" fontWeight="700">B</text> : <text fill="#a78bfa" x="3" y="21" fontFamily="Arial,sans-serif" fontSize="21" fontWeight="700">S</text>}</svg></span>
}

const configureMonacoTheme = monaco => monaco.editor.defineTheme('yourcode-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#262626',
    'editorGutter.background': '#262626',
    'editorLineNumber.foreground': '#737373',
    'editorLineNumber.activeForeground': '#c6c6c6',
    'editor.lineHighlightBackground': '#2c2c2c',
    'editor.selectionBackground': '#3a608566',
    'editorCursor.foreground': '#f4f4f4',
    'editorWidget.background': '#303030',
    'editorSuggestWidget.background': '#303030',
    'editorSuggestWidget.border': '#454545',
  },
})

export default function Platform() {
  const [state, setState] = useState(createDefaultState)
  const [storageReady, setStorageReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [view, setView] = useState('home')
  const [tab, setTab] = useState('Description')
  const highlightCode = tab === 'Solutions' ? highlightSolution : () => ''
  const [bottomTab, setBottomTab] = useState('Test Result')
  const [language, setLanguage] = useState(state.language || 'python')
  const [code, setCode] = useState('')
  const [results, setResults] = useState(null)
  const [activeCase, setActiveCase] = useState(0)
  const [company, setCompany] = useState('all')
  const [selectedHomeCompany, setSelectedHomeCompany] = useState(COMPANY_LIST[0] || 'Amazon')
  const [homeSearch, setHomeSearch] = useState('')
  const [companyPractice, setCompanyPractice] = useState(null)
  const [difficulty, setDifficulty] = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [hint, setHint] = useState(false)
  const [modal, setModal] = useState(null)
  const [bookmark, setBookmark] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [wordWrap, setWordWrap] = useState(false)
  const [customCases, setCustomCases] = useState({})
  const [busy, setBusy] = useState(false)
  const [runError, setRunError] = useState('')
  const [executionStatus, setExecutionStatus] = useState('idle')
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 })
  const [seenAnswer, setSeenAnswer] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})
  const backupInput = useRef(null)
  const editorCursorListener = useRef(null)
  const problems = useMemo(() => [...DEFAULT_PROBLEMS, ...(state.customProblems || [])], [state.customProblems])
  const problem = problems.find(item => item.id === state.currentProblemId) || problems[0]
  const testCases = [...(problem.testCases || []), ...(customCases[problem.id] || [])]
  const companies = getProblemCompanies(problem)
  const selectedCompanyProblems = problems.filter(item => getProblemCompanies(item).includes(selectedHomeCompany)).sort((first, second) => first.number - second.number)
  const selectedCompanySolved = selectedCompanyProblems.filter(item => state.statusByProblem?.[item.id] === 'Solved').length
  const visibleHomeCompanies = COMPANY_LIST.filter(item => item.toLowerCase().includes(homeSearch.toLowerCase()))
  const totalSolved = problems.filter(item => state.statusByProblem?.[item.id] === 'Solved').length
  const { seconds: timerSeconds, running: timerRunning, toggle: toggleTimer, reset: resetTimer, restore: restoreTimer, formatted: formattedTime } = useTimer()
  const { toast, showToast } = useToast()

  useEffect(() => () => editorCursorListener.current?.dispose(), [])

  useEffect(() => {
    let active = true
    loadState().then(loaded => {
      if (!active) return
      setState(loaded)
      setLanguage(loaded.language || 'python')
      setStorageReady(true)
    }).catch(error => {
      if (!active) return
      console.error('Could not open local SQLite storage:', error)
      setStorageError(error.message || 'Could not open local SQLite storage')
      setStorageReady(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (storageReady) restoreTimer(state.activeSession?.elapsedSeconds || 0, state.activeSession?.running)
  }, [storageReady, state.activeSession?.elapsedSeconds, state.activeSession?.running, restoreTimer])

  useEffect(() => {
    if (!storageReady) return
    const key = `${problem.id}__${language}`
    setCode(state.userCode?.[key] ?? '')
    setBookmark(Boolean(state.bookmarks?.[problem.id]))
    setResults(null)
    setRunError('')
    setActiveCase(0)
  }, [problem.id, language, storageReady, state.bookmarks, state.userCode])

  useEffect(() => {
    if (!storageReady) return
    saveState({ ...state, language, activeSession: { ...state.activeSession, elapsedSeconds: timerSeconds, running: timerRunning } }).catch(error => setStorageError(error.message || 'Could not save local SQLite data'))
  }, [state, language, timerSeconds, timerRunning, storageReady])

  useEffect(() => {
    const onKeyDown = event => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Enter') {
        event.preventDefault()
        run(true)
      }
      else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        run(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const patch = change => setState(current => ({ ...current, ...change }))
  const notify = message => showToast(message)
  const updateCode = value => {
    setCode(value)
    patch({ userCode: { ...state.userCode, [`${problem.id}__${language}`]: value } })
  }
  const moveProblem = direction => {
    const index = problems.findIndex(item => item.id === problem.id)
    const next = direction === 'random' ? Math.floor(Math.random() * problems.length) : (index + direction + problems.length) % problems.length
    patch({ currentProblemId: problems[next].id })
  }
  const openProblem = problemId => {
    setCompanyPractice(null)
    patch({ currentProblemId: problemId })
    setView('workspace')
    setTab('Description')
    setBottomTab('Testcase')
  }
  const startCompanyPractice = companyName => {
    const queue = problems.filter(item => getProblemCompanies(item).includes(companyName)).sort((first, second) => first.number - second.number)
    if (!queue.length) {
      notify(`No questions are tagged for ${companyName} yet`)
      return
    }
    const firstUnsolved = queue.findIndex(item => state.statusByProblem?.[item.id] !== 'Solved')
    const index = firstUnsolved < 0 ? 0 : firstUnsolved
    setCompanyPractice({ company: companyName, problemIds: queue.map(item => item.id), index })
    setSelectedHomeCompany(companyName)
    patch({ currentProblemId: queue[index].id })
    setView('workspace')
    setTab('Description')
    setBottomTab('Testcase')
  }
  const advanceCompanyPractice = () => {
    if (!companyPractice) return
    const nextIndex = companyPractice.index + 1
    if (nextIndex >= companyPractice.problemIds.length) {
      const companyName = companyPractice.company
      setCompanyPractice(null)
      setSelectedHomeCompany(companyName)
      setView('home')
      notify(`${companyName} practice set complete`)
      return
    }
    setCompanyPractice(current => ({ ...current, index: nextIndex }))
    patch({ currentProblemId: companyPractice.problemIds[nextIndex] })
    setTab('Description')
    setBottomTab('Testcase')
  }
  const run = async submit => {
    setBottomTab('Test Result')
    setBusy(true)
    setExecutionStatus(language === 'python' ? 'loading' : 'running')
    setRunError('')
    try {
      const outcome = await executeCode({ code, language, fnName: problem.fnName, testCases, unordered: problem.id === 'generate-parentheses', onStatus: setExecutionStatus })
      setResults(outcome)
      if (submit) {
        patch({
          statusByProblem: { ...state.statusByProblem, [problem.id]: outcome.allPassed ? 'Solved' : 'Attempted' },
          activeSession: outcome.allPassed ? { ...state.activeSession, solvedInSession: [...new Set([...(state.activeSession?.solvedInSession || []), problem.id])] } : state.activeSession,
          submissions: {
            ...state.submissions,
            [problem.id]: [{ status: outcome.allPassed ? 'Accepted' : 'Wrong Answer', language, passed: outcome.passed, total: outcome.total, runtimeMs: outcome.totalMs, timestamp: new Date().toLocaleString(), code }, ...(state.submissions?.[problem.id] || [])]
          }
        })
      }
      notify(`${outcome.allPassed ? 'Accepted' : 'Wrong answer'} · ${outcome.passed}/${outcome.total}`)
    } catch (error) {
      const message = error.message || 'Could not run code'
      setExecutionStatus('error')
      setRunError(message)
      notify(message)
    } finally {
      setBusy(false)
      setExecutionStatus(current => current === 'error' ? current : 'ready')
    }
  }
  const filtered = problems.filter(item => {
    const matchesStatus = statusFilter === 'all' || (state.statusByProblem?.[item.id] || 'Unsolved') === statusFilter
    return matchesStatus && (company === 'all' || getProblemCompanies(item).includes(company)) && (difficulty === 'all' || item.difficulty === difficulty) && `${item.title} ${item.topic}`.toLowerCase().includes(search.toLowerCase())
  })
  const resetCode = () => updateCode('')
  const copySolutionToEditor = () => updateCode(problem.starterCode?.[language] || '')
  const startSession = () => {
    resetTimer()
    toggleTimer()
    patch({ activeSession: { running: true, elapsedSeconds: 0, startedAt: new Date().toISOString(), solvedInSession: [] } })
    notify('Practice session started')
  }
  const saveSession = () => {
    const active = state.activeSession || {}
    const startedAt = active.startedAt ? new Date(active.startedAt) : new Date(Date.now() - timerSeconds * 1000)
    const session = { id: Date.now(), title: `Practice · ${startedAt.toLocaleDateString()}`, durationMinutes: Math.max(1, Math.round(timerSeconds / 60)), problemsSolved: active.solvedInSession?.length || 0, date: startedAt.toISOString() }
    patch({ sessions: [session, ...(state.sessions || [])], activeSession: { running: false, elapsedSeconds: 0, startedAt: null, solvedInSession: [] } })
    resetTimer()
    notify('Practice session saved')
  }
  const restoreBackup = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const restored = await importBackup(file)
      setState(restored)
      setLanguage(restored.language || 'python')
      notify('Workspace restored from backup')
    } catch (error) {
      notify(error.message || 'Could not restore backup')
    }
    event.target.value = ''
  }
  const handleEditorMount = editor => {
    editorCursorListener.current?.dispose()
    editorCursorListener.current = editor.onDidChangeCursorPosition(({ position }) => setCursorPosition(position))
    const position = editor.getPosition()
    if (position) setCursorPosition(position)
  }
  const addTestCase = () => {
    const initial = problem.testCases?.[0] || { args: [], expected: null }
    setCustomCases(current => ({ ...current, [problem.id]: [...(current[problem.id] || []), { args: initial.args, expected: null }] }))
    setBottomTab('Testcase')
    setActiveCase(testCases.length)
    notify('Custom testcase added')
  }

  const handleEditorKeyDown = event => {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const textarea = event.currentTarget
    const { selectionStart, selectionEnd } = textarea
    const nextCode = `${code.slice(0, selectionStart)}    ${code.slice(selectionEnd)}`
    updateCode(nextCode)
    requestAnimationFrame(() => textarea.setSelectionRange(selectionStart + 4, selectionStart + 4))
  }

  const header = <header className="platform-header">
    <div className="brand-area">
      <button className="brand" onClick={() => setView('home')}>Your<span>Code</span></button>
      <span className="header-divider" />
      <button className="header-link" onClick={() => setView('home')}>⌂ <span>Home</span></button>
      <button className="header-link" onClick={() => setView('problems')}>☷ <span>Problems</span></button>
      {!companyPractice && <><button className="icon-button" aria-label="Previous problem" title="Previous problem" onClick={() => moveProblem(-1)}>‹</button><button className="icon-button" aria-label="Next problem" title="Next problem" onClick={() => moveProblem(1)}>›</button><button className="icon-button" aria-label="Random problem" title="Random problem" onClick={() => moveProblem('random')}>⤨</button></>}
      <span className="problem-crumb">{problem.number}. {problem.title}</span>
    </div>
    <div className="header-actions">
      {view === 'workspace' && <><button className="run-button" onClick={() => run(false)} disabled={busy}>▶ <span>{busy ? 'Running…' : 'Run'}</span><kbd>Ctrl ↵</kbd></button><button className="submit-button" onClick={() => run(true)} disabled={busy}>⇧ <span>Submit</span></button></>}
      <button className="header-link sessions-link" onClick={() => setView('sessions')}>Sessions <b>{state.sessions?.length || 0}</b></button>
      <div className="timer-pill"><i className={timerRunning ? 'live' : ''} /><button aria-label={timerRunning ? 'Pause timer' : 'Start timer'} onClick={toggleTimer}>{timerRunning ? 'Ⅱ' : '▶'}</button><b>{formattedTime}</b><button aria-label="Reset timer" onClick={resetTimer}>↻</button></div>
      <button className="avatar" title="YourCode profile">Y</button>
    </div>
  </header>

  const toggleSection = section => setExpandedSections(current => ({ ...current, [section]: !current[section] }))
  const description = <div className="description">
    <div className="problem-title"><div><div className="problem-number">Problem {problem.number}</div><h1>{problem.title}</h1></div><button className={`bookmark-button ${bookmark ? 'saved' : ''}`} title={bookmark ? 'Remove bookmark' : 'Bookmark problem'} onClick={() => { const next = !bookmark; setBookmark(next); patch({ bookmarks: { ...state.bookmarks, [problem.id]: next } }) }}>{bookmark ? '★' : '☆'}</button></div>
    <div className="problem-meta"><span className={`difficulty ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span><span>·</span><span>{problem.topic}</span><span>·</span><span>Acceptance 62.4%</span></div>
    <div className="pills"><button onClick={() => setHint(value => !value)}>💡 Hint</button>{companies.map(item => <button key={item} onClick={() => { setCompany(item); setView('problems') }}><CompanyLogo name={item} />{item}</button>)}</div>
    {hint && <div className="hint-box"><b>Hint</b><div>{problem.hint}</div></div>}
    <div className="rich-copy" dangerouslySetInnerHTML={{ __html: problem.description }} />
    <div className="examples">{(problem.examples || []).map((example, index) => <div className="example" key={index}><b>Example {index + 1}</b><div><strong>Input:</strong> {example.input}</div><div><strong>Output:</strong> {example.output}</div>{example.explanation && <div><strong>Explanation:</strong> {example.explanation}</div>}</div>)}</div>
    <h3>Constraints</h3><ul>{(problem.constraints || []).map(item => <li key={item}><code>{item}</code></li>)}</ul>
    <div className="question-feedback"><span>Seen this question in a real interview before?</span><div><button className={seenAnswer === true ? 'selected' : ''} onClick={() => setSeenAnswer(true)}>Yes</button><button className={seenAnswer === false ? 'selected' : ''} onClick={() => setSeenAnswer(false)}>No</button><b>{state.submissions?.[problem.id]?.length || 0}/6</b></div><div className="local-metrics"><span>Local runs <b>{state.submissions?.[problem.id]?.length || 0}</b></span><span>CPU <b>Browser</b></span><span>Data <b>Local</b></span></div></div>
    <div className="problem-accordions">{['Topics', 'Companies', 'Similar Questions', 'Discussion'].map(section => <div className="accordion" key={section}><button onClick={() => toggleSection(section)}><span>{section === 'Topics' ? '#' : section === 'Companies' ? '@' : section === 'Discussion' ? '?' : '='}</span>{section}{section === 'Discussion' ? ' (0)' : ''}<b>{expandedSections[section] ? '^' : 'v'}</b></button>{expandedSections[section] && <div className="accordion-content">{section === 'Topics' ? problem.topic : section === 'Companies' ? <div className="company-list">{companies.length ? companies.map(item => <span className="company-tag" key={item}><CompanyLogo name={item} />{item}</span>) : 'No company tags yet.'}</div> : section === 'Similar Questions' ? problems.filter(item => item.id !== problem.id && item.topic === problem.topic).slice(0, 4).map(item => <button key={item.id} onClick={() => patch({ currentProblemId: item.id })}>{item.number}. {item.title}</button>) : 'Discussions are stored locally in this version.'}</div>}</div>)}</div>
    <div className="copyright">Copyright © 2026 YourCode. Open source.</div>
  </div>

  const activeResult = results?.results?.[activeCase]
  const verdict = results?.allPassed ? 'Accepted' : results?.firstFailed?.error ? (results.firstFailed.errorType === 'SyntaxError' ? 'Syntax Error' : 'Runtime Error') : 'Wrong Answer'
  const executionStatusLabel = language === 'python'
    ? ({ idle: 'Python loads on first run', loading: 'Loading Python runtime…', running: 'Running Python…', ready: 'Python ready', error: 'Python runtime error' }[executionStatus] || 'Python ready')
    : ({ running: 'Running JavaScript…', error: 'JavaScript error' }[executionStatus] || 'JavaScript ready')
  const resultPanel = runError ? <div className="execution-error"><b>Execution failed</b><p>{runError}</p>{language === 'python' && <small>Python runs locally in a Web Worker. Refresh if the runtime assets could not load.</small>}</div> : results ? <div className="results">
    <div className="verdict-inline"><b className={results.allPassed ? 'green' : 'red'}>{verdict}</b><span>Runtime: {results.totalMs} ms</span></div>
    <div className="result-summary"><span className={`result-icon ${results.allPassed ? 'pass' : 'fail'}`}>{results.allPassed ? '✓' : '×'}</span><div><b className={results.allPassed ? 'green' : 'red'}>{results.allPassed ? 'Accepted' : 'Wrong Answer'}</b><small>{results.passed}/{results.total} testcases passed · {results.totalMs} ms</small></div></div>
    <div className="case-tabs">{results.results.map((item, index) => <button className={`${activeCase === index ? 'active' : ''} ${item.passed ? 'case-pass' : 'case-fail'}`} onClick={() => setActiveCase(index)} key={item.index}><i /> Case {item.index}</button>)}</div>
    {activeResult && <div className="result-case-detail"><div><b>Input</b><pre>{formatInput(activeResult.args, problem.paramNames)}</pre></div><div><b>Output</b><pre className={activeResult.passed ? 'output-pass' : 'output-fail'}>{formatOutput(activeResult.error || activeResult.actual)}</pre></div><div><b>Expected</b><pre className="output-pass">{formatOutput(activeResult.expected)}</pre></div>{activeResult.logs?.length > 0 && <div><b>Stdout</b><pre>{activeResult.logs.join('\n')}</pre></div>}{activeResult.stderr?.length > 0 && <div><b>Stderr</b><pre className="output-fail">{activeResult.stderr.join('\n')}</pre></div>}{activeResult.traceback && <details className="execution-traceback"><summary>Show traceback</summary><pre>{activeResult.traceback}</pre></details>}</div>}
    <button className="contribute-case" onClick={addTestCase}>&#9825; Contribute a testcase</button>
    {activeResult && <div className="case-detail"><div><b>Input</b><pre>{json(activeResult.args)}</pre></div><div><b>Output</b><pre>{json(activeResult.error || activeResult.actual)}</pre></div><div><b>Expected</b><pre>{json(activeResult.expected)}</pre></div></div>}
  </div> : <div className="empty result-empty"><span>▷</span><b>Run your code to see results</b><small>Use the Run button or press Ctrl + Enter</small></div>

  const workspace = <div className="workspace-shell">{companyPractice && <div className="company-practice-bar"><div className="practice-brand"><CompanyLogo name={companyPractice.company} /><span><small>COMPANY PRACTICE</small><b>{companyPractice.company}</b></span></div><span className="practice-progress">Question {companyPractice.index + 1} of {companyPractice.problemIds.length} <i>·</i> {companyPractice.problemIds.filter(id => state.statusByProblem?.[id] === 'Solved').length} solved</span><div className="practice-actions"><button className="orange-button" onClick={advanceCompanyPractice} disabled={state.statusByProblem?.[problem.id] !== 'Solved' || busy}>{companyPractice.index === companyPractice.problemIds.length - 1 ? 'Finish set' : 'Next question →'}</button><button className="secondary-button" onClick={() => { setCompanyPractice(null); setView('home') }}>Exit practice</button></div></div>}<main className="workspace">
    <section className="panel left-panel">
      <nav className="tabs problem-tabs">{['Description', 'Editorial & Notes', 'Solutions', 'Submissions'].map(item => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav>
      {tab === 'Description' && description}
      {tab === 'Editorial & Notes' && <div className="notes"><div className="hint-box"><b>Approach hint</b><div>{problem.hint}</div></div><label className="field-label">Your notes<textarea value={state.notes?.[problem.id] || ''} onChange={event => patch({ notes: { ...state.notes, [problem.id]: event.target.value } })} placeholder="Write your intuition, complexity, and review notes…" /></label></div>}
      {tab === 'Solutions' && <div className="solution"><div className="solution-heading"><b>Starter solution</b><button onClick={copySolutionToEditor}>Copy to editor</button></div><pre dangerouslySetInnerHTML={{ __html: highlightCode(problem.starterCode?.[language] || '', language) }} /></div>}
      {tab === 'Submissions' && <div className="submissions"><h3>Submission history</h3>{(state.submissions?.[problem.id] || []).length ? state.submissions[problem.id].map((item, index) => <article className="submission-entry" key={`${item.timestamp}-${index}`}><div className="submission-summary"><b className={item.status === 'Accepted' ? 'green' : 'red'}>{item.status}</b><span>{item.language} · {item.passed}/{item.total} · {item.runtimeMs} ms <small>{item.timestamp}</small></span></div><details className="submission-code"><summary>View submitted code</summary><pre><code>{item.code || '(No code was saved for this submission.)'}</code></pre></details></article>) : <div className="empty">No submissions yet.</div>}</div>}
      <footer className="panel-footer"><button onClick={() => { const next = !bookmark; setBookmark(next); patch({ bookmarks: { ...state.bookmarks, [problem.id]: next } }) }}>{bookmark ? '★ Bookmarked' : '☆ Bookmark'}</button><span>{state.statusByProblem?.[problem.id] || 'Not started'}</span></footer>
    </section>
    <section className="right-column">
      <div className="panel editor">
        <div className="monaco-editor-body"><Editor className="monaco-editor-shell" width="100%" height="100%" language={language} theme="yourcode-dark" value={code} onChange={value => updateCode(value ?? '')} beforeMount={configureMonacoTheme} onMount={handleEditorMount} loading={<div className="editor-loading">Loading editor...</div>} options={{ fontSize, fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace", lineNumbers: 'on', minimap: { enabled: false }, automaticLayout: true, autoIndent: 'full', tabSize: 4, insertSpaces: true, wordWrap: wordWrap ? 'on' : 'off', scrollBeyondLastLine: false, smoothScrolling: true, renderLineHighlight: 'line', bracketPairColorization: { enabled: true }, quickSuggestions: true, suggestOnTriggerCharacters: true, tabCompletion: 'on', padding: { top: 13, bottom: 12 } }} /></div>
        <div className="execution-status-overlay"><i className={executionStatus} />{executionStatusLabel}</div>
        <div className="editor-cursor-overlay">Ln {cursorPosition.lineNumber}, Col {cursorPosition.column} &middot; {wordWrap ? 'Wrap: on' : 'Wrap: off'}</div>
        <div className="editor-head"><div className="editor-title"><span className="code-mark">&lt;/&gt;</span><b>Code</b><span className="saved-indicator">{storageError ? '● SQLite unavailable' : '● SQLite · local'}</span></div><div className="editor-tools"><select aria-label="Programming language" value={language} onChange={event => { setLanguage(event.target.value); patch({ language: event.target.value }) }}><option value="python">Python3</option><option value="javascript">JavaScript</option></select><span className="tool-divider" /><button title="Decrease font size" onClick={() => setFontSize(size => Math.max(11, size - 1))}>A−</button><button title="Increase font size" onClick={() => setFontSize(size => Math.min(20, size + 1))}>A+</button><button className={wordWrap ? 'tool-active' : ''} title="Toggle word wrap" onClick={() => setWordWrap(value => !value)}>↵</button><button title="Reset code" onClick={resetCode}>⟲</button></div></div>
        <div className="editor-body" style={{ '--editor-font-size': `${fontSize}px` }}><div className="gutter">{code.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div><div className={`code-editor ${wordWrap ? 'word-wrap' : ''}`}><pre aria-hidden="true" dangerouslySetInnerHTML={{ __html: `${highlightCode(code, language)}\n` }} /><textarea aria-label="Code editor" value={code} onChange={event => updateCode(event.target.value)} onKeyDown={handleEditorKeyDown} spellCheck="false" autoCapitalize="off" autoComplete="off" autoCorrect="off" /></div></div>
        <div className="editor-status"><span>{language === 'python' ? 'Python 3' : 'JavaScript'} <i>•</i> UTF-8</span><span>Ln {code.split('\n').length}, Col 1 <i>•</i> {wordWrap ? 'Wrap: on' : 'Wrap: off'}</span></div>
      </div>
      <div className="panel tests">
        <nav className="tabs test-tabs"><button className={bottomTab === 'Testcase' ? 'active' : ''} onClick={() => setBottomTab('Testcase')}>▣ Testcase</button><button className={bottomTab === 'Test Result' ? 'active' : ''} onClick={() => setBottomTab('Test Result')}>⌁ Test Result {results && <span className={`tab-dot ${results.allPassed ? 'pass' : 'fail'}`} />}</button><button className="add-test" onClick={addTestCase}>＋ Add testcase</button></nav>
        {bottomTab === 'Testcase' ? <div className="testcase"><div className="case-tabs">{testCases.map((item, index) => <button className={activeCase === index ? 'active' : ''} onClick={() => setActiveCase(index)} key={index}>Case {index + 1}{index >= (problem.testCases || []).length ? ' · Custom' : ''}</button>)}</div>{testCases[activeCase] && <div className="case-detail"><div><b>Input</b><pre>{json(testCases[activeCase].args)}</pre></div><div><b>Expected</b><pre>{json(testCases[activeCase].expected)}</pre></div></div>}</div> : resultPanel}
      </div>
    </section>
  </main></div>

  const homeView = (
    <section className="full-view home-view">
      <header className="home-hero">
        <div className="home-hero-copy">
          <span className="home-kicker"><i /> COMPANY-WISE INTERVIEW PREP</span>
          <h1>Pick your target.<br /><em>Build your edge.</em></h1>
          <p>Explore real practice sets by company, then solve each question in sequence at your own pace.</p>
          <div className="home-hero-actions"><button className="orange-button" onClick={() => startCompanyPractice(selectedHomeCompany)}>Start {selectedHomeCompany} practice <span>→</span></button><button className="home-resume-button" onClick={() => openProblem(problem.id)}>Resume {problem.number}. {problem.title}</button></div>
        </div>
        <div className="home-hero-stats"><div><small>PROBLEMS SOLVED</small><b>{totalSolved}<span> / {problems.length}</span></b><i style={{ width: `${problems.length ? totalSolved / problems.length * 100 : 0}%` }} /></div><div><small>COMPANIES</small><b>{COMPANY_LIST.length}</b></div><div><small>SUBMISSIONS</small><b>{Object.values(state.submissions || {}).flat().length}</b></div></div>
      </header>
      <div className="home-layout">
        <section className="home-company-panel">
          <div className="home-section-heading"><div><span className="home-kicker-small">BROWSE THE BANK</span><h2>Choose a company</h2><p>Select a company to view its questions and progress.</p></div><span className="home-company-count">{COMPANY_LIST.length} available</span></div>
          <label className="home-company-search"><span>⌕</span><input aria-label="Search companies" value={homeSearch} onChange={event => setHomeSearch(event.target.value)} placeholder="Search companies" /></label>
          <div className="home-company-grid">{visibleHomeCompanies.map(companyName => { const companyQuestions = problems.filter(item => getProblemCompanies(item).includes(companyName)); const solvedCount = companyQuestions.filter(item => state.statusByProblem?.[item.id] === 'Solved').length; return <button className={`home-company-card ${selectedHomeCompany === companyName ? 'selected' : ''}`} key={companyName} onClick={() => setSelectedHomeCompany(companyName)} aria-pressed={selectedHomeCompany === companyName}><CompanyLogo name={companyName} /><span><b>{companyName}</b><small>{companyQuestions.length} questions <i>·</i> {solvedCount} solved</small></span><span className="company-card-arrow">→</span></button>})}{!visibleHomeCompanies.length && <div className="home-no-companies">No companies match “{homeSearch}”.</div>}</div>
        </section>
        <section className="home-detail-panel">
          <div className="home-detail-heading"><div className="home-company-title"><CompanyLogo name={selectedHomeCompany} /><div><div className="eyebrow">COMPANY QUESTION SET</div><h2>{selectedHomeCompany}</h2><p>{selectedCompanyProblems.length} curated questions <i>·</i> {selectedCompanySolved} solved</p></div></div><div className="home-detail-actions"><button className="orange-button" onClick={() => startCompanyPractice(selectedHomeCompany)}>{selectedCompanySolved === selectedCompanyProblems.length && selectedCompanyProblems.length ? 'Review set →' : 'Start practice →'}</button><button className="secondary-button" onClick={() => { setCompany(selectedHomeCompany); setSearch(''); setDifficulty('all'); setStatusFilter('all'); setView('problems') }}>Full list</button></div></div>
          <div className="home-progress"><div><span>Set progress</span><b>{selectedCompanySolved} / {selectedCompanyProblems.length} solved <i>{selectedCompanyProblems.length ? Math.round(selectedCompanySolved / selectedCompanyProblems.length * 100) : 0}%</i></b></div><div className="home-progress-track"><i style={{ width: `${selectedCompanyProblems.length ? selectedCompanySolved / selectedCompanyProblems.length * 100 : 0}%` }} /></div></div>
          <div className="home-question-list">{selectedCompanyProblems.length ? selectedCompanyProblems.map(item => { const status = state.statusByProblem?.[item.id] || 'Unsolved'; return <button className="home-question-row" key={item.id} onClick={() => openProblem(item.id)}><span className={`status-dot ${status.toLowerCase()}`} /><span className="home-question-number">{String(item.number).padStart(2, '0')}</span><span className="home-question-copy"><b>{item.title}</b><small>{item.topic}</small></span><span className={`difficulty ${item.difficulty.toLowerCase()}`}>{item.difficulty}</span><span className="home-question-status">{status}</span><span className="home-question-arrow">→</span></button>}) : <div className="empty">No questions for this company yet.</div>}</div>
        </section>
      </div>
    </section>
  )

  const problemsView = <section className="full-view"><div className="view-heading"><div><div className="eyebrow">YOUR PRACTICE SPACE</div><h2>Problems</h2><p>Pick up where you left off or find your next challenge.</p></div><button className="orange-button" onClick={() => setModal('problem')}>＋ Create problem</button></div><div className="problem-stats"><div><small>Total</small><b>{problems.length}</b></div><div><small>Solved</small><b className="green">{problems.filter(item => state.statusByProblem?.[item.id] === 'Solved').length}</b></div><div><small>Attempted</small><b>{problems.filter(item => state.statusByProblem?.[item.id] === 'Attempted').length}</b></div><div><small>Bookmarked</small><b>{Object.values(state.bookmarks || {}).filter(Boolean).length}</b></div></div><div className="filters"><label className="search-field">⌕ <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by title or topic…" /></label><select aria-label="Company filter" value={company} onChange={event => setCompany(event.target.value)}><option value="all">All companies</option>{COMPANY_LIST.map(item => <option key={item}>{item}</option>)}</select><select aria-label="Difficulty filter" value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="all">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option></select><select aria-label="Status filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All status</option><option>Unsolved</option><option>Attempted</option><option>Solved</option></select></div><div className="problem-table"><table><thead><tr><th>Status</th><th>Title</th><th>Difficulty</th><th>Companies</th><th>Topic</th><th /></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><span className={`status-dot ${(state.statusByProblem?.[item.id] || '').toLowerCase()}`} />{state.statusByProblem?.[item.id] || 'Unsolved'}</td><td><b>{item.number}. {item.title}</b>{state.bookmarks?.[item.id] && <span className="row-bookmark"> ★</span>}</td><td><span className={`difficulty ${item.difficulty.toLowerCase()}`}>{item.difficulty}</span></td><td><div className="company-list">{getProblemCompanies(item).slice(0, 3).map(name => <span className="company-tag" key={name} title={name}><CompanyLogo name={name} />{name}</span>)}{getProblemCompanies(item).length > 3 && <span className="company-more">+{getProblemCompanies(item).length - 3}</span>}{!getProblemCompanies(item).length && '—'}</div></td><td>{item.topic}</td><td><button onClick={() => openProblem(item.id)}>Solve →</button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">No problems match these filters.</div>}</div></section>

  const sessionsView = <section className="full-view"><div className="view-heading"><div><div className="eyebrow">YOUR PROGRESS</div><h2>Sessions & Data</h2><p>Your practice history and locally saved workspace.</p></div><div className="session-actions">{timerRunning ? <button className="orange-button" onClick={saveSession}>■ Finish session · {formattedTime}</button> : <button className="orange-button" onClick={startSession}>▶ Start practice session</button>}<button className="secondary-button" onClick={() => setView('workspace')}>← Workspace</button></div></div><div className="stats"><div>Solved<strong>{problems.filter(item => state.statusByProblem?.[item.id] === 'Solved').length}</strong></div><div>Sessions<strong>{state.sessions?.length || 0}</strong></div><div>Submissions<strong>{Object.values(state.submissions || {}).flat().length}</strong></div><div>Storage<strong className="green">SQLite · local</strong></div></div><div className="session-grid"><div className="session-log"><h3>Practice sessions</h3>{state.sessions?.length ? state.sessions.map(item => <div className="session" key={item.id}><span>{item.title}<small>{item.durationMinutes} min · {item.problemsSolved} solved</small></span><button onClick={() => patch({ sessions: state.sessions.filter(session => session.id !== item.id) })}>Delete</button></div>) : <div className="empty">No sessions saved yet.</div>}</div><div className="backup"><h3>Data backup</h3><p>Export or restore your code, notes, bookmarks, and progress.</p><button onClick={() => exportBackup(state)}>↓ Export backup</button><button onClick={() => backupInput.current?.click()}>↑ Import backup</button><input ref={backupInput} className="backup-input" type="file" accept="application/json,.json" onChange={restoreBackup} /><button className="reset-button" onClick={async () => { try { const reset = await resetState(); setState(reset); setBookmark(false); setCode(''); setResults(null); setRunError(''); resetTimer(); setLanguage('python'); setStorageError(''); notify('Local data reset') } catch (error) { notify(error.message || 'Could not reset local data') } }}>Reset all data</button></div></div></section>

  if (!storageReady) return <div className="platform"><div className="storage-loading">Opening local SQLite database…</div></div>

  return <div className="platform">{header}{storageError && <div className="storage-warning">SQLite storage unavailable: {storageError}</div>}<div className="content">{view === 'home' ? homeView : view === 'workspace' ? workspace : view === 'problems' ? problemsView : sessionsView}</div>{toast && <div className="toast">{toast}</div>}{modal === 'problem' && <div className="modal-bg"><form className="modal" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get('title')).trim(); if (!title) return; const id = `custom-${Date.now()}`; const fnName = String(form.get('fnName')).trim() || 'solve'; const custom = { id, number: problems.length + 100, title, difficulty: String(form.get('difficulty')), topic: String(form.get('topic')) || 'Custom', companies: [], fnName, paramNames: ['args'], description: `<p>${String(form.get('description')) || 'Solve the problem.'}</p>`, examples: [], constraints: ['Custom user problem'], hint: 'Write your solution.', testCases: [{ args: [1], expected: null }], starterCode: { python: `class Solution:\n    def ${fnName}(self, *args):\n        return None`, javascript: `var ${fnName} = function(...args) { return null; };` } }; patch({ customProblems: [...(state.customProblems || []), custom], currentProblemId: id }); setModal(null); setView('workspace'); notify('Custom problem created') }}><h3>Create a problem</h3><label>Title<input name="title" required /></label><div className="modal-row"><label>Difficulty<select name="difficulty"><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Topic<input name="topic" /></label></div><label>Function name<input name="fnName" defaultValue="solve" /></label><label>Description<textarea name="description" /></label><div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="orange-button">Save problem</button></div></form></div>}</div>
}
