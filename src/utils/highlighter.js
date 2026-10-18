// ─────────────────────────────────────────────────────────
//  Live Syntax Highlighter (VS Code Dark+ Token Colors)
// ─────────────────────────────────────────────────────────

const PY_KW = new Set(['class','def','lambda','True','False','None','global','nonlocal','del','with','as','yield','async','await']);
const JS_KW = new Set(['function','var','let','const','class','new','true','false','null','undefined','typeof','instanceof','void','delete','async','await','of']);
const CTRL = new Set(['return','if','elif','else','for','while','in','not','and','or','break','continue','pass','import','from','try','except','finally','raise','throw','catch','switch','case','default','do']);
const TYPES = new Set(['Solution','int','str','float','bool','list','dict','set','tuple','Optional','List','Dict','Set','Tuple','Any','Map','Array','Number','String','Boolean','Object','Infinity','Math','JSON']);
const SELF = new Set(['self','this','cls']);
const BUILTINS = new Set(['len','range','enumerate','min','max','sum','abs','sorted','reversed','zip','map','filter','print','append','pop','push','has','get','slice','split','reverse','join','fill','replace','toLowerCase','backtrack','console']);

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function highlightCode(code, lang) {
  if (!code) return '';
  const re = /(#.*$|\/\/.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|->|[+\-*/%=<>!&|^~:;,.()[\]{}])/gm;
  let result = '';
  let last = 0;
  let m;

  while ((m = re.exec(code)) !== null) {
    if (m.index > last) result += esc(code.slice(last, m.index));
    const tok = m[0];
    const after = code.slice(re.lastIndex);
    let cls = '';

    if (tok.startsWith('#') || tok.startsWith('//') || tok.startsWith('/*'))
      cls = 'tok-com';
    else if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('`'))
      cls = 'tok-str';
    else if (/^\d/.test(tok))
      cls = 'tok-num';
    else if (/^[A-Za-z_]/.test(tok)) {
      const kw = lang === 'javascript' ? JS_KW : PY_KW;
      if (kw.has(tok)) cls = 'tok-kw';
      else if (CTRL.has(tok)) cls = 'tok-ctrl';
      else if (TYPES.has(tok)) cls = 'tok-type';
      else if (/^\s*\(/.test(after) || BUILTINS.has(tok)) cls = 'tok-fn';
      else if (SELF.has(tok)) cls = 'tok-self';
    } else {
      cls = 'tok-op';
    }

    result += cls ? `<span class="${cls}">${esc(tok)}</span>` : esc(tok);
    last = re.lastIndex;
  }
  if (last < code.length) result += esc(code.slice(last));
  if (code.endsWith('\n')) result += ' ';
  return result;
}
