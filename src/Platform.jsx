import { useEffect, useMemo, useRef, useState } from 'react'
import { COMPANY_LIST, DEFAULT_PROBLEMS, getProblemCompanies } from './data/problems'
import { useTimer, useToast } from './hooks/useToast'
import { executeCode } from './utils/executor'
import { exportBackup, importBackup, loadState, resetState, saveState } from './utils/storage'
import { highlightCode } from './utils/highlighter'
import './Platform.css'

const json = value => JSON.stringify(value, null, 2)
const formatTime = value => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`

export default function Platform() {
  const [state, setState] = useState(loadState)
  const [view, setView] = useState('workspace')
  const [tab, setTab] = useState('Description')
  const [bottomTab, setBottomTab] = useState('Test Result')
  const [language, setLanguage] = useState(state.language || 'python')
  const [code, setCode] = useState('')
  const [results, setResults] = useState(null)
  const [activeCase, setActiveCase] = useState(0)
  const [company, setCompany] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [hint, setHint] = useState(false)
  const [modal, setModal] = useState(null)
  const [bookmark, setBookmark] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const [wordWrap, setWordWrap] = useState(false)
  const [customCases, setCustomCases] = useState({})
  const [busy, setBusy] = useState(false)
  const [seenAnswer, setSeenAnswer] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})
  const backupInput = useRef(null)
  const problems = useMemo(() => [...DEFAULT_PROBLEMS, ...(state.customProblems || [])], [state.customProblems])
  const problem = problems.find(item => item.id === state.currentProblemId) || problems[0]
  const testCases = [...(problem.testCases || []), ...(customCases[problem.id] || [])]
  const companies = getProblemCompanies(problem)
  const timer = useTimer(state.activeSession?.elapsedSeconds || 0)
  const { toast, showToast } = useToast()

  useEffect(() => {
    const key = `${problem.id}__${language}`
    setCode(state.userCode?.[key] ?? problem.starterCode?.[language] ?? '')
    setBookmark(Boolean(state.bookmarks?.[problem.id]))
    setResults(null)
    setActiveCase(0)
  }, [problem.id, language])

  useEffect(() => {
    saveState({ ...state, language, activeSession: { ...state.activeSession, elapsedSeconds: timer.seconds, running: timer.running } })
  }, [state, language, timer.seconds, timer.running])

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
  const run = async submit => {
    setBottomTab('Test Result')
    setBusy(true)
    try {
      const outcome = await executeCode({ code, language, fnName: problem.fnName, testCases, unordered: problem.id === 'generate-parentheses' })
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
      notify(error.message || 'Could not run code')
    } finally {
      setBusy(false)
    }
  }
  const filtered = problems.filter(item => {
    const matchesStatus = statusFilter === 'all' || (state.statusByProblem?.[item.id] || 'Unsolved') === statusFilter
    return matchesStatus && (company === 'all' || getProblemCompanies(item).includes(company)) && (difficulty === 'all' || item.difficulty === difficulty) && `${item.title} ${item.topic}`.toLowerCase().includes(search.toLowerCase())
  })
  const resetCode = () => updateCode(problem.starterCode?.[language] || '')
  const startSession = () => {
    timer.reset()
    timer.toggle()
    patch({ activeSession: { running: true, elapsedSeconds: 0, startedAt: new Date().toISOString(), solvedInSession: [] } })
    notify('Practice session started')
  }
  const saveSession = () => {
    const active = state.activeSession || {}
    const startedAt = active.startedAt ? new Date(active.startedAt) : new Date(Date.now() - timer.seconds * 1000)
    const session = { id: Date.now(), title: `Practice · ${startedAt.toLocaleDateString()}`, durationMinutes: Math.max(1, Math.round(timer.seconds / 60)), problemsSolved: active.solvedInSession?.length || 0, date: startedAt.toISOString() }
    patch({ sessions: [session, ...(state.sessions || [])], activeSession: { running: false, elapsedSeconds: 0, startedAt: null, solvedInSession: [] } })
    timer.reset()
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
  const handleEditorKeyDown = event => {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const textarea = event.currentTarget
    const { selectionStart, selectionEnd } = textarea
    const nextCode = `${code.slice(0, selectionStart)}    ${code.slice(selectionEnd)}`
    updateCode(nextCode)
    requestAnimationFrame(() => {
      textarea.setSelectionRange(selectionStart + 4, selectionStart + 4)
    })
  }
  const addTestCase = () => {
    const initial = problem.testCases?.[0] || { args: [], expected: null }
    setCustomCases(current => ({ ...current, [problem.id]: [...(current[problem.id] || []), { args: initial.args, expected: null }] }))
    setBottomTab('Testcase')
    setActiveCase(testCases.length)
    notify('Custom testcase added')
  }

  const header = <header className="platform-header">
    <div className="brand-area">
      <button className="brand" onClick={() => setView('workspace')}>Your<span>Code</span></button>
      <span className="header-divider" />
      <button className="header-link" onClick={() => setView('problems')}>☷ <span>Problems</span></button>
      <button className="icon-button" aria-label="Previous problem" title="Previous problem" onClick={() => moveProblem(-1)}>‹</button>
      <button className="icon-button" aria-label="Next problem" title="Next problem" onClick={() => moveProblem(1)}>›</button>
      <button className="icon-button" aria-label="Random problem" title="Random problem" onClick={() => moveProblem('random')}>⤨</button>
      <span className="problem-crumb">{problem.number}. {problem.title}</span>
    </div>
    <div className="header-actions">
      <button className="run-button" onClick={() => run(false)} disabled={busy}>▶ <span>{busy ? 'Running…' : 'Run'}</span><kbd>Ctrl ↵</kbd></button>
      <button className="submit-button" onClick={() => run(true)} disabled={busy}>⇧ <span>Submit</span></button>
      <button className="header-link sessions-link" onClick={() => setView('sessions')}>Sessions <b>{state.sessions?.length || 0}</b></button>
      <div className="timer-pill"><i className={timer.running ? 'live' : ''} /><button aria-label={timer.running ? 'Pause timer' : 'Start timer'} onClick={timer.toggle}>{timer.running ? 'Ⅱ' : '▶'}</button><b>{timer.formatted}</b><button aria-label="Reset timer" onClick={timer.reset}>↻</button></div>
      <button className="avatar" title="YourCode profile">Y</button>
    </div>
  </header>

  const toggleSection = section => setExpandedSections(current => ({ ...current, [section]: !current[section] }))
  const description = <div className="description">
    <div className="problem-title"><div><div className="problem-number">Problem {problem.number}</div><h1>{problem.title}</h1></div><button className={`bookmark-button ${bookmark ? 'saved' : ''}`} title={bookmark ? 'Remove bookmark' : 'Bookmark problem'} onClick={() => { const next = !bookmark; setBookmark(next); patch({ bookmarks: { ...state.bookmarks, [problem.id]: next } }) }}>{bookmark ? '★' : '☆'}</button></div>
    <div className="problem-meta"><span className={`difficulty ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span><span>·</span><span>{problem.topic}</span><span>·</span><span>Acceptance 62.4%</span></div>
    <div className="pills"><button onClick={() => setHint(value => !value)}>💡 Hint</button>{companies.map(item => <button key={item} onClick={() => { setCompany(item); setView('problems') }}>{item}</button>)}</div>
    {hint && <div className="hint-box"><b>Hint</b><div>{problem.hint}</div></div>}
    <div className="rich-copy" dangerouslySetInnerHTML={{ __html: problem.description }} />
    <div className="examples">{(problem.examples || []).map((example, index) => <div className="example" key={index}><b>Example {index + 1}</b><div><strong>Input:</strong> {example.input}</div><div><strong>Output:</strong> {example.output}</div>{example.explanation && <div><strong>Explanation:</strong> {example.explanation}</div>}</div>)}</div>
    <h3>Constraints</h3><ul>{(problem.constraints || []).map(item => <li key={item}><code>{item}</code></li>)}</ul>
    <div className="question-feedback"><span>Seen this question in a real interview before?</span><div><button className={seenAnswer === true ? 'selected' : ''} onClick={() => setSeenAnswer(true)}>Yes</button><button className={seenAnswer === false ? 'selected' : ''} onClick={() => setSeenAnswer(false)}>No</button><b>{state.submissions?.[problem.id]?.length || 0}/6</b></div><div className="local-metrics"><span>Local runs <b>{state.submissions?.[problem.id]?.length || 0}</b></span><span>CPU <b>Browser</b></span><span>Data <b>Local</b></span></div></div>
    <div className="problem-accordions">{['Topics', 'Companies', 'Similar Questions', 'Discussion'].map(section => <div className="accordion" key={section}><button onClick={() => toggleSection(section)}><span>{section === 'Topics' ? '#' : section === 'Companies' ? '@' : section === 'Discussion' ? '?' : '='}</span>{section}{section === 'Discussion' ? ' (0)' : ''}<b>{expandedSections[section] ? '^' : 'v'}</b></button>{expandedSections[section] && <div className="accordion-content">{section === 'Topics' ? problem.topic : section === 'Companies' ? companies.join(', ') || 'No company tags yet.' : section === 'Similar Questions' ? problems.filter(item => item.id !== problem.id && item.topic === problem.topic).slice(0, 4).map(item => <button key={item.id} onClick={() => patch({ currentProblemId: item.id })}>{item.number}. {item.title}</button>) : 'Discussions are stored locally in this version.'}</div>}</div>)}</div>
    <div className="copyright">Copyright © 2026 YourCode. Open source.</div>
  </div>

  const activeResult = results?.results?.[activeCase]
  const resultPanel = results ? <div className="results">
    <div className="result-summary"><span className={`result-icon ${results.allPassed ? 'pass' : 'fail'}`}>{results.allPassed ? '✓' : '×'}</span><div><b className={results.allPassed ? 'green' : 'red'}>{results.allPassed ? 'Accepted' : 'Wrong Answer'}</b><small>{results.passed}/{results.total} testcases passed · {results.totalMs} ms</small></div></div>
    <div className="case-tabs">{results.results.map((item, index) => <button className={`${activeCase === index ? 'active' : ''} ${item.passed ? 'case-pass' : 'case-fail'}`} onClick={() => setActiveCase(index)} key={item.index}><i /> Case {item.index}</button>)}</div>
    {activeResult && <div className="case-detail"><div><b>Input</b><pre>{json(activeResult.args)}</pre></div><div><b>Output</b><pre>{json(activeResult.error || activeResult.actual)}</pre></div><div><b>Expected</b><pre>{json(activeResult.expected)}</pre></div></div>}
  </div> : <div className="empty result-empty"><span>▷</span><b>Run your code to see results</b><small>Use the Run button or press Ctrl + Enter</small></div>

  const workspace = <main className="workspace">
    <section className="panel left-panel">
      <nav className="tabs problem-tabs">{['Description', 'Editorial & Notes', 'Solutions', 'Submissions'].map(item => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav>
      {tab === 'Description' && description}
      {tab === 'Editorial & Notes' && <div className="notes"><div className="hint-box"><b>Approach hint</b><div>{problem.hint}</div></div><label className="field-label">Your notes<textarea value={state.notes?.[problem.id] || ''} onChange={event => patch({ notes: { ...state.notes, [problem.id]: event.target.value } })} placeholder="Write your intuition, complexity, and review notes…" /></label></div>}
      {tab === 'Solutions' && <div className="solution"><div className="solution-heading"><b>Starter solution</b><button onClick={resetCode}>Copy to editor</button></div><pre dangerouslySetInnerHTML={{ __html: highlightCode(problem.starterCode?.[language] || '', language) }} /></div>}
      {tab === 'Submissions' && <div className="submissions"><h3>Submission history</h3>{(state.submissions?.[problem.id] || []).length ? state.submissions[problem.id].map((item, index) => <div key={index}><b className={item.status === 'Accepted' ? 'green' : 'red'}>{item.status}</b><span>{item.language} · {item.passed}/{item.total} · {item.runtimeMs} ms <small>{item.timestamp}</small></span></div>) : <div className="empty">No submissions yet.</div>}</div>}
      <footer className="panel-footer"><button onClick={() => { const next = !bookmark; setBookmark(next); patch({ bookmarks: { ...state.bookmarks, [problem.id]: next } }) }}>{bookmark ? '★ Bookmarked' : '☆ Bookmark'}</button><span>{state.statusByProblem?.[problem.id] || 'Not started'}</span></footer>
    </section>
    <section className="right-column">
      <div className="panel editor">
        <div className="editor-head"><div className="editor-title"><span className="code-mark">&lt;/&gt;</span><b>Code</b><span className="saved-indicator">● Saved locally</span></div><div className="editor-tools"><select aria-label="Programming language" value={language} onChange={event => { setLanguage(event.target.value); patch({ language: event.target.value }) }}><option value="python">Python3</option><option value="javascript">JavaScript</option></select><span className="tool-divider" /><button title="Decrease font size" onClick={() => setFontSize(size => Math.max(11, size - 1))}>A−</button><button title="Increase font size" onClick={() => setFontSize(size => Math.min(20, size + 1))}>A+</button><button className={wordWrap ? 'tool-active' : ''} title="Toggle word wrap" onClick={() => setWordWrap(value => !value)}>↵</button><button title="Reset code" onClick={resetCode}>⟲</button></div></div>
        <div className="editor-body" style={{ '--editor-font-size': `${fontSize}px` }}><div className="gutter">{code.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div><div className={`code-editor ${wordWrap ? 'word-wrap' : ''}`}><pre aria-hidden="true" dangerouslySetInnerHTML={{ __html: `${highlightCode(code, language)}\n` }} /><textarea aria-label="Code editor" value={code} onChange={event => updateCode(event.target.value)} onKeyDown={handleEditorKeyDown} spellCheck="false" autoCapitalize="off" autoComplete="off" autoCorrect="off" /></div></div>
        <div className="editor-status"><span>{language === 'python' ? 'Python 3' : 'JavaScript'} <i>•</i> UTF-8</span><span>Ln {code.split('\n').length}, Col 1 <i>•</i> {wordWrap ? 'Wrap: on' : 'Wrap: off'}</span></div>
      </div>
      <div className="panel tests">
        <nav className="tabs test-tabs"><button className={bottomTab === 'Testcase' ? 'active' : ''} onClick={() => setBottomTab('Testcase')}>▣ Testcase</button><button className={bottomTab === 'Test Result' ? 'active' : ''} onClick={() => setBottomTab('Test Result')}>⌁ Test Result {results && <span className={`tab-dot ${results.allPassed ? 'pass' : 'fail'}`} />}</button><button className="add-test" onClick={addTestCase}>＋ Add testcase</button></nav>
        {bottomTab === 'Testcase' ? <div className="testcase"><div className="case-tabs">{testCases.map((item, index) => <button className={activeCase === index ? 'active' : ''} onClick={() => setActiveCase(index)} key={index}>Case {index + 1}{index >= (problem.testCases || []).length ? ' · Custom' : ''}</button>)}</div>{testCases[activeCase] && <div className="case-detail"><div><b>Input</b><pre>{json(testCases[activeCase].args)}</pre></div><div><b>Expected</b><pre>{json(testCases[activeCase].expected)}</pre></div></div>}</div> : resultPanel}
      </div>
    </section>
  </main>

  const problemsView = <section className="full-view"><div className="view-heading"><div><div className="eyebrow">YOUR PRACTICE SPACE</div><h2>Problems</h2><p>Pick up where you left off or find your next challenge.</p></div><button className="orange-button" onClick={() => setModal('problem')}>＋ Create problem</button></div><div className="problem-stats"><div><small>Total</small><b>{problems.length}</b></div><div><small>Solved</small><b className="green">{problems.filter(item => state.statusByProblem?.[item.id] === 'Solved').length}</b></div><div><small>Attempted</small><b>{problems.filter(item => state.statusByProblem?.[item.id] === 'Attempted').length}</b></div><div><small>Bookmarked</small><b>{Object.values(state.bookmarks || {}).filter(Boolean).length}</b></div></div><div className="filters"><label className="search-field">⌕ <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by title or topic…" /></label><select aria-label="Company filter" value={company} onChange={event => setCompany(event.target.value)}><option value="all">All companies</option>{COMPANY_LIST.map(item => <option key={item}>{item}</option>)}</select><select aria-label="Difficulty filter" value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="all">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option></select><select aria-label="Status filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All status</option><option>Unsolved</option><option>Attempted</option><option>Solved</option></select></div><div className="problem-table"><table><thead><tr><th>Status</th><th>Title</th><th>Difficulty</th><th>Companies</th><th>Topic</th><th /></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><span className={`status-dot ${(state.statusByProblem?.[item.id] || '').toLowerCase()}`} />{state.statusByProblem?.[item.id] || 'Unsolved'}</td><td><b>{item.number}. {item.title}</b>{state.bookmarks?.[item.id] && <span className="row-bookmark"> ★</span>}</td><td><span className={`difficulty ${item.difficulty.toLowerCase()}`}>{item.difficulty}</span></td><td>{getProblemCompanies(item).slice(0, 3).join(', ') || '—'}</td><td>{item.topic}</td><td><button onClick={() => { patch({ currentProblemId: item.id }); setView('workspace'); setTab('Description') }}>Solve →</button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">No problems match these filters.</div>}</div></section>

  const sessionsView = <section className="full-view"><div className="view-heading"><div><div className="eyebrow">YOUR PROGRESS</div><h2>Sessions & Data</h2><p>Your practice history and locally saved workspace.</p></div><div className="session-actions">{timer.running ? <button className="orange-button" onClick={saveSession}>■ Finish session · {timer.formatted}</button> : <button className="orange-button" onClick={startSession}>▶ Start practice session</button>}<button className="secondary-button" onClick={() => setView('workspace')}>← Workspace</button></div></div><div className="stats"><div>Solved<strong>{problems.filter(item => state.statusByProblem?.[item.id] === 'Solved').length}</strong></div><div>Sessions<strong>{state.sessions?.length || 0}</strong></div><div>Submissions<strong>{Object.values(state.submissions || {}).flat().length}</strong></div><div>Storage<strong className="green">Local · active</strong></div></div><div className="session-grid"><div className="session-log"><h3>Practice sessions</h3>{state.sessions?.length ? state.sessions.map(item => <div className="session" key={item.id}><span>{item.title}<small>{item.durationMinutes} min · {item.problemsSolved} solved</small></span><button onClick={() => patch({ sessions: state.sessions.filter(session => session.id !== item.id) })}>Delete</button></div>) : <div className="empty">No sessions saved yet.</div>}</div><div className="backup"><h3>Data backup</h3><p>Export or restore your code, notes, bookmarks, and progress.</p><button onClick={() => exportBackup(state)}>↓ Export backup</button><button onClick={() => backupInput.current?.click()}>↑ Import backup</button><input ref={backupInput} className="backup-input" type="file" accept="application/json,.json" onChange={restoreBackup} /><button className="reset-button" onClick={() => { patch(resetState()); timer.reset(); setLanguage('python'); notify('Local data reset') }}>Reset all data</button></div></div></section>

  return <div className="platform">{header}<div className="content">{view === 'workspace' ? workspace : view === 'problems' ? problemsView : sessionsView}</div>{toast && <div className="toast">{toast}</div>}{modal === 'problem' && <div className="modal-bg"><form className="modal" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get('title')).trim(); if (!title) return; const id = `custom-${Date.now()}`; const fnName = String(form.get('fnName')).trim() || 'solve'; const custom = { id, number: problems.length + 100, title, difficulty: String(form.get('difficulty')), topic: String(form.get('topic')) || 'Custom', companies: [], fnName, paramNames: ['args'], description: `<p>${String(form.get('description')) || 'Solve the problem.'}</p>`, examples: [], constraints: ['Custom user problem'], hint: 'Write your solution.', testCases: [{ args: [1], expected: null }], starterCode: { python: `class Solution:\n    def ${fnName}(self, *args):\n        return None`, javascript: `var ${fnName} = function(...args) { return null; };` } }; patch({ customProblems: [...(state.customProblems || []), custom], currentProblemId: id }); setModal(null); setView('workspace'); notify('Custom problem created') }}><h3>Create a problem</h3><label>Title<input name="title" required /></label><div className="modal-row"><label>Difficulty<select name="difficulty"><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Topic<input name="topic" /></label></div><label>Function name<input name="fnName" defaultValue="solve" /></label><label>Description<textarea name="description" /></label><div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="orange-button">Save problem</button></div></form></div>}</div>
}
