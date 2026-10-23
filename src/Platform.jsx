import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  faAirbnb,
  faAmazon,
  faApple,
  faMeta,
  faSpotify,
  faStripe,
  faTiktok,
  faUber,
} from '@fortawesome/free-brands-svg-icons'
import {
  siAutodesk,
  siBytedance,
  siDatabricks,
  siGoldmansachs,
  siNetflix,
  siNvidia,
  siSnowflake,
} from 'simple-icons'
import { COMPANY_LIST, DEFAULT_PROBLEMS, getProblemCompanies } from './data/problems'
import { useTimer, useToast } from './hooks/useToast'
import { executeCode } from './utils/executor'
import { createDefaultState, exportBackup, importBackup, loadState, resetState, saveState } from './utils/storage'
import { highlightCode as highlightSolution } from './utils/highlighter'
import './Platform.css'

const json = value => JSON.stringify(value, null, 2)
const formatInput = (args, names = []) => args.map((value, index) => `${names[index] || `arg${index + 1}`} =\n${JSON.stringify(value)}`).join('\n')
const formatOutput = value => typeof value === 'string' ? value : JSON.stringify(value) ?? String(value)

const COMPANY_BRANDS = {
  Google: { custom: 'google' },
  Meta: { fontAwesome: faMeta, color: '#0866ff' },
  Amazon: { fontAwesome: faAmazon, color: '#ff9900' },
  Microsoft: { custom: 'microsoft' },
  Apple: { fontAwesome: faApple, color: '#f4f4f4' },
  NVIDIA: { simpleIcon: siNvidia, color: '#76b900' },
  Netflix: { simpleIcon: siNetflix, color: '#e50914' },
  Bloomberg: { custom: 'bloomberg' },
  Uber: { fontAwesome: faUber, color: '#f4f4f4' },
  Stripe: { fontAwesome: faStripe, color: '#635bff' },
  ByteDance: { simpleIcon: siBytedance, color: '#3c8cff' },
  Databricks: { simpleIcon: siDatabricks, color: '#ff3621' },
  Snowflake: { simpleIcon: siSnowflake, color: '#29b5e8' },
  Spotify: { fontAwesome: faSpotify, color: '#1ed760' },
  Airbnb: { fontAwesome: faAirbnb, color: '#ff5a5f' },
  'Oracle Cloud': { custom: 'oracle' },
  Oracle: { custom: 'oracle' },
  'Goldman Sachs': { simpleIcon: siGoldmansachs, color: '#75aadb' },
  Adobe: { custom: 'adobe' },
  TikTok: { fontAwesome: faTiktok, color: '#25f4ee' },
  'Capital One': { custom: 'capital-one' },
  Autodesk: { simpleIcon: siAutodesk, color: '#0696d7' },
  'Scale AI': { custom: 'scale-ai' },
}

const TIER1_SPOTLIGHTS = [
  {
    name: 'Google',
    monogram: 'G',
    monogramTone: 'amber',
    badge: '🔥 TOP VOLUME',
    badgeTone: 'amber',
    cardTone: 'amber',
    sector: 'Big Tech',
    category: 'Big Tech',
    totalQuestions: 1420,
    subtitle: '1,420 Questions · Top 50 High Frequency',
    easy: 410,
    med: 720,
    hard: 290,
    reportsText: '+118 reports this week',
    ctaColor: 'amber',
  },
  {
    name: 'Meta',
    monogram: 'M',
    monogramTone: 'green',
    badge: 'TOP SPEED BAR',
    badgeTone: 'green',
    cardTone: 'green',
    sector: 'Social & AI',
    category: 'Big Tech',
    totalQuestions: 980,
    subtitle: '980 Questions · Top 100 Crucial',
    easy: 280,
    med: 540,
    hard: 160,
    reportsText: '+94 reports this week',
    ctaColor: 'green',
  },
  {
    name: 'Amazon',
    monogram: 'A',
    monogramTone: 'amber',
    badge: 'LP & CORE',
    badgeTone: 'amber',
    cardTone: 'amber',
    sector: 'Cloud & Retail',
    category: 'Big Tech',
    totalQuestions: 1650,
    subtitle: '1,650 Questions · Top 75 High Frequency',
    easy: 510,
    med: 890,
    hard: 250,
    reportsText: '+145 reports this week',
    ctaColor: 'amber',
  },
  {
    name: 'Microsoft',
    monogram: 'MS',
    monogramTone: 'rose',
    badge: 'ENTERPRISE',
    badgeTone: 'rose',
    cardTone: 'rose',
    sector: 'Cloud & OS',
    category: 'Enterprise & Cloud',
    totalQuestions: 890,
    subtitle: '890 Questions · Top 50 Essential',
    easy: 310,
    med: 460,
    hard: 120,
    reportsText: '+78 reports this week',
    ctaColor: 'light',
  },
]

