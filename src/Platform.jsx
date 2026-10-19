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
  rules: [
    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'f43f5e', fontStyle: 'bold' },
    { token: 'string', foreground: '34d399' },
    { token: 'number', foreground: 'fbbf24' },
    { token: 'type', foreground: '38bdf8' },
    { token: 'function', foreground: '818cf8' },
  ],
  colors: {
    'editor.background': '#101216',
    'editorGutter.background': '#101216',
    'editorLineNumber.foreground': '#475569',
    'editorLineNumber.activeForeground': '#cbd5e1',
    'editor.lineHighlightBackground': '#181b22',
    'editor.selectionBackground': '#2563eb33',
    'editorCursor.foreground': '#f59e0b',
    'editorWidget.background': '#171920',
    'editorSuggestWidget.background': '#171920',
    'editorSuggestWidget.border': '#2d323f',
    'editorSuggestWidget.selectedBackground': '#252936',
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

  const header = (
    <header className="platform-header">
      <div className="header-left">
        <button className="brand-button" onClick={() => setView('home')} title="YourCode Home">
          <div className="brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="brand-text">Your<span className="brand-accent">Code</span></span>
          <span className="brand-badge">Local</span>
        </button>

        <div className="header-nav-divider" />

        <div className="header-nav-links">
          <button className={`nav-tab-btn ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Home</span>
          </button>
          <button className={`nav-tab-btn ${view === 'problems' ? 'active' : ''}`} onClick={() => setView('problems')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span>Problems</span>
          </button>
        </div>

        {view === 'workspace' && !companyPractice && (
          <div className="problem-nav-group">
            <button className="icon-nav-btn" aria-label="Previous problem" title="Previous problem" onClick={() => moveProblem(-1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button className="icon-nav-btn" aria-label="Next problem" title="Next problem" onClick={() => moveProblem(1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button className="icon-nav-btn" aria-label="Random problem" title="Random problem" onClick={() => moveProblem('random')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
            </button>
            <span className="problem-crumb-pill" title={`${problem.number}. ${problem.title}`}>
              <span className="crumb-num">{problem.number}</span>
              <span className="crumb-title">{problem.title}</span>
            </span>
          </div>
        )}
      </div>

      <div className="header-center">
        {view === 'workspace' && (
          <div className="run-controls">
            <button className="run-button-clean" onClick={() => run(false)} disabled={busy} title="Run Code (Ctrl + Enter)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>{busy ? 'Running…' : 'Run'}</span>
              <kbd className="shortcut-badge">Ctrl ↵</kbd>
            </button>
            <button className="submit-button-clean" onClick={() => run(true)} disabled={busy} title="Submit Solution (Ctrl + Shift + Enter)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Submit</span>
            </button>
          </div>
        )}
      </div>

      <div className="header-right">
        <button className={`nav-tab-btn sessions-btn ${view === 'sessions' ? 'active' : ''}`} onClick={() => setView('sessions')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="hide-mobile">Sessions</span>
          <span className="sessions-badge">{state.sessions?.length || 0}</span>
        </button>

        <div className="timer-pill-clean">
          <span className={`timer-pulse-dot ${timerRunning ? 'active' : ''}`} />
          <button className="timer-btn" aria-label={timerRunning ? 'Pause timer' : 'Start timer'} onClick={toggleTimer} title={timerRunning ? 'Pause' : 'Start'}>
            {timerRunning ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
          </button>
          <span className="timer-time-display">{formattedTime}</span>
          <button className="timer-btn" aria-label="Reset timer" onClick={resetTimer} title="Reset">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>

        <div className="avatar-pill" title="YourCode Local Profile">
          <span>Y</span>
        </div>
      </div>
    </header>
  )

  const toggleSection = section => setExpandedSections(current => ({ ...current, [section]: !current[section] }))

  const description = (
    <div className="description">
      <div className="problem-title-clean">
        <div className="title-left">
          <span className="problem-num-badge">Problem {problem.number}</span>
          <h1 className="problem-heading">{problem.title}</h1>
        </div>
        <button
          className={`bookmark-btn-clean ${bookmark ? 'saved' : ''}`}
          title={bookmark ? 'Remove bookmark' : 'Bookmark problem'}
          onClick={() => {
            const next = !bookmark
            setBookmark(next)
            patch({ bookmarks: { ...state.bookmarks, [problem.id]: next } })
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmark ? '#f59e0b' : 'none'} stroke={bookmark ? '#f59e0b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </div>

      <div className="problem-meta-clean">
        <span className={`diff-pill ${problem.difficulty.toLowerCase()}`}>
          <span className="diff-dot" />
          {problem.difficulty}
        </span>
        <span className="meta-tag">{problem.topic}</span>
        <span className="meta-tag faint">Acceptance 62.4%</span>
      </div>

      <div className="pill-row-clean">
        <button className={`hint-toggle-btn ${hint ? 'active' : ''}`} onClick={() => setHint(value => !value)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/>
          </svg>
          <span>Hint</span>
        </button>
        {companies.map(item => (
          <button key={item} className="company-chip-btn" onClick={() => { setCompany(item); setView('problems') }}>
            <CompanyLogo name={item} />
            <span>{item}</span>
          </button>
        ))}
      </div>

      {hint && (
        <div className="hint-card-clean">
          <div className="hint-card-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/>
            </svg>
            <b>Intuition Hint</b>
          </div>
          <p>{problem.hint}</p>
        </div>
      )}

      <div className="rich-copy" dangerouslySetInnerHTML={{ __html: problem.description }} />

      <div className="examples-section">
        {(problem.examples || []).map((example, index) => (
          <div className="example-card-clean" key={index}>
            <div className="example-card-head">
              <span className="example-badge">Example {index + 1}</span>
            </div>
            <div className="example-body">
              <div className="example-line">
                <span className="example-label">Input:</span>
                <code className="example-code">{example.input}</code>
              </div>
              <div className="example-line">
                <span className="example-label">Output:</span>
                <code className="example-code">{example.output}</code>
              </div>
              {example.explanation && (
                <div className="example-line">
                  <span className="example-label">Explanation:</span>
                  <span className="example-text">{example.explanation}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="constraints-section">
        <h3>Constraints</h3>
        <ul className="constraints-list">
          {(problem.constraints || []).map(item => (
            <li key={item}>
              <code>{item}</code>
            </li>
          ))}
        </ul>
      </div>

      <div className="question-feedback-clean">
        <span className="feedback-prompt">Seen this question in a real interview?</span>
        <div className="feedback-actions">
          <button className={`poll-btn ${seenAnswer === true ? 'selected' : ''}`} onClick={() => setSeenAnswer(true)}>Yes</button>
          <button className={`poll-btn ${seenAnswer === false ? 'selected' : ''}`} onClick={() => setSeenAnswer(false)}>No</button>
          <span className="poll-count">{state.submissions?.[problem.id]?.length || 0} attempts</span>
        </div>
        <div className="local-metrics-clean">
          <span className="metric-pill">Runs <b>{state.submissions?.[problem.id]?.length || 0}</b></span>
          <span className="metric-pill">Runtime <b>Browser Worker</b></span>
          <span className="metric-pill">Data <b>SQLite Local</b></span>
        </div>
      </div>

      <div className="problem-accordions-clean">
        {['Topics', 'Companies', 'Similar Questions', 'Discussion'].map(section => (
          <div className="accordion-clean" key={section}>
            <button className="accordion-trigger" onClick={() => toggleSection(section)}>
              <span className="accordion-icon">
                {section === 'Topics' ? '#' : section === 'Companies' ? '@' : section === 'Discussion' ? '💬' : '☷'}
              </span>
              <span className="accordion-title">{section}{section === 'Discussion' ? ' (0)' : ''}</span>
              <span className={`accordion-chevron ${expandedSections[section] ? 'open' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            {expandedSections[section] && (
              <div className="accordion-drawer">
                {section === 'Topics' ? (
                  <span className="topic-chip">{problem.topic}</span>
                ) : section === 'Companies' ? (
                  <div className="company-list">
                    {companies.length ? companies.map(item => (
                      <span className="company-tag" key={item}><CompanyLogo name={item} />{item}</span>
                    )) : 'No company tags yet.'}
                  </div>
                ) : section === 'Similar Questions' ? (
                  <div className="similar-list">
                    {problems.filter(item => item.id !== problem.id && item.topic === problem.topic).slice(0, 4).map(item => (
                      <button key={item.id} className="similar-btn" onClick={() => patch({ currentProblemId: item.id })}>
                        <span>{item.number}.</span> {item.title}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="muted-text">Discussions are stored locally in this version.</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel-copyright">YourCode — Open Source & Local-First</div>
    </div>
  )

  const activeResult = results?.results?.[activeCase]
  const verdict = results?.allPassed ? 'Accepted' : results?.firstFailed?.error ? (results.firstFailed.errorType === 'SyntaxError' ? 'Syntax Error' : 'Runtime Error') : 'Wrong Answer'
  const executionStatusLabel = language === 'python'
    ? ({ idle: 'Python Worker Idle', loading: 'Loading Pyodide…', running: 'Running Python…', ready: 'Python Ready', error: 'Python Error' }[executionStatus] || 'Python Ready')
    : ({ running: 'Running JavaScript…', error: 'JavaScript Error' }[executionStatus] || 'JavaScript Ready')

  const resultPanel = runError ? (
    <div className="execution-error-clean">
      <div className="error-badge">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <b>Execution failed</b>
      </div>
      <p className="error-message">{runError}</p>
      {language === 'python' && <small>Python runs locally via Web Worker. Check syntax or recursion limits.</small>}
    </div>
  ) : results ? (
    <div className="results-clean">
      <div className="verdict-banner-clean">
        <div className={`verdict-badge ${results.allPassed ? 'accepted' : 'rejected'}`}>
          <span className="verdict-icon">{results.allPassed ? '✓' : '×'}</span>
          <div className="verdict-copy">
            <b>{verdict}</b>
            <small>{results.passed}/{results.total} testcases passed</small>
          </div>
        </div>
        <div className="verdict-metrics">
          <span className="metric-tag">Runtime: <b>{results.totalMs} ms</b></span>
        </div>
      </div>

      <div className="case-tab-bar-clean">
        {results.results.map((item, index) => (
          <button
            className={`case-pill-btn ${activeCase === index ? 'active' : ''} ${item.passed ? 'pass' : 'fail'}`}
            onClick={() => setActiveCase(index)}
            key={item.index}
          >
            <span className="case-status-icon">{item.passed ? '✓' : '×'}</span>
            <span>Case {item.index}</span>
          </button>
        ))}
      </div>

      {activeResult && (
        <div className="result-case-grid-clean">
          <div className="result-block">
            <span className="result-label">Input</span>
            <pre className="code-pre">{formatInput(activeResult.args, problem.paramNames)}</pre>
          </div>
          <div className="result-block">
            <span className="result-label">Your Output</span>
            <pre className={`code-pre ${activeResult.passed ? 'pass-pre' : 'fail-pre'}`}>
              {formatOutput(activeResult.error || activeResult.actual)}
            </pre>
          </div>
          <div className="result-block">
            <span className="result-label">Expected</span>
            <pre className="code-pre pass-pre">{formatOutput(activeResult.expected)}</pre>
          </div>
          {activeResult.logs?.length > 0 && (
            <div className="result-block full-width">
              <span className="result-label">Stdout</span>
              <pre className="code-pre">{activeResult.logs.join('\n')}</pre>
            </div>
          )}
          {activeResult.stderr?.length > 0 && (
            <div className="result-block full-width">
              <span className="result-label">Stderr</span>
              <pre className="code-pre fail-pre">{activeResult.stderr.join('\n')}</pre>
            </div>
          )}
          {activeResult.traceback && (
            <details className="execution-traceback">
              <summary>Show traceback</summary>
              <pre>{activeResult.traceback}</pre>
            </details>
          )}
        </div>
      )}

      <div className="result-bottom-action">
        <button className="contribute-case-btn" onClick={addTestCase}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Contribute a custom testcase
        </button>
      </div>
    </div>
  ) : (
    <div className="empty-results-clean">
      <div className="empty-results-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
      <b>Run your code to see results</b>
      <small>Click "Run" or press <kbd>Ctrl + Enter</kbd></small>
    </div>
  )

  const workspace = (
    <div className="workspace-shell">
      {companyPractice && (
        <div className="company-practice-bar-clean">
          <div className="practice-brand">
            <CompanyLogo name={companyPractice.company} />
            <div className="practice-brand-copy">
              <small>COMPANY PRACTICE</small>
              <b>{companyPractice.company}</b>
            </div>
          </div>
          <div className="practice-progress-pill">
            Question <b>{companyPractice.index + 1}</b> of <b>{companyPractice.problemIds.length}</b>
            <span className="progress-dot-divider">·</span>
            <span className="solved-pill">{companyPractice.problemIds.filter(id => state.statusByProblem?.[id] === 'Solved').length} Solved</span>
          </div>
          <div className="practice-actions">
            <button className="primary-glow-btn" onClick={advanceCompanyPractice} disabled={state.statusByProblem?.[problem.id] !== 'Solved' || busy}>
              {companyPractice.index === companyPractice.problemIds.length - 1 ? 'Finish Set' : 'Next Question →'}
            </button>
            <button className="ghost-btn" onClick={() => { setCompanyPractice(null); setView('home') }}>
              Exit Practice
            </button>
          </div>
        </div>
      )}

      <main className="workspace">
        <section className="panel left-panel">
          <nav className="panel-tab-bar">
            {[
              { id: 'Description', label: 'Description', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
              { id: 'Editorial & Notes', label: 'Editorial & Notes', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
              { id: 'Solutions', label: 'Solutions', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
              { id: 'Submissions', label: 'Submissions', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            ].map(item => (
              <button
                className={`panel-tab-btn ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
                key={item.id}
              >
                <span className="tab-svg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="left-panel-content">
            {tab === 'Description' && description}
            {tab === 'Editorial & Notes' && (
              <div className="notes-view">
                <div className="hint-card-clean">
                  <div className="hint-card-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></svg>
                    <b>Approach Hint</b>
                  </div>
                  <p>{problem.hint}</p>
                </div>
                <div className="notes-field-clean">
                  <label className="field-label-clean">Personal Notes & Time/Space Complexity</label>
                  <textarea
                    value={state.notes?.[problem.id] || ''}
                    onChange={event => patch({ notes: { ...state.notes, [problem.id]: event.target.value } })}
                    placeholder="Document your intuition, complexity analysis, edge cases, and learnings…"
                  />
                </div>
              </div>
            )}
            {tab === 'Solutions' && (
              <div className="solution-view">
                <div className="solution-header-clean">
                  <div>
                    <b>Reference Starter Solution</b>
                    <small>Standard solution provided for practice</small>
                  </div>
                  <button className="copy-solution-btn" onClick={copySolutionToEditor}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy to Editor
                  </button>
                </div>
                <pre className="solution-pre" dangerouslySetInnerHTML={{ __html: highlightCode(problem.starterCode?.[language] || '', language) }} />
              </div>
            )}
            {tab === 'Submissions' && (
              <div className="submissions-view">
                <div className="submissions-header">
                  <h3>Submission History</h3>
                  <small>{(state.submissions?.[problem.id] || []).length} recorded locally</small>
                </div>
                {(state.submissions?.[problem.id] || []).length ? state.submissions[problem.id].map((item, index) => (
                  <article className="submission-card-clean" key={`${item.timestamp}-${index}`}>
                    <div className="submission-card-header">
                      <span className={`status-chip ${item.status === 'Accepted' ? 'pass' : 'fail'}`}>
                        {item.status === 'Accepted' ? '✓ Accepted' : '× Wrong Answer'}
                      </span>
                      <span className="submission-meta">
                        {item.language} · {item.passed}/{item.total} passed · {item.runtimeMs} ms
                        <small>{item.timestamp}</small>
                      </span>
                    </div>
                    <details className="submission-code-drawer">
                      <summary>View submitted code</summary>
                      <pre><code>{item.code || '(No code saved)'}</code></pre>
                    </details>
                  </article>
                )) : (
                  <div className="empty-submissions">
                    <span>No submissions yet for this problem.</span>
                    <small>Click "Submit" to test your solution across all testcases.</small>
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className="panel-footer-clean">
            <button
              className="footer-bookmark-btn"
              onClick={() => {
                const next = !bookmark
                setBookmark(next)
                patch({ bookmarks: { ...state.bookmarks, [problem.id]: next } })
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={bookmark ? '#f59e0b' : 'none'} stroke={bookmark ? '#f59e0b' : 'currentColor'} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>{bookmark ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            <span className={`footer-status-badge ${(state.statusByProblem?.[problem.id] || 'unsolved').toLowerCase()}`}>
              {state.statusByProblem?.[problem.id] || 'Not started'}
            </span>
          </footer>
        </section>

        <section className="right-column">
          <div className="panel editor">
            <div className="editor-head-clean">
              <div className="editor-head-left">
                <span className="code-tag-badge">&lt;/&gt;</span>
                <span className="editor-label">Code</span>
                <div className="lang-select-pill">
                  <select aria-label="Programming language" value={language} onChange={event => { setLanguage(event.target.value); patch({ language: event.target.value }) }}>
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                  <svg className="select-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <span className="sqlite-indicator">
                  <span className={`sqlite-dot ${storageError ? 'error' : 'ok'}`} />
                  <span className="sqlite-text">{storageError ? 'SQLite error' : 'SQLite Local'}</span>
                </span>
              </div>

              <div className="editor-head-right">
                <div className="runtime-status-pill">
                  <span className={`status-pulse-dot ${executionStatus}`} />
                  <span>{executionStatusLabel}</span>
                </div>
                <div className="editor-actions-pill">
                  <button title="Decrease font size" onClick={() => setFontSize(size => Math.max(11, size - 1))}>A−</button>
                  <button title="Increase font size" onClick={() => setFontSize(size => Math.min(20, size + 1))}>A+</button>
                  <span className="action-divider" />
                  <button className={wordWrap ? 'active' : ''} title="Toggle word wrap" onClick={() => setWordWrap(value => !value)}>↵</button>
                  <button title="Reset code" onClick={resetCode}>⟲</button>
                </div>
              </div>
            </div>

            <div className="monaco-editor-body">
              <Editor
                className="monaco-editor-shell"
                width="100%"
                height="100%"
                language={language}
                theme="yourcode-dark"
                value={code}
                onChange={value => updateCode(value ?? '')}
                beforeMount={configureMonacoTheme}
                onMount={handleEditorMount}
                loading={<div className="editor-loading">Loading Monaco Editor…</div>}
                options={{
                  fontSize,
                  fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
                  lineNumbers: 'on',
                  minimap: { enabled: false },
                  automaticLayout: true,
                  autoIndent: 'full',
                  tabSize: 4,
                  insertSpaces: true,
                  wordWrap: wordWrap ? 'on' : 'off',
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  renderLineHighlight: 'line',
                  bracketPairColorization: { enabled: true },
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                  tabCompletion: 'on',
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>

            <div className="editor-cursor-pill">
              Ln {cursorPosition.lineNumber}, Col {cursorPosition.column} · {wordWrap ? 'Wrap: On' : 'Wrap: Off'}
            </div>
          </div>

          <div className="panel tests">
            <nav className="panel-tab-bar test-panel-tabs">
              <button
                className={`panel-tab-btn ${bottomTab === 'Testcase' ? 'active' : ''}`}
                onClick={() => setBottomTab('Testcase')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                <span>Testcase</span>
              </button>
              <button
                className={`panel-tab-btn ${bottomTab === 'Test Result' ? 'active' : ''}`}
                onClick={() => setBottomTab('Test Result')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Test Result</span>
                {results && <span className={`tab-dot ${results.allPassed ? 'pass' : 'fail'}`} />}
              </button>
              <button className="add-case-btn" onClick={addTestCase}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Add Testcase</span>
              </button>
            </nav>

            <div className="test-panel-body">
              {bottomTab === 'Testcase' ? (
                <div className="testcase-view">
                  <div className="case-tab-bar-clean">
                    {testCases.map((item, index) => (
                      <button
                        className={`case-pill-btn ${activeCase === index ? 'active' : ''}`}
                        onClick={() => setActiveCase(index)}
                        key={index}
                      >
                        Case {index + 1}{index >= (problem.testCases || []).length ? ' · Custom' : ''}
                      </button>
                    ))}
                  </div>
                  {testCases[activeCase] && (
                    <div className="case-card-grid-clean">
                      <div className="case-field-block">
                        <span className="case-field-label">Input</span>
                        <pre className="code-pre">{json(testCases[activeCase].args)}</pre>
                      </div>
                      <div className="case-field-block">
                        <span className="case-field-label">Expected Output</span>
                        <pre className="code-pre">{json(testCases[activeCase].expected)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                resultPanel
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )

  const homeView = (
    <section className="full-view home-view">
      <header className="home-hero-clean">
        <div className="home-hero-copy">
          <div className="home-kicker-clean">
            <span className="kicker-pulse-dot" />
            <span>COMPANY-WISE INTERVIEW PREPARATION</span>
          </div>
          <h1 className="hero-headline">
            Pick your target.<br />
            <span className="hero-gradient-text">Build your edge.</span>
          </h1>
          <p className="hero-subtext">
            Explore curated practice sets tagged by premier technology firms. Run, test, and master patterns directly in your browser with full offline SQLite sync.
          </p>
          <div className="home-hero-actions-clean">
            <button className="primary-glow-btn" onClick={() => startCompanyPractice(selectedHomeCompany)}>
              <span>Start {selectedHomeCompany} Practice</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button className="resume-btn-clean" onClick={() => openProblem(problem.id)}>
              <span className="resume-icon">↗</span>
              <span>Resume #{problem.number} {problem.title}</span>
            </button>
          </div>
        </div>

        <div className="home-hero-stats-clean">
          <div className="stat-card-glass">
            <span className="stat-card-label">PROBLEMS SOLVED</span>
            <div className="stat-card-value">
              <b>{totalSolved}</b>
              <span className="stat-total">/ {problems.length}</span>
            </div>
            <div className="stat-micro-progress">
              <div className="micro-fill" style={{ width: `${problems.length ? (totalSolved / problems.length) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="stat-card-glass">
            <span className="stat-card-label">COMPANIES</span>
            <div className="stat-card-value">
              <b>{COMPANY_LIST.length}</b>
              <span className="stat-sub">Tracked</span>
            </div>
          </div>

          <div className="stat-card-glass">
            <span className="stat-card-label">SUBMISSIONS</span>
            <div className="stat-card-value">
              <b>{Object.values(state.submissions || {}).flat().length}</b>
              <span className="stat-sub">Local</span>
            </div>
          </div>
        </div>
      </header>

      <div className="home-layout-clean">
        <section className="home-company-panel-clean">
          <div className="panel-heading-clean">
            <div>
              <span className="kicker-subtle">BROWSE BY COMPANY</span>
              <h2>Target Companies</h2>
              <p>Select a company to view curated interview problems and progress.</p>
            </div>
            <span className="counter-pill">{COMPANY_LIST.length} available</span>
          </div>

          <div className="search-input-pill">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              aria-label="Search companies"
              value={homeSearch}
              onChange={event => setHomeSearch(event.target.value)}
              placeholder="Filter company sets…"
            />
            {homeSearch && (
              <button className="search-clear-btn" onClick={() => setHomeSearch('')}>×</button>
            )}
          </div>

          <div className="home-company-grid-clean">
            {visibleHomeCompanies.map(companyName => {
              const companyQuestions = problems.filter(item => getProblemCompanies(item).includes(companyName))
              const solvedCount = companyQuestions.filter(item => state.statusByProblem?.[item.id] === 'Solved').length
              const pct = companyQuestions.length ? Math.round((solvedCount / companyQuestions.length) * 100) : 0
              return (
                <button
                  className={`home-company-card-clean ${selectedHomeCompany === companyName ? 'selected' : ''}`}
                  key={companyName}
                  onClick={() => setSelectedHomeCompany(companyName)}
                  aria-pressed={selectedHomeCompany === companyName}
                >
                  <div className="company-logo-squircle">
                    <CompanyLogo name={companyName} />
                  </div>
                  <div className="company-card-meta">
                    <span className="company-name">{companyName}</span>
                    <span className="company-stats-line">
                      {companyQuestions.length} questions <span className="dot-sep">·</span> {solvedCount} solved
                    </span>
                    <div className="mini-company-progress">
                      <div className="mini-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="company-chevron">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </button>
              )
            })}
            {!visibleHomeCompanies.length && (
              <div className="home-no-companies">No companies found matching “{homeSearch}”.</div>
            )}
          </div>
        </section>

        <section className="home-detail-panel-clean">
          <div className="detail-panel-header">
            <div className="detail-company-title">
              <div className="company-large-logo">
                <CompanyLogo name={selectedHomeCompany} />
              </div>
              <div className="detail-copy">
                <span className="eyebrow-clean">CURATED QUESTION SET</span>
                <h2>{selectedHomeCompany}</h2>
                <p>{selectedCompanyProblems.length} curated questions <span className="dot-sep">·</span> {selectedCompanySolved} solved</p>
              </div>
            </div>
            <div className="detail-actions">
              <button className="primary-glow-btn" onClick={() => startCompanyPractice(selectedHomeCompany)}>
                {selectedCompanySolved === selectedCompanyProblems.length && selectedCompanyProblems.length ? 'Review Set →' : 'Start Practice →'}
              </button>
              <button
                className="secondary-btn-clean"
                onClick={() => {
                  setCompany(selectedHomeCompany)
                  setSearch('')
                  setDifficulty('all')
                  setStatusFilter('all')
                  setView('problems')
                }}
              >
                Full List
              </button>
            </div>
          </div>

          <div className="detail-progress-bar-wrap">
            <div className="progress-labels">
              <span>Set Completion</span>
              <b>{selectedCompanySolved} / {selectedCompanyProblems.length} solved <span className="pct-badge">{selectedCompanyProblems.length ? Math.round((selectedCompanySolved / selectedCompanyProblems.length) * 100) : 0}%</span></b>
            </div>
            <div className="detail-progress-track">
              <div className="detail-progress-fill" style={{ width: `${selectedCompanyProblems.length ? (selectedCompanySolved / selectedCompanyProblems.length) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="home-question-list-clean">
            {selectedCompanyProblems.length ? selectedCompanyProblems.map(item => {
              const status = state.statusByProblem?.[item.id] || 'Unsolved'
              return (
                <button className="question-list-row-clean" key={item.id} onClick={() => openProblem(item.id)}>
                  <span className={`status-bubble ${status.toLowerCase()}`} title={status} />
                  <span className="question-row-num">{String(item.number).padStart(2, '0')}</span>
                  <div className="question-row-copy">
                    <span className="question-row-title">{item.title}</span>
                    <span className="question-row-topic">{item.topic}</span>
                  </div>
                  <span className={`diff-pill ${item.difficulty.toLowerCase()}`}>
                    <span className="diff-dot" />
                    {item.difficulty}
                  </span>
                  <span className="question-status-label">{status}</span>
                  <span className="question-row-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </button>
              )
            }) : (
              <div className="empty">No questions for this company yet.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  )

  const problemsView = (
    <section className="full-view problems-view-clean">
      <div className="view-heading-clean">
        <div>
          <span className="kicker-subtle">PROBLEM DIRECTORY</span>
          <h2>All Problems</h2>
          <p>Pick up where you left off or search across algorithms and data structures.</p>
        </div>
        <button className="primary-glow-btn" onClick={() => setModal('problem')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Create Problem</span>
        </button>
      </div>

      <div className="problem-stats-cards-clean">
        <div className="stat-metric-card">
          <small>Total Bank</small>
          <b>{problems.length}</b>
        </div>
        <div className="stat-metric-card">
          <small>Solved</small>
          <b className="green">{problems.filter(item => state.statusByProblem?.[item.id] === 'Solved').length}</b>
        </div>
        <div className="stat-metric-card">
          <small>Attempted</small>
          <b className="amber">{problems.filter(item => state.statusByProblem?.[item.id] === 'Attempted').length}</b>
        </div>
        <div className="stat-metric-card">
          <small>Bookmarked</small>
          <b className="purple">{Object.values(state.bookmarks || {}).filter(Boolean).length}</b>
        </div>
      </div>

      <div className="filters-clean">
        <div className="search-field-clean">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by title, topic, or keyword…" />
          {search && <button className="clear-btn" onClick={() => setSearch('')}>×</button>}
        </div>
        <div className="select-pill-wrap">
          <select aria-label="Company filter" value={company} onChange={event => setCompany(event.target.value)}>
            <option value="all">All Companies</option>
            {COMPANY_LIST.map(item => <option key={item}>{item}</option>)}
          </select>
          <svg className="select-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div className="select-pill-wrap">
          <select aria-label="Difficulty filter" value={difficulty} onChange={event => setDifficulty(event.target.value)}>
            <option value="all">All Difficulties</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
          <svg className="select-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div className="select-pill-wrap">
          <select aria-label="Status filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">All Status</option>
            <option>Unsolved</option>
            <option>Attempted</option>
            <option>Solved</option>
          </select>
          <svg className="select-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      <div className="problem-table-clean">
        <table>
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Status</th>
              <th>Title</th>
              <th style={{ width: '120px' }}>Difficulty</th>
              <th>Companies</th>
              <th>Topic</th>
              <th style={{ width: '90px' }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} onClick={() => openProblem(item.id)}>
                <td>
                  <span className={`status-bubble ${(state.statusByProblem?.[item.id] || 'unsolved').toLowerCase()}`} />
                  <span className="status-cell-text">{state.statusByProblem?.[item.id] || 'Unsolved'}</span>
                </td>
                <td>
                  <div className="title-cell-wrap">
                    <span className="table-row-num">{item.number}.</span>
                    <span className="table-row-title">{item.title}</span>
                    {state.bookmarks?.[item.id] && <span className="table-star">★</span>}
                  </div>
                </td>
                <td>
                  <span className={`diff-pill ${item.difficulty.toLowerCase()}`}>
                    <span className="diff-dot" />
                    {item.difficulty}
                  </span>
                </td>
                <td>
                  <div className="company-list">
                    {getProblemCompanies(item).slice(0, 3).map(name => (
                      <span className="company-tag" key={name} title={name}>
                        <CompanyLogo name={name} />
                        {name}
                      </span>
                    ))}
                    {getProblemCompanies(item).length > 3 && (
                      <span className="company-more">+{getProblemCompanies(item).length - 3}</span>
                    )}
                    {!getProblemCompanies(item).length && <span className="muted-dash">—</span>}
                  </div>
                </td>
                <td>
                  <span className="topic-badge">{item.topic}</span>
                </td>
                <td>
                  <button className="table-solve-btn" onClick={e => { e.stopPropagation(); openProblem(item.id) }}>
                    Solve →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-table-clean">
            <span>No problems match the selected filters.</span>
          </div>
        )}
      </div>
    </section>
  )

  const sessionsView = (
    <section className="full-view sessions-view-clean">
      <div className="view-heading-clean">
        <div>
          <span className="kicker-subtle">ANALYTICS & SYNC</span>
          <h2>Practice Sessions & Data</h2>
          <p>Review practice history, active sessions, and local SQLite workspace data.</p>
        </div>
        <div className="session-actions-clean">
          {timerRunning ? (
            <button className="primary-glow-btn finish" onClick={saveSession}>
              ■ Finish Session ({formattedTime})
            </button>
          ) : (
            <button className="primary-glow-btn" onClick={startSession}>
              ▶ Start Practice Session
            </button>
          )}
          <button className="secondary-btn-clean" onClick={() => setView('workspace')}>
            ← Back to Workspace
          </button>
        </div>
      </div>

      <div className="stats-metric-grid-clean">
        <div className="stat-metric-card">
          <small>Total Solved</small>
          <b>{problems.filter(item => state.statusByProblem?.[item.id] === 'Solved').length}</b>
        </div>
        <div className="stat-metric-card">
          <small>Saved Sessions</small>
          <b>{state.sessions?.length || 0}</b>
        </div>
        <div className="stat-metric-card">
          <small>Total Runs</small>
          <b>{Object.values(state.submissions || {}).flat().length}</b>
        </div>
        <div className="stat-metric-card">
          <small>Database Sync</small>
          <b className="green">SQLite Local</b>
        </div>
      </div>

      <div className="session-grid-clean">
        <div className="session-card-panel">
          <div className="panel-card-header">
            <h3>Practice Sessions Log</h3>
            <span className="count-pill">{state.sessions?.length || 0} logged</span>
          </div>
          {state.sessions?.length ? (
            <div className="sessions-list-scroll">
              {state.sessions.map(item => (
                <div className="session-log-item" key={item.id}>
                  <div className="session-item-copy">
                    <b>{item.title}</b>
                    <small>{item.durationMinutes} min · {item.problemsSolved} problems solved</small>
                  </div>
                  <button
                    className="session-del-btn"
                    onClick={() => patch({ sessions: state.sessions.filter(session => session.id !== item.id) })}
                    title="Delete session"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-sessions">
              <span>No practice sessions saved yet.</span>
              <small>Click "Start Practice Session" to track your focused coding time.</small>
            </div>
          )}
        </div>

        <div className="session-card-panel">
          <div className="panel-card-header">
            <h3>Local Workspace Storage</h3>
          </div>
          <p className="backup-desc">
            Export or restore your code snippets, notes, problem bookmarks, and session history as JSON.
          </p>
          <div className="backup-btn-group">
            <button className="backup-action-btn export" onClick={() => exportBackup(state)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export Workspace JSON</span>
            </button>
            <button className="backup-action-btn import" onClick={() => backupInput.current?.click()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Import Workspace JSON</span>
            </button>
            <input ref={backupInput} className="backup-input" type="file" accept="application/json,.json" onChange={restoreBackup} />
            <button
              className="backup-action-btn reset"
              onClick={async () => {
                if (!window.confirm('Are you sure you want to reset all local progress, submissions, and code?')) return
                try {
                  const reset = await resetState()
                  setState(reset)
                  setBookmark(false)
                  setCode('')
                  setResults(null)
                  setRunError('')
                  resetTimer()
                  setLanguage('python')
                  setStorageError('')
                  notify('Local data reset')
                } catch (error) {
                  notify(error.message || 'Could not reset local data')
                }
              }}
            >
              Reset All Workspace Data
            </button>
          </div>
        </div>
      </div>
    </section>
  )

  if (!storageReady) {
    return (
      <div className="platform">
        <div className="storage-loading">
          <div className="spinner-ring" />
          <span>Opening local SQLite database…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="platform">
      {header}
      {storageError && <div className="storage-warning">SQLite storage unavailable: {storageError}</div>}
      <div className="content">
        {view === 'home' ? homeView : view === 'workspace' ? workspace : view === 'problems' ? problemsView : sessionsView}
      </div>
      {toast && (
        <div className="toast-clean">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>{toast}</span>
        </div>
      )}
      {modal === 'problem' && (
        <div className="modal-bg-clean">
          <form
            className="modal-card-clean"
            onSubmit={event => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const title = String(form.get('title')).trim()
              if (!title) return
              const id = `custom-${Date.now()}`
              const fnName = String(form.get('fnName')).trim() || 'solve'
              const custom = {
                id,
                number: problems.length + 100,
                title,
                difficulty: String(form.get('difficulty')),
                topic: String(form.get('topic')) || 'Custom',
                companies: [],
                fnName,
                paramNames: ['args'],
                description: `<p>${String(form.get('description')) || 'Solve the problem.'}</p>`,
                examples: [],
                constraints: ['Custom user problem'],
                hint: 'Write your solution.',
                testCases: [{ args: [1], expected: null }],
                starterCode: {
                  python: `class Solution:\n    def ${fnName}(self, *args):\n        return None`,
                  javascript: `var ${fnName} = function(...args) { return null; };`,
                },
              }
              patch({ customProblems: [...(state.customProblems || []), custom], currentProblemId: id })
              setModal(null)
              setView('workspace')
              notify('Custom problem created')
            }}
          >
            <div className="modal-header-clean">
              <h3>Create Custom Problem</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModal(null)}>×</button>
            </div>
            <label className="modal-field">
              <span>Title</span>
              <input name="title" placeholder="e.g. Reverse Linked List II" required />
            </label>
            <div className="modal-row-clean">
              <label className="modal-field">
                <span>Difficulty</span>
                <select name="difficulty">
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </label>
              <label className="modal-field">
                <span>Topic</span>
                <input name="topic" placeholder="e.g. Dynamic Programming" />
              </label>
            </div>
            <label className="modal-field">
              <span>Function Name</span>
              <input name="fnName" defaultValue="solve" placeholder="solve" />
            </label>
            <label className="modal-field">
              <span>Description</span>
              <textarea name="description" placeholder="Problem description and rules…" />
            </label>
            <div className="modal-actions-clean">
              <button type="button" className="ghost-btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="primary-glow-btn">Save Problem</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

