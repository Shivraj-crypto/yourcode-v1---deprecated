import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as monaco from '../node_modules/monaco-editor/esm/vs/editor/editor.api.js'
import editorWorker from '../node_modules/monaco-editor/esm/vs/editor/editor.worker.js?worker'
import tsWorker from '../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js?worker'
import { loader } from '@monaco-editor/react'
import '../node_modules/monaco-editor/esm/vs/languages/definitions/python/register.js'
import '../node_modules/monaco-editor/esm/vs/languages/definitions/javascript/register.js'
import './index.css'
import App from './App.jsx'

self.MonacoEnvironment = {
  getWorker(_, label) {
    return label === 'javascript' || label === 'typescript' ? new tsWorker() : new editorWorker()
  },
}

loader.config({ monaco })

const pythonCompletions = [
  { label: 'class', detail: 'Python class', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'class ${1:ClassName}:\n    $0', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: 'def', detail: 'Python function', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:function_name}(${2}):\n    $0', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: 'for', detail: 'For loop', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for ${1:item} in ${2:items}:\n    $0', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: 'if', detail: 'If statement', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition}:\n    $0', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: 'return', detail: 'Return value', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return ' },
  ...['self', 'print', 'range', 'enumerate', 'len', 'sum', 'min', 'max', 'sorted', 'list', 'dict', 'set', 'str', 'int'].map(label => ({
    label,
    kind: label === 'self' ? monaco.languages.CompletionItemKind.Variable : monaco.languages.CompletionItemKind.Function,
    insertText: label,
  })),
]

monaco.languages.registerCompletionItemProvider('python', {
  provideCompletionItems(model, position) {
    const word = model.getWordUntilPosition(position)
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    }
    return { suggestions: pythonCompletions.map(item => ({ ...item, range })) }
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