const ARCHIVE_COMPANIES = [
  {
    name: 'Apple',
    monogram: '',
    monogramTone: 'slate',
    tag: 'Hardware & OS',
    tagTone: 'default',
    category: 'Big Tech',
    totalQuestions: 540,
    subtitle: '540 Questions · Top 40 Essential',
    easy: 180,
    med: 270,
    hard: 90,
    footerLeft: '42 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'amber',
  },
  {
    name: 'NVIDIA',
    monogram: 'NV',
    monogramTone: 'green',
    tag: 'AI Compute',
    tagTone: 'green',
    category: 'AI & Semiconductors',
    totalQuestions: 380,
    subtitle: '380 Questions · CUDA & Systems',
    easy: 95,
    med: 195,
    hard: 90,
    footerLeft: '🔥 Trending +64%',
    footerLeftTone: 'green',
    ctaTone: 'green',
  },
  {
    name: 'Netflix',
    monogram: 'N',
    monogramTone: 'rose',
    tag: 'Streaming',
    tagTone: 'default',
    category: 'Big Tech',
    totalQuestions: 190,
    subtitle: '190 Questions · Top 25 System Focus',
    easy: 40,
    med: 100,
    hard: 50,
    footerLeft: '28 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'rose',
  },
  {
    name: 'Bloomberg',
    monogram: 'BB',
    monogramTone: 'amber',
    tag: 'Fintech & Data',
    tagTone: 'default',
    category: 'Fintech & Quant',
    totalQuestions: 670,
    subtitle: '670 Questions · Top 50 High Frequency',
    easy: 210,
    med: 360,
    hard: 100,
    footerLeft: '62 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'rose',
  },
  {
    name: 'Uber',
    monogram: 'U',
    monogramTone: 'green',
    tag: 'Mobility',
    tagTone: 'default',
    category: 'Unicorns & Startups',
    totalQuestions: 410,
    subtitle: '410 Questions · Top 35 High Yield',
    easy: 120,
    med: 230,
    hard: 60,
    footerLeft: '35 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'green',
  },
  {
    name: 'Stripe',
    monogram: 'S',
    monogramTone: 'amber',
    tag: 'Payments',
    tagTone: 'default',
    category: 'Fintech & Quant',
    totalQuestions: 240,
    subtitle: '240 Questions · Practical Integration',
    easy: 50,
    med: 140,
    hard: 50,
    footerLeft: 'High Practical Bar',
    footerLeftTone: 'amber',
    ctaTone: 'amber',
  },
  {
    name: 'ByteDance',
    monogram: 'BD',
    monogramTone: 'rose',
    tag: 'Global Social',
    tagTone: 'default',
    category: 'Big Tech',
    totalQuestions: 510,
    subtitle: '510 Questions · Heavy Algorithm Focus',
    easy: 130,
    med: 260,
    hard: 120,
    footerLeft: '55 reports/mo',
    footerLeftTone: 'green',
    ctaTone: 'rose',
  },
  {
    name: 'Databricks',
    monogram: 'DB',
    monogramTone: 'green',
    tag: 'Data Lake',
    tagTone: 'default',
    category: 'Enterprise & Cloud',
    totalQuestions: 220,
    subtitle: '220 Questions · Concurrency & Systems',
    easy: 30,
    med: 120,
    hard: 70,
    footerLeft: '24 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'green',
  },
  {
    name: 'Snowflake',
    monogram: 'SF',
    monogramTone: 'slate',
    tag: 'Cloud DB',
    tagTone: 'default',
    category: 'Enterprise & Cloud',
    totalQuestions: 185,
    subtitle: '185 Questions · Core SQL & Algorithms',
    easy: 35,
    med: 110,
    hard: 40,
    footerLeft: '19 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'amber',
  },
  {
    name: 'Spotify',
    monogram: 'SP',
    monogramTone: 'green',
    tag: 'Audio Tech',
    tagTone: 'default',
    category: 'Unicorns & Startups',
    totalQuestions: 210,
    subtitle: '210 Questions · Recommendation & DP',
    easy: 60,
    med: 120,
    hard: 30,
    footerLeft: '22 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'green',
  },
  {
    name: 'Airbnb',
    monogram: 'AB',
    monogramTone: 'rose',
    tag: 'Travel Tech',
    tagTone: 'default',
    category: 'Unicorns & Startups',
    totalQuestions: 175,
    subtitle: '175 Questions · Graph & Search Focus',
    easy: 45,
    med: 95,
    hard: 35,
    footerLeft: '18 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'rose',
  },
  {
    name: 'Oracle Cloud',
    monogram: 'OR',
    monogramTone: 'slate',
    tag: 'Infrastructure',
    tagTone: 'default',
    category: 'Enterprise & Cloud',
    totalQuestions: 310,
    subtitle: '310 Questions · Systems & OCI',
    easy: 85,
    med: 175,
    hard: 50,
    footerLeft: '27 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'amber',
  },
  {
    name: 'Goldman Sachs',
    monogram: 'GS',
    monogramTone: 'amber',
    tag: 'Quant & Markets',
    tagTone: 'default',
    category: 'Fintech & Quant',
    totalQuestions: 295,
    subtitle: '295 Questions · DP & Probability',
    easy: 80,
    med: 155,
    hard: 60,
    footerLeft: '31 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'amber',
  },
  {
    name: 'Adobe',
    monogram: 'AD',
    monogramTone: 'rose',
    tag: 'Creative Cloud',
    tagTone: 'default',
    category: 'Enterprise & Cloud',
    totalQuestions: 260,
    subtitle: '260 Questions · Trees & Geometry',
    easy: 90,
    med: 130,
    hard: 40,
    footerLeft: '21 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'rose',
  },
  {
    name: 'TikTok',
    monogram: 'TT',
    monogramTone: 'green',
    tag: 'Short Video & AI',
    tagTone: 'default',
    category: 'Big Tech',
    totalQuestions: 430,
    subtitle: '430 Questions · Hard Graph & DP',
    easy: 90,
    med: 230,
    hard: 110,
    footerLeft: '49 reports/mo',
    footerLeftTone: 'green',
    ctaTone: 'green',
  },
  {
    name: 'Capital One',
    monogram: 'C1',
    monogramTone: 'slate',
    tag: 'Digital Banking',
    tagTone: 'default',
    category: 'Fintech & Quant',
    totalQuestions: 195,
    subtitle: '195 Questions · Arrays & OOD',
    easy: 75,
    med: 95,
    hard: 25,
    footerLeft: '26 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'amber',
  },
  {
    name: 'Autodesk',
    monogram: 'AU',
    monogramTone: 'slate',
    tag: 'CAD & 3D',
    tagTone: 'default',
    category: 'Enterprise & Cloud',
    totalQuestions: 140,
    subtitle: '140 Questions · Graphs & Matrices',
    easy: 45,
    med: 75,
    hard: 20,
    footerLeft: '14 reports/mo',
    footerLeftTone: 'muted',
    ctaTone: 'green',
  },
  {
    name: 'Scale AI',
    monogram: 'SC',
    monogramTone: 'green',
    tag: 'Data Foundry',
    tagTone: 'green',
    category: 'AI & Semiconductors',
    totalQuestions: 165,
    subtitle: '165 Questions · Practical & Systems',
    easy: 35,
    med: 90,
    hard: 40,
    footerLeft: '🔥 Trending +42%',
    footerLeftTone: 'green',
    ctaTone: 'green',
  },
]

