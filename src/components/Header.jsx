import { useMemo } from 'react';

export default function Header({
  view, setView, problems, state, timer, onCompanyFilter
}) {
  const solvedCount = useMemo(() =>
    problems.filter(p => state.statusByProblem[p.id] === 'Solved').length
  , [problems, state.statusByProblem]);

  return (
    <header className="app-header">
      {/* Left */}
      <div className="header-section">
        <button className="btn btn-ghost" onClick={() => setView('workspace')}
          style={{ padding: '4px 8px' }}>
          <span className="logo">Your<span className="logo-accent">Code</span></span>
          <span className="logo-badge hide-mobile">OSS · Local</span>
        </button>

        <div className="tab-divider" />

        <button className="btn btn-ghost" onClick={() => setView('problems')}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <span className="hide-mobile">Problems</span>
        </button>

        <button className="btn-icon" title="Previous" onClick={() => onCompanyFilter('prev')}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <button className="btn-icon" title="Next" onClick={() => onCompanyFilter('next')}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
        <button className="btn-icon" title="Random" onClick={() => onCompanyFilter('random')}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
          </svg>
        </button>
      </div>

      {/* Center: Run & Submit */}
      <div className="header-section">
        <button className="btn btn-subtle" onClick={() => onCompanyFilter('run')} title="Run Code">
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          <span className="hide-mobile">Run</span>
        </button>
        <button className="btn btn-success" onClick={() => onCompanyFilter('submit')} title="Submit">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          Submit
        </button>
      </div>

      {/* Right */}
      <div className="header-section">
        <button className="btn btn-ghost hide-mobile" onClick={() => setView('sessions')}>
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-orange)' }}>
            <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
          </svg>
          <span style={{ fontWeight: 600 }}>{solvedCount}</span>
        </button>

        {/* Timer */}
        <div className="timer-pill">
          <div className={`timer-dot ${timer.running ? 'running' : ''}`} />
          <button className="btn-icon" onClick={timer.toggle} style={{ padding: 2 }}>
            {timer.running ? '⏸' : '▶'}
          </button>
          <span className="timer-display">{timer.formatted}</span>
          <button className="btn-icon" onClick={timer.reset} style={{ padding: 2, fontSize: 14 }}>↻</button>
        </div>

        <button className="btn btn-ghost hide-mobile" onClick={() => setView('sessions')}
          style={{ background: 'var(--accent-orange-dim)', color: 'var(--accent-orange)', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>
          Sessions
          <span style={{
            fontSize: 10, padding: '1px 6px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(245,158,11,0.15)'
          }}>{state.sessions?.length || 0}</span>
        </button>
      </div>
    </header>
  );
}