const CATEGORY_TABS = [
  'All Companies',
  'Big Tech',
  'Fintech & Quant',
  'Unicorns & Startups',
  'AI & Semiconductors',
  'Enterprise & Cloud',
]

const CompanyLogo = ({ name }) => {
  const brand = COMPANY_BRANDS[name]
  const svgColor = brand?.color || '#b8b8b8'

  if (brand?.custom === 'google') {
    return (
      <span className="company-logo" title="Google logo">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
      </span>
    )
  }

  if (brand?.custom === 'microsoft') {
    return (
      <span className="company-logo" title="Microsoft logo">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <rect x="1.5" y="1.5" width="9.8" height="9.8" fill="#F25022" rx="1"/>
          <rect x="12.7" y="1.5" width="9.8" height="9.8" fill="#7FBA00" rx="1"/>
          <rect x="1.5" y="12.7" width="9.8" height="9.8" fill="#00A4EF" rx="1"/>
          <rect x="12.7" y="12.7" width="9.8" height="9.8" fill="#FFB900" rx="1"/>
        </svg>
      </span>
    )
  }

  if (brand?.custom === 'adobe') {
    return (
      <span className="company-logo" title="Adobe logo">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path fill="#ED1C24" d="M14.58 2H24v20zM9.42 2H0v20zM12 9.17L16.42 22h-3.66l-1.39-3.83H8.38z" />
        </svg>
      </span>
    )
  }

  if (brand?.custom === 'oracle') {
    return (
      <span className="company-logo" title="Oracle logo">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path fill="#F80000" d="M16.4 4.5H7.6C3.4 4.5 0 7.9 0 12.1s3.4 7.6 7.6 7.6h8.8c4.2 0 7.6-3.4 7.6-7.6s-3.4-7.6-7.6-7.6zm-.3 11.7H7.9c-2.3 0-4.1-1.8-4.1-4.1s1.8-4.1 4.1-4.1h8.2c2.3 0 4.1 1.8 4.1 4.1 0 2.2-1.9 4.1-4.1 4.1z"/>
        </svg>
      </span>
    )
  }

  if (brand?.custom === 'bloomberg') {
    return (
      <span className="company-logo" title="Bloomberg logo">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path fill="#F4F4F4" d="M6 3.5h7.2c2.8 0 4.8 1.8 4.8 4.2 0 1.8-1 3.2-2.5 3.8 2 .6 3.3 2.2 3.3 4.3 0 2.6-2.2 4.7-5.2 4.7H6V3.5zm3.6 6.3h3.2c1 0 1.7-.7 1.7-1.7s-.7-1.7-1.7-1.7H9.6v3.4zm0 7.5h3.6c1.2 0 2-.8 2-2s-.8-2-2-2H9.6v4z"/>
        </svg>
      </span>
    )
  }

  if (brand?.custom === 'capital-one') {
    return (
      <span className="company-logo" title="Capital One logo">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path fill="#D03027" d="M2.5 13.5c4.5-5.2 12.2-7.8 19-5.5-5.2 1.2-10.5 4.8-14.2 9.2-1.8 2.1-3.6 2.3-4.8 1.2-1.2-1.1-1.1-3.2 0-4.9z"/>
          <path fill="#004B8D" d="M11 6.5h3.2l-3.8 11H7.2l3.8-11z"/>
        </svg>
      </span>
    )
  }

  if (brand?.custom === 'scale-ai') {
    return (
      <span className="company-logo" title="Scale AI logo">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path fill="#A78BFA" d="M12 2L2 7.5v9L12 22l10-5.5v-9L12 2zm0 2.5l7.5 4.1-3.2 1.8L8.8 6.3 12 4.5zM4.2 9l6.8 3.7v7.5L4.2 16.5V9zm8.8 11.2V12.7l3.2-1.8v7.4l-3.2 1.9zm4.2-3.2v-7.4l2.8-1.5v7.4l-2.8 1.5z"/>
        </svg>
      </span>
    )
  }

  if (brand?.fontAwesome) {
    const [width, height, , , paths] = brand.fontAwesome.icon
    return (
      <span className="company-logo" title={`${name} logo`}>
        <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`}>
          <path fill={svgColor} d={Array.isArray(paths) ? paths.join(' ') : paths} />
        </svg>
      </span>
    )
  }

  if (brand?.simpleIcon) {
    return (
      <span className="company-logo" title={`${name} logo`}>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path fill={svgColor} d={brand.simpleIcon.path} />
        </svg>
      </span>
    )
  }

  const initials = name.slice(0, 2).toUpperCase()
  return (
    <span className="company-logo fallback" title={`${name} logo`}>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect width="24" height="24" rx="5" fill="#202430" />
        <text x="12" y="16" fill="#cbd5e1" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
          {initials}
        </text>
      </svg>
    </span>
  )
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
    'editor.background': '#0d0e12',
    'editorGutter.background': '#0d0e12',
    'editorLineNumber.foreground': '#475569',
    'editorLineNumber.activeForeground': '#cbd5e1',
    'editor.lineHighlightBackground': '#15171e',
    'editor.selectionBackground': '#f59e0b28',
    'editorCursor.foreground': '#f59e0b',
    'editorWidget.background': '#13151b',
    'editorSuggestWidget.background': '#13151b',
    'editorSuggestWidget.border': '#262936',
    'editorSuggestWidget.selectedBackground': '#1e212b',
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
  const [homeCategory, setHomeCategory] = useState('All Companies')
  const [homeSort, setHomeSort] = useState('Most Questions')
  const [companyPractice, setCompanyPractice] = useState(null)
  const [difficulty, setDifficulty] = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [hint, setHint] = useState(false)
  const [modal, setModal] = useState(null)
  const [bookmark, setBookmark] = useState(false)
  const [fontSize, setFontSize] = useState(15)
  const [wordWrap, setWordWrap] = useState(false)
  const [customCases, setCustomCases] = useState({})
  const [busy, setBusy] = useState(false)
  const [runError, setRunError] = useState('')
  const [executionStatus, setExecutionStatus] = useState('idle')
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 })
  const [seenAnswer, setSeenAnswer] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})

  const backupInput = useRef(null)
  const globalSearchInput = useRef(null)
  const editorCursorListener = useRef(null)

  const problems = useMemo(() => [...DEFAULT_PROBLEMS, ...(state.customProblems || [])], [state.customProblems])
  const problem = problems.find(item => item.id === state.currentProblemId) || problems[0]
  const testCases = [...(problem.testCases || []), ...(customCases[problem.id] || [])]
  const companies = getProblemCompanies(problem)
  const selectedCompanyProblems = problems
    .filter(item => getProblemCompanies(item).includes(selectedHomeCompany))
    .sort((first, second) => first.number - second.number)
  const selectedCompanySolved = selectedCompanyProblems.filter(item => state.statusByProblem?.[item.id] === 'Solved').length
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
    saveState({
      ...state,
      language,
      activeSession: { ...state.activeSession, elapsedSeconds: timerSeconds, running: timerRunning },
    }).catch(error => setStorageError(error.message || 'Could not save local SQLite data'))
  }, [state, language, timerSeconds, timerRunning, storageReady])

  useEffect(() => {
    const onKeyDown = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        globalSearchInput.current?.focus()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Enter') {
        event.preventDefault()
        run(true)
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
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
    const next = direction === 'random'
      ? Math.floor(Math.random() * problems.length)
      : (index + direction + problems.length) % problems.length
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
    const queue = problems
      .filter(item => getProblemCompanies(item).includes(companyName))
      .sort((first, second) => first.number - second.number)
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
      const outcome = await executeCode({
        code,
        language,
        fnName: problem.fnName,
        testCases,
        unordered: problem.id === 'generate-parentheses',
        onStatus: setExecutionStatus,
      })
      setResults(outcome)
      if (submit) {
        patch({
          statusByProblem: { ...state.statusByProblem, [problem.id]: outcome.allPassed ? 'Solved' : 'Attempted' },
          activeSession: outcome.allPassed
            ? { ...state.activeSession, solvedInSession: [...new Set([...(state.activeSession?.solvedInSession || []), problem.id])] }
            : state.activeSession,
          submissions: {
            ...state.submissions,
            [problem.id]: [
              {
                status: outcome.allPassed ? 'Accepted' : 'Wrong Answer',
                language,
                passed: outcome.passed,
                total: outcome.total,
                runtimeMs: outcome.totalMs,
                timestamp: new Date().toLocaleString(),
                code,
              },
              ...(state.submissions?.[problem.id] || []),
            ],
          },
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
      setExecutionStatus(current => (current === 'error' ? current : 'ready'))
    }
  }

  const filtered = problems.filter(item => {
    const matchesStatus = statusFilter === 'all' || (state.statusByProblem?.[item.id] || 'Unsolved') === statusFilter
    return (
      matchesStatus &&
      (company === 'all' || getProblemCompanies(item).includes(company)) &&
      (difficulty === 'all' || item.difficulty === difficulty) &&
      `${item.title} ${item.topic}`.toLowerCase().includes(search.toLowerCase())
    )
  })

  const visibleArchiveCompanies = useMemo(() => {
    const query = homeSearch.trim().toLowerCase()
    const base = ARCHIVE_COMPANIES.filter(item => {
      const matchesCat = homeCategory === 'All Companies' || item.category === homeCategory
      const matchesSearch = !query || item.name.toLowerCase().includes(query) || item.tag.toLowerCase().includes(query)
      return matchesCat && matchesSearch
    })
    if (homeSort === 'Alphabetical') {
      return [...base].sort((a, b) => a.name.localeCompare(b.name))
    }
    return [...base].sort((a, b) => b.totalQuestions - a.totalQuestions)
  }, [homeSearch, homeCategory, homeSort])

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
    const session = {
      id: Date.now(),
      title: `Practice · ${startedAt.toLocaleDateString()}`,
      durationMinutes: Math.max(1, Math.round(timerSeconds / 60)),
      problemsSolved: active.solvedInSession?.length || 0,
      date: startedAt.toISOString(),
    }
    patch({
      sessions: [session, ...(state.sessions || [])],
      activeSession: { running: false, elapsedSeconds: 0, startedAt: null, solvedInSession: [] },
    })
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
    setCustomCases(current => ({
      ...current,
      [problem.id]: [...(current[problem.id] || []), { args: initial.args, expected: null }],
    }))
    setBottomTab('Testcase')
    setActiveCase(testCases.length)
    notify('Custom testcase added')
  }

  const header = (
    <header className="platform-header">
      <div className="header-left">
        <button className="brand-button" onClick={() => setView('home')} title="YourCode Home">
          <div className="brand-icon">
            <span>&lt;&gt;</span>
          </div>
          <span className="brand-text">Your<span className="brand-accent">Code</span></span>
        </button>

        <nav className="header-nav-links" aria-label="Primary Navigation">
          <button
            className={`nav-tab-btn ${view === 'home' ? 'active' : ''}`}
            onClick={() => setView('home')}
          >
            Explore
          </button>
          <button
            className={`nav-tab-btn ${view === 'problems' || view === 'workspace' ? 'active' : ''}`}
            onClick={() => setView('problems')}
          >
            Problems
          </button>
          <button
            className="nav-tab-btn"
            onClick={() => startCompanyPractice(selectedHomeCompany)}
          >
            Contest
          </button>
          <button
            className="nav-tab-btn"
            onClick={() => {
              setView('workspace')
              setTab('Editorial & Notes')
            }}
          >
            Discuss
          </button>
          <button
            className={`nav-tab-btn ${companyPractice ? 'active' : ''}`}
            onClick={() => setView('home')}
          >
            Interview
          </button>
          <button
            className={`nav-tab-btn ${view === 'sessions' ? 'active' : ''}`}
            onClick={() => setView('sessions')}
          >
            Store
          </button>
        </nav>

        {view === 'workspace' && !companyPractice && (
          <div className="problem-nav-group">
            <button className="icon-nav-btn" aria-label="Previous problem" title="Previous problem" onClick={() => moveProblem(-1)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button className="icon-nav-btn" aria-label="Next problem" title="Next problem" onClick={() => moveProblem(1)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <button className="icon-nav-btn" aria-label="Random problem" title="Random problem" onClick={() => moveProblem('random')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>
            </button>
            <span className="problem-crumb-pill" title={`${problem.number}. ${problem.title}`}>
              <span className="crumb-num">#{problem.number}</span>
              <span className="crumb-title">{problem.title}</span>
            </span>
          </div>
        )}
      </div>

      {view === 'workspace' && (
        <div className="header-center">
          <div className="run-controls">
            <button className="run-button-clean" onClick={() => run(false)} disabled={busy} title="Run Code (Ctrl + Enter)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>{busy ? 'Running…' : 'Run'}</span>
              <kbd className="shortcut-badge">Ctrl ↵</kbd>
            </button>
            <button className="submit-button-clean" onClick={() => run(true)} disabled={busy} title="Submit Solution (Ctrl + Shift + Enter)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Submit</span>
            </button>
          </div>
        </div>
      )}

      <div className="header-right">
        <div className="header-global-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={globalSearchInput}
            value={view === 'problems' ? search : homeSearch}
            onChange={event => {
              if (view === 'problems') setSearch(event.target.value)
              else setHomeSearch(event.target.value)
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && view === 'workspace') {
                setSearch(event.currentTarget.value)
                setView('problems')
              }
            }}
            placeholder="Search problems, companies, tags..."
          />
          <kbd className="cmd-k-badge">⌘K</kbd>
        </div>

        <button
          className="streak-pill-btn"
          onClick={() => setView('problems')}
          title={`${totalSolved} problems solved locally`}
        >
          <span className="flame-glyph">🔥</span>
          <span>{totalSolved || 19}</span>
        </button>

        <div className="host-status-pill" title="Local SQLite & Execution Daemon">
          <span className={`host-dot ${storageError ? 'error' : 'active'}`} />
          <span className="host-address">127.0.0.1:8080</span>
        </div>

        <div className="timer-pill-clean" title="Session Timer">
          <button
            className="timer-btn"
            aria-label={timerRunning ? 'Pause timer' : 'Start timer'}
            onClick={toggleTimer}
          >
            {timerRunning ? '❚❚' : '▶'}
          </button>
          <span className="timer-time-display">{formattedTime}</span>
          <button className="timer-btn" aria-label="Reset timer" onClick={resetTimer}>
            ↺
          </button>
        </div>

        <button
          className={`notif-bell-btn ${view === 'sessions' ? 'active' : ''}`}
          onClick={() => setView('sessions')}
          title="Practice Sessions & SQLite Sync"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="notif-dot" />
        </button>

        <button className="avatar-pill-wrap" onClick={() => setView('sessions')} title="Local Profile & Backups">
          <span className="avatar-circle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span className="avatar-caret">▾</span>
        </button>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmark ? '#f59e0b' : 'none'} stroke={bookmark ? '#f59e0b' : 'currentColor'} strokeWidth="2">
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
          <span>💡 Hint</span>
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
              <span className={`accordion-chevron ${expandedSections[section] ? 'open' : ''}`}>▾</span>
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
    </div>
  )

  const activeResult = results?.results?.[activeCase]
  const verdict = results?.allPassed
    ? 'Accepted'
    : results?.firstFailed?.error
      ? (results.firstFailed.errorType === 'SyntaxError' ? 'Syntax Error' : 'Runtime Error')
      : 'Wrong Answer'

  const executionStatusLabel = language === 'python'
    ? ({ idle: 'Python Worker Idle', loading: 'Loading Pyodide…', running: 'Running Python…', ready: 'Python Ready', error: 'Python Error' }[executionStatus] || 'Python Ready')
    : ({ running: 'Running JavaScript…', error: 'JavaScript Error' }[executionStatus] || 'JavaScript Ready')

  const resultPanel = runError ? (
    <div className="execution-error-clean">
      <div className="error-badge">
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
          + Contribute a custom testcase
        </button>
      </div>
    </div>
  ) : (
    <div className="empty-results-clean">
      <div className="empty-results-icon">▶</div>
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
            <span className="solved-pill">
              {companyPractice.problemIds.filter(id => state.statusByProblem?.[id] === 'Solved').length} Solved
            </span>
          </div>
          <div className="practice-actions">
            <button
              className="primary-glow-btn"
              onClick={advanceCompanyPractice}
              disabled={state.statusByProblem?.[problem.id] !== 'Solved' || busy}
            >
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
            {['Description', 'Editorial & Notes', 'Solutions', 'Submissions'].map(id => (
              <button
                className={`panel-tab-btn ${tab === id ? 'active' : ''}`}
                onClick={() => setTab(id)}
                key={id}
              >
                <span>{id}</span>
              </button>
            ))}
          </nav>

          <div className="left-panel-content">
            {tab === 'Description' && description}
            {tab === 'Editorial & Notes' && (
              <div className="notes-view">
                <div className="hint-card-clean">
                  <div className="hint-card-header">
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
              <span>{bookmark ? '★ Bookmarked' : '☆ Bookmark'}</span>
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
                  <select
                    aria-label="Programming language"
                    value={language}
                    onChange={event => {
                      setLanguage(event.target.value)
                      patch({ language: event.target.value })
                    }}
                  >
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                  <span className="select-arrow">▾</span>
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
                <span>Testcase</span>
              </button>
              <button
                className={`panel-tab-btn ${bottomTab === 'Test Result' ? 'active' : ''}`}
                onClick={() => setBottomTab('Test Result')}
              >
                <span>Test Result</span>
                {results && <span className={`tab-dot ${results.allPassed ? 'pass' : 'fail'}`} />}
              </button>
              <button className="add-case-btn" onClick={addTestCase}>
                <span>+ Add Testcase</span>
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
      {/* Top Hero Header */}
      <div className="archive-hero-header">
        <div className="archive-hero-left">
          <div className="archive-kicker">
            <span className="kicker-bar" />
            <span>COMPANY CURATED ARCHIVES</span>
          </div>
          <h1 className="archive-main-title">Prepare by Company</h1>
          <p className="archive-subtitle">
            Target verified algorithmic interview questions, frequency distributions, and recently reported phone screen patterns from top engineering organizations.
          </p>
        </div>

        <div className="telemetry-badge-card">
          <div className="telemetry-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className="telemetry-copy">
            <b>65+ Companies</b>
            <span>Updated daily via interview telemetry</span>
          </div>
        </div>
      </div>

      {/* High-Yield Tier 1 Spotlights */}
      <div className="spotlights-section">
        <div className="spotlights-header-row">
          <div className="spotlights-title">
            <span className="flame-icon">🔥</span>
            <h2>High-Yield Tier 1 Spotlights</h2>
          </div>
          <span className="spotlights-sort-note">Sorted by interview reports (Last 30 Days)</span>
        </div>

        <div className="tier1-grid">
          {TIER1_SPOTLIGHTS.map(item => {
            const isSelected = selectedHomeCompany === item.name
            return (
              <div
                key={item.name}
                className={`spotlight-card tone-${item.cardTone} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedHomeCompany(item.name)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedHomeCompany(item.name)
                  }
                }}
              >
                <div className="spotlight-card-top">
                  <div className={`monogram-box tone-${item.monogramTone}`}>
                    <CompanyLogo name={item.name} />
                  </div>
                  <span className={`spotlight-pill tone-${item.badgeTone}`}>
                    {item.badge}
                  </span>
                </div>

                <div className="spotlight-name-row">
                  <h3>{item.name}</h3>
                  <span className="sector-chip">{item.sector}</span>
                </div>

                <p className="spotlight-meta-line">{item.subtitle}</p>

                <div className="difficulty-counts-row">
                  <span className="diff-count easy">Easy <b>{item.easy}</b></span>
                  <span className="diff-sep">·</span>
                  <span className="diff-count med">Med <b>{item.med}</b></span>
                  <span className="diff-sep">·</span>
                  <span className="diff-count hard">Hard <b>{item.hard}</b></span>
                </div>

                <div className="spotlight-card-footer">
                  <span className="weekly-reports">{item.reportsText}</span>
                  <button
                    type="button"
                    className={`start-prep-link tone-${item.ctaColor}`}
                    onClick={e => {
                      e.stopPropagation()
                      startCompanyPractice(item.name)
                    }}
                  >
                    Start Prep →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Category Filter Pills + Search + Sort Bar */}
      <div className="company-controls-bar">
        <div className="category-tabs" role="tablist" aria-label="Company categories">
          {CATEGORY_TABS.map(cat => (
            <button
              key={cat}
              type="button"
              className={`category-tab-pill ${homeCategory === cat ? 'active' : ''}`}
              onClick={() => setHomeCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="company-controls-right">
          <div className="archive-search-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              aria-label="Search companies"
              value={homeSearch}
              onChange={event => setHomeSearch(event.target.value)}
              placeholder="Search companies..."
            />
            {homeSearch && (
              <button type="button" className="search-clear-btn" onClick={() => setHomeSearch('')}>×</button>
            )}
          </div>

          <div className="archive-sort-pill">
            <span className="sort-label">Sort:</span>
            <select
              aria-label="Sort companies"
              value={homeSort}
              onChange={event => setHomeSort(event.target.value)}
            >
              <option value="Most Questions">Most Questions</option>
              <option value="Alphabetical">Alphabetical</option>
            </select>
            <span className="sort-caret">▾</span>
          </div>
        </div>
      </div>

      {/* 4-Column Company Archive Grid */}
      <div className="company-archive-grid">
        {visibleArchiveCompanies.map(item => {
          const isSelected = selectedHomeCompany === item.name
          const hasLocalSet = COMPANY_LIST.includes(item.name)
          return (
            <div
              key={item.name}
              className={`archive-company-card ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                setSelectedHomeCompany(item.name)
                if (!hasLocalSet) {
                  notify(`Showing curated telemetry for ${item.name}`)
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedHomeCompany(item.name)
                }
              }}
            >
              <div className="archive-card-top">
                <div className={`monogram-box small tone-${item.monogramTone}`}>
                  <CompanyLogo name={item.name} />
                </div>
                <span className={`archive-sector-badge tone-${item.tagTone}`}>
                  {item.tag}
                </span>
              </div>

              <h3 className="archive-company-name">{item.name}</h3>
              <p className="archive-company-sub">{item.subtitle}</p>

              <div className="difficulty-counts-row compact">
                <span className="diff-count easy">Easy <b>{item.easy}</b></span>
                <span className="diff-sep">·</span>
                <span className="diff-count med">Med <b>{item.med}</b></span>
                <span className="diff-sep">·</span>
                <span className="diff-count hard">Hard <b>{item.hard}</b></span>
              </div>

              <div className="archive-card-footer">
                <span className={`archive-report-metric tone-${item.footerLeftTone}`}>
                  {item.footerLeft}
                </span>
                <button
                  type="button"
                  className={`explore-link tone-${item.ctaTone}`}
                  onClick={e => {
                    e.stopPropagation()
                    if (hasLocalSet) {
                      startCompanyPractice(item.name)
                    } else {
                      setSelectedHomeCompany(item.name)
                      setView('problems')
                    }
                  }}
                >
                  Explore →
                </button>
              </div>
            </div>
          )
        })}
        {!visibleArchiveCompanies.length && (
          <div className="home-no-companies">No companies found matching “{homeSearch}”.</div>
        )}
      </div>

      {/* Selected Company Curated Question Set Drawer */}
      <section className="selected-company-drawer">
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div className="company-large-logo">
              <CompanyLogo name={selectedHomeCompany} />
            </div>
            <div>
              <span className="eyebrow-clean">LOCAL WORKSPACE QUESTION BANK · {selectedHomeCompany.toUpperCase()}</span>
              <h2>{selectedHomeCompany} Curated Problems</h2>
              <p>
                {selectedCompanyProblems.length} local interactive problems <span className="dot-sep">·</span> {selectedCompanySolved} solved
              </p>
            </div>
          </div>

          <div className="drawer-actions">
            <button className="primary-glow-btn" onClick={() => startCompanyPractice(selectedHomeCompany)}>
              {selectedCompanySolved === selectedCompanyProblems.length && selectedCompanyProblems.length
                ? 'Review Set →'
                : `Start ${selectedHomeCompany} Practice →`}
            </button>
            <button
              className="secondary-btn-clean"
              onClick={() => openProblem(problem.id)}
            >
              Resume #{problem.number} {problem.title}
            </button>
            <button
              className="secondary-btn-clean"
              onClick={() => {
                setCompany(COMPANY_LIST.includes(selectedHomeCompany) ? selectedHomeCompany : 'all')
                setSearch('')
                setDifficulty('all')
                setStatusFilter('all')
                setView('problems')
              }}
            >
              Full Directory
            </button>
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
                <span className="question-row-arrow">→</span>
              </button>
            )
          }) : (
            <div className="empty">No local questions tagged for {selectedHomeCompany} yet. Click "Create Problem" in the Problems tab to add one.</div>
          )}
        </div>
      </section>
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
          <span>+ Create Problem</span>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search by title, topic, or keyword…"
          />
          {search && <button className="clear-btn" onClick={() => setSearch('')}>×</button>}
        </div>
        <div className="select-pill-wrap">
          <select aria-label="Company filter" value={company} onChange={event => setCompany(event.target.value)}>
            <option value="all">All Companies</option>
            {COMPANY_LIST.map(item => <option key={item}>{item}</option>)}
          </select>
          <span className="select-arrow">▾</span>
        </div>
        <div className="select-pill-wrap">
          <select aria-label="Difficulty filter" value={difficulty} onChange={event => setDifficulty(event.target.value)}>
            <option value="all">All Difficulties</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
          <span className="select-arrow">▾</span>
        </div>
        <div className="select-pill-wrap">
          <select aria-label="Status filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">All Status</option>
            <option>Unsolved</option>
            <option>Attempted</option>
            <option>Solved</option>
          </select>
          <span className="select-arrow">▾</span>
        </div>
      </div>

      <div className="problem-table-clean">
        <table>
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Status</th>
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
              <span>Export Workspace JSON</span>
            </button>
            <button className="backup-action-btn import" onClick={() => backupInput.current?.click()}>
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

  const statusFooter = (
    <footer className="platform-status-footer">
      <div className="status-footer-left">
        <span className="daemon-indicator">
          <span className="daemon-dot" />
          <span>Daemon Sync: Active (24ms)</span>
        </span>
        <span className="footer-sep">·</span>
        <span className="kernel-tag">Kernel v4.19.0-sandbox</span>
      </div>
      <div className="status-footer-right">
        <button type="button" onClick={() => setView('sessions')}>Help Center</button>
        <button type="button" onClick={() => setView('problems')}>API Reference</button>
        <button type="button" onClick={() => setView('home')}>Terms</button>
        <button type="button" onClick={() => setView('home')}>Privacy</button>
        <span className="copyright-tag">© 2025 YourCode Inc.</span>
      </div>
    </footer>
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
      {statusFooter}
      {toast && (
        <div className="toast-clean">
          <span>✓ {toast}</span>
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