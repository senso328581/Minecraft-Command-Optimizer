
(function(global){
  'use strict';

  const JAVA_ROOTS = [
    "advancement","attribute","ban","ban-ip","banlist","bossbar","clear","clone","damage","data","datapack","debug",
    "debugconfig","debugmobspawning","debugpath","defaultgamemode","deop","dialog","difficulty","effect","emote",
    "enchant","execute","experience","fetchprofile","fill","fillbiome","forceload","function","gamemode","gamerule",
    "give","help","item","kick","kill","list","locate","loot","msg","op","pardon","pardonip","particle","perf",
    "place","playsound","publish","raid","random","recipe","reload","return","ride","rotate","save-all","save-off",
    "save-on","say","schedule","seed","setblock","setidletimeout","setworldspawn","spawnarmortrims","spawnpoint",
    "spectate","spreadplayers","stop","stopsound","stopwatch","summon","swing","tag","team","teammsg","teleport",
    "tell","tellraw","tick","time","title","tp","transfer","trigger","version","w","wardenspawntracker","waypoint",
    "weather","xp"
  ];

  const BEDROCK_ROOTS = [
    "aimassist","allowlist","camera","camerashake","changesetting","clear","clearspawnpoint","clone","controlscheme",
    "damage","daylock","deop","dialogue","difficulty","effect","enchant","event","execute","fill","fog","function",
    "gamemode","gamerule","gametest","give","help","hud","inputpermission","kick","kill","list","locate","loot","me",
    "mobevent","music","op","packstack","particle","permission","place","playanimation","playsound","project","recipe",
    "reload","reloadconfig","reloadpacketlimitconfig","replaceitem","ride","save","say","schedule","scoreboard","script",
    "scriptevent","sendshowstoreoffer","setblock","setmaxplayers","setworldspawn","spawnpoint","spreadplayers","stop",
    "stopsound","structure","summon","tag","teleport","tell","tellraw","testfor","testforblock","testforblocks",
    "tickingarea","time","title","titleraw","toggledownfall","tp","transfer","weather","wsserver","xp"
  ];

  const SAMPLE_SETS = {
    bedrock: [
      { name:'execute + score', desc:'スコア条件つき execute の例。Bedrock の強い短縮も確認できます。', command:'/execute if score RUN TEST matches 1 if entity @e[type=warden,tag=TEST,c=1] run scoreboard players remove HP A 1' },
      { name:'hasitem selector', desc:'hasitem を含む、実際に書かれそうな構文です。', command:'/execute as @a[hasitem={item=diamond_sword,quantity=1.. }] run say sword' },
      { name:'fill short', desc:'座標と [] 周りの圧縮例です。', command:'/fill ~ ~ ~ ~1 ~1 ~1 stone [] replace air' },
      { name:'positioned + if block', desc:'positioned と if block の例です。', command:'/execute positioned ~ ~-1 ~ if block ~ ~ ~ redstone_block run say powered' },
      { name:'tag command', desc:'タグ付けの基本例です。', command:'/tag @e[type=armor_stand,name="TEST"] add A' },
      { name:'tp command', desc:'セレクターと座標が入る例です。', command:'/tp @p ~ ~1 ~' },
      { name:'tellraw', desc:'JSON を含む例です。', command:'/tellraw @a {"rawtext":[{"text":"Hello"}]}' },
      { name:'setblock', desc:'setblock の基本例です。', command:'/setblock ~ ~ ~ redstone_block [] replace' },
      { name:'scoreboard add', desc:'scoreboard objectives add の例です。', command:'/scoreboard objectives add TEST dummy TEST' },
      { name:'scoreboard players operation', desc:'players operation の例です。', command:'/scoreboard players operation A TEST += B TEST' }
    ],
    java: [
      { name:'execute + if entity', desc:'Java の execute 例です。', command:'/execute if entity @e[type=minecraft:zombie,tag=TEST,limit=1] run say ok' },
      { name:'execute as + at', desc:'Java では as と at の後ろの空白を残します。', command:'/execute as @a[tag=TEST] at @s run say here' },
      { name:'fill', desc:'Java の fill 例です。', command:'/fill ~ ~ ~ ~1 ~1 ~1 minecraft:stone replace minecraft:air' },
      { name:'data get entity', desc:'Java らしい data コマンドの例です。', command:'/data get entity @s SelectedItem' },
      { name:'tag add', desc:'tag コマンドの例です。', command:'/tag @e[type=minecraft:armor_stand,name="TEST"] add A' },
      { name:'tellraw', desc:'JSON メッセージの例です。', command:'/tellraw @a {"text":"Hello"}' },
      { name:'scoreboard add', desc:'objective の追加例です。', command:'/scoreboard objectives add test dummy "TEST"' },
      { name:'scoreboard players set', desc:'players set の例です。', command:'/scoreboard players set @s test 1' },
      { name:'tp', desc:'tp の例です。', command:'/tp @p ~ ~1 ~' },
      { name:'summon', desc:'summon の例です。', command:'/summon minecraft:zombie ~ ~ ~' }
    ]
  };

  const JAVA_SELECTOR_OPTIONS = new Set(['name','distance','level','x','y','z','dx','dy','dz','x_rotation','y_rotation','limit','sort','gamemode','team','type','tag','nbt','scores','advancements','predicate']);
  const BEDROCK_SELECTOR_OPTIONS = new Set(['x','y','z','r','rm','dx','dy','dz','c','type','m','tag','name','family','scores','hasitem','haspermission','l','lm','rx','rxm','ry','rym']);
  const JAVA_BASE_SELECTORS = new Set(['p','a','r','e','s','n']);
  const BEDROCK_BASE_SELECTORS = new Set(['p','a','r','e','s','initiator']);
  const ROOT_ALIASES = {
    java: { tp:'teleport', xp:'experience', tell:'msg', w:'waypoint' },
    bedrock: { tp:'teleport', xp:'xp' }
  };
  const EXECUTE_SUBS = {
    java: ['align','anchored','as','at','facing','if','in','on','positioned','rotated','store','summon','unless','run'],
    bedrock: ['align','anchored','as','at','facing','if','in','positioned','rotated','unless','run']
  };

  function uniq(arr){ return [...new Set(arr)]; }
  function randSample(edition, prevName){
    const list = SAMPLE_SETS[edition] || [];
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    let pick = list[Math.floor(Math.random() * list.length)];
    if (prevName && pick.name === prevName){
      const others = list.filter(x => x.name !== prevName);
      pick = others[Math.floor(Math.random() * others.length)] || pick;
    }
    return pick;
  }
  function isSpace(ch){ return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n'; }
  function isDigit(ch){ return /[0-9]/.test(ch || ''); }
  function isCoordStart(ch){ return ch === '~' || ch === '^' || ch === '-' || ch === '+' || ch === '.' || isDigit(ch); }
  function rootCanonical(root, edition){
    const key = (root || '').toLowerCase();
    return (ROOT_ALIASES[edition] && ROOT_ALIASES[edition][key]) || key;
  }

  class Reader{
    constructor(text){ this.text = text || ''; this.cursor = 0; }
    canRead(n=1){ return this.cursor + n <= this.text.length; }
    eof(){ return this.cursor >= this.text.length; }
    peek(offset=0){ return this.text[this.cursor + offset] || ''; }
    skipSpaces(){ while (this.canRead() && isSpace(this.peek())) this.cursor++; }
    readWhile(pred){
      const start = this.cursor;
      while (this.canRead() && pred(this.peek())) this.cursor++;
      return this.text.slice(start, this.cursor);
    }
    readAlphaWord(){ return this.readWhile(ch => /[A-Za-z_-]/.test(ch)); }
    readQuoted(){
      const start = this.cursor;
      if (this.peek() !== '"') return '';
      this.cursor++;
      let escaped = false;
      while (this.canRead()){
        const ch = this.peek();
        this.cursor++;
        if (escaped){ escaped = false; continue; }
        if (ch === '\\'){ escaped = true; continue; }
        if (ch === '"') break;
      }
      return this.text.slice(start, this.cursor);
    }
    readBare(){
      return this.readWhile(ch => !isSpace(ch));
    }
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"]/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[ch]));
  }
  function markerAt(text, pos){
    const safe = Math.max(0, Math.min(text.length, pos));
    return `${text.slice(0, safe)}<--[HERE]${text.slice(safe)}`;
  }
  function makeIssue(text, pos, message, severity='error', lineNo=1){
    return { severity, lineNo, pos, message, marker: markerAt(text, pos) };
  }
  function scanBalance(text){
    const issues = [];
    const stack = [];
    let inQuote = false, escaped = false;
    const pairs = { ']':'[', '}':'{', ')':'(' };
    for (let i=0;i<text.length;i++){
      const ch = text[i];
      if (inQuote){
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inQuote = false;
        continue;
      }
      if (ch === '"'){ inQuote = true; continue; }
      if (ch === '[' || ch === '{' || ch === '(') stack.push({ ch, pos:i });
      else if (ch === ']' || ch === '}' || ch === ')'){
        const top = stack.pop();
        if (!top || top.ch !== pairs[ch]){
          issues.push(makeIssue(text, i, `対応していない ${ch} があります。`));
          break;
        }
      }
    }
    if (inQuote) issues.push(makeIssue(text, text.length, 'ダブルクォート " の閉じ忘れの可能性があります。'));
    while (stack.length){
      const top = stack.pop();
      issues.push(makeIssue(text, top.pos, `${top.ch} を閉じ忘れています。`));
    }
    return issues;
  }

  function transformOutsideQuotes(text, fn){
    let out = '', buf = '', inQuote = false, escaped = false;
    for (let i=0;i<text.length;i++){
      const ch = text[i];
      if (inQuote){
        out += ch;
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inQuote = false;
        continue;
      }
      if (ch === '"'){
        out += fn(buf);
        buf = '';
        out += ch;
        inQuote = true;
      }else{
        buf += ch;
      }
    }
    out += fn(buf);
    return out;
  }

  function normalizeModeSlash(line, mode){
    let text = (line || '').trim();
    const changes = [];
    if (!text) return { text:'', changes };
    if (mode === 'command_block'){
      if (text.startsWith('/')){
        text = text.replace(/^\/+/, '');
        changes.push('command block mode に合わせて先頭の / を削除');
      }
    }else if (mode === 'player'){
      if (!text.startsWith('/')){
        text = '/' + text;
        changes.push('player mode に合わせて先頭に / を追加');
      }
    }
    return { text, changes };
  }

  function minifySegment(segment, edition){
    let s = segment.replace(/\r/g, '');
    s = s.replace(/[\t\f\v]+/g, ' ');
    s = s.replace(/ {2,}/g, ' ');
    s = s.replace(/\s*=\s*/g, '=');
    s = s.replace(/\s*,\s*/g, ',');
    s = s.replace(/\[\s+/g, '[').replace(/\s+\]/g, ']');
    s = s.replace(/\{\s+/g, '{').replace(/\s+\}/g, '}');
    s = s.replace(/\s*:\s*/g, ':');

    if (edition === 'bedrock'){
      s = s.replace(/\s+(?=@(?:p|a|r|e|s|initiator)\b)/gi, '');
      s = s.replace(/\b(as|at|positioned|facing|entity|block|score)\s+(?=@|~|\^|[-+]?\d|\.)/gi, '$1');
      s = s.replace(/\]\s+run\b/gi, ']run');
      s = s.replace(/\}\s+run\b/gi, '}run');
      s = s.replace(/\s+(?=[~^])/g, '');
      s = s.replace(/([~^])\s+(?=[~^0-9.+-])/g, '$1');
    }
    return s.trim();
  }

  function optimizeLine(line, edition, mode){
    const step = normalizeModeSlash(line, mode);
    if (!step.text) return { optimized:'', changes: step.changes.slice() };
    const hasSlash = step.text.startsWith('/');
    const body = hasSlash ? step.text.slice(1) : step.text;
    const minified = transformOutsideQuotes(body, seg => minifySegment(seg, edition));
    const optimized = (hasSlash ? '/' : '') + minified;
    const changes = step.changes.slice();
    if (optimized !== step.text) changes.push('不要な空白を圧縮');
    return { optimized, changes };
  }

  function optimizeText(text, edition, mode){
    const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
    const optimized = [];
    let changed = 0, total = 0;
    for (const line of lines){
      if (!line.trim()){
        optimized.push('');
        continue;
      }
      total++;
      const res = optimizeLine(line, edition, mode);
      if (res.changes.length) changed++;
      optimized.push(res.optimized);
    }
    return { optimized: optimized.join('\n'), changed, total };
  }

  function readSimpleToken(reader){
    reader.skipSpaces();
    return reader.peek() === '"' ? reader.readQuoted() : reader.readBare();
  }

  function readPackedIdentifier(reader, stopBeforeCoords){
    const start = reader.cursor;
    if (reader.peek() === '"') return reader.readQuoted();
    while (reader.canRead()){
      const ch = reader.peek();
      if (isSpace(ch) || ch === ']' || ch === '}' || ch === ',' || ch === '(' || ch === ')') break;
      if (ch === '[' || ch === '{') break;
      if (stopBeforeCoords && (ch === '~' || ch === '^')) break;
      if (stopBeforeCoords && (ch === '@')) break;
      reader.cursor++;
    }
    return reader.text.slice(start, reader.cursor);
  }

  function parseIdentifier(reader, issues, text, label='値', options={}){
    const opts = Object.assign({ edition:'java', stopBeforeCoords:false }, options);
    reader.skipSpaces();
    const start = reader.cursor;
    let tok = '';
    if (reader.peek() === '"') tok = reader.readQuoted();
    else tok = readPackedIdentifier(reader, opts.stopBeforeCoords);
    if (!tok) issues.push(makeIssue(text, start, `${label} が必要です。`));
    return tok;
  }

  function matchCoordinatePrefix(str){
    if (!str) return null;
    const relative = str.match(/^(~(?:[-+]?(?:\d+(?:\.\d+)?|\.\d+)?)?|\^(?:[-+]?(?:\d+(?:\.\d+)?|\.\d+)?)?)/);
    if (relative) return relative[0];
    const absolute = str.match(/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)/);
    if (absolute) return absolute[0];
    return null;
  }

  function parseCoordinateToken(reader, issues, text, label='座標', edition='java'){
    reader.skipSpaces();
    const start = reader.cursor;
    const token = matchCoordinatePrefix(reader.text.slice(reader.cursor));
    if (!token){
      issues.push(makeIssue(text, start, `${label} が必要です。`));
      return null;
    }
    reader.cursor += token.length;
    return token;
  }

  function parseVec3(reader, issues, text, label='座標', edition='java'){
    parseCoordinateToken(reader, issues, text, `${label} x`, edition);
    parseCoordinateToken(reader, issues, text, `${label} y`, edition);
    parseCoordinateToken(reader, issues, text, `${label} z`, edition);
  }

  function parseRotation(reader, issues, text, edition='java'){
    parseCoordinateToken(reader, issues, text, 'yaw', edition);
    parseCoordinateToken(reader, issues, text, 'pitch', edition);
  }

  function parseRangeLike(reader, issues, text, label='範囲'){
    const tok = parseIdentifier(reader, issues, text, label);
    if (tok && !/^!?(-?\d+)?(\.\.(-?\d+)?)?$|^!?-?\d+$/.test(tok)){
      issues.push(makeIssue(text, Math.max(0, reader.cursor - tok.length), `${label} の形式が不正です。`));
    }
    return tok;
  }

  function parseBracketed(reader, issues, text, open, close){
    const start = reader.cursor;
    if (reader.peek() !== open){
      issues.push(makeIssue(text, start, `${open} が必要です。`));
      return '';
    }
    let depth = 0, inQuote = false, escaped = false;
    while (reader.canRead()){
      const ch = reader.peek();
      reader.cursor++;
      if (inQuote){
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inQuote = false;
        continue;
      }
      if (ch === '"'){ inQuote = true; continue; }
      if (ch === open) depth++;
      else if (ch === close){
        depth--;
        if (depth === 0) return reader.text.slice(start, reader.cursor);
      }
    }
    issues.push(makeIssue(text, start, `${open} を閉じ忘れています。`));
    return reader.text.slice(start, reader.cursor);
  }

  function splitTopLevel(str, sep=','){
    const out = [];
    let buf = '', q = false, esc = false, b1 = 0, b2 = 0, p = 0;
    for (const ch of str){
      if (q){
        buf += ch;
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') q = false;
        continue;
      }
      if (ch === '"'){ q = true; buf += ch; continue; }
      if (ch === '[') b1++;
      else if (ch === ']') b1--;
      else if (ch === '{') b2++;
      else if (ch === '}') b2--;
      else if (ch === '(') p++;
      else if (ch === ')') p--;
      if (ch === sep && b1 === 0 && b2 === 0 && p === 0){
        out.push(buf.trim());
        buf = '';
        continue;
      }
      buf += ch;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function parseBlockSpec(reader, issues, text, edition='java'){
    const tok = parseIdentifier(reader, issues, text, 'ブロック', { edition, stopBeforeCoords:false });
    if (!tok) return '';
    if (reader.peek() === '[') parseBracketed(reader, issues, text, '[', ']');
    if (reader.peek() === '{') parseBracketed(reader, issues, text, '{', '}');
    return tok;
  }

  function parseItemSpec(reader, issues, text, edition='java'){
    const tok = parseIdentifier(reader, issues, text, 'アイテム', { edition, stopBeforeCoords:false });
    if (!tok) return '';
    if (reader.peek() === '[') parseBracketed(reader, issues, text, '[', ']');
    if (reader.peek() === '{') parseBracketed(reader, issues, text, '{', '}');
    return tok;
  }

  function requireJavaSeparator(reader, issues, text, edition){
    if (edition !== 'java') return;
    if (!reader.eof() && !isSpace(reader.peek())){
      issues.push(makeIssue(text, reader.cursor, 'Java Edition ではここに空白が必要です。'));
    }
  }

  function parseSelector(reader, issues, text, edition){
    reader.skipSpaces();
    const start = reader.cursor;
    if (reader.peek() !== '@'){
      return { type:'name', value: parseIdentifier(reader, issues, text, '対象', { edition, stopBeforeCoords:true }) };
    }
    reader.cursor++;
    let base = '';
    if (edition === 'bedrock' && reader.text.slice(reader.cursor, reader.cursor + 'initiator'.length).toLowerCase() === 'initiator'){
      base = 'initiator';
      reader.cursor += 'initiator'.length;
    }else{
      base = reader.readAlphaWord().toLowerCase();
    }
    const allowed = edition === 'java' ? JAVA_BASE_SELECTORS : BEDROCK_BASE_SELECTORS;
    if (!allowed.has(base)){
      issues.push(makeIssue(text, start, `不明なセレクター @${base || '?'} です。`));
      return { type:'selector', base };
    }
    if (reader.peek() === '[') parseSelectorOptions(reader, issues, text, edition, base);
    return { type:'selector', base };
  }

  function parseSelectorOptions(reader, issues, text, edition, base){
    const allowed = edition === 'java' ? JAVA_SELECTOR_OPTIONS : BEDROCK_SELECTOR_OPTIONS;
    const duplicates = new Map();
    reader.cursor++;
    while (reader.canRead()){
      reader.skipSpaces();
      if (reader.peek() === ']'){
        reader.cursor++;
        break;
      }
      const keyStart = reader.cursor;
      const key = reader.readWhile(ch => /[A-Za-z_]/.test(ch)).toLowerCase();
      if (!key){
        issues.push(makeIssue(text, keyStart, 'セレクター引数名が必要です。'));
        return;
      }
      if (!allowed.has(key)) issues.push(makeIssue(text, keyStart, `このエディションで使えないセレクター引数です: ${key}`));
      duplicates.set(key, (duplicates.get(key) || 0) + 1);
      reader.skipSpaces();
      if (reader.peek() !== '='){
        issues.push(makeIssue(text, reader.cursor, `セレクター引数 ${key} に = が必要です。`));
        return;
      }
      reader.cursor++;
      reader.skipSpaces();
      const valueStart = reader.cursor;

      if (reader.peek() === '"'){
        reader.readQuoted();
      }else if (reader.peek() === '{'){
        const raw = parseBracketed(reader, issues, text, '{', '}');
        if (key === 'scores'){
          const inner = raw.slice(1, -1).trim();
          if (!inner) issues.push(makeIssue(text, valueStart, 'scores={...} の中身が空です。'));
          else{
            for (const part of splitTopLevel(inner, ',')){
              if (part.indexOf('=') <= 0) issues.push(makeIssue(text, valueStart, 'scores の各項目は objective=value 形式です。'));
            }
          }
        }
        if (key === 'hasitem' && !/\bitem\s*=/.test(raw)){
          issues.push(makeIssue(text, valueStart, 'hasitem には item=... が必要です。'));
        }
      }else{
        const tok = reader.readWhile(ch => !isSpace(ch) && ch !== ',' && ch !== ']');
        if (!tok) issues.push(makeIssue(text, valueStart, `${key} の値が必要です。`));
        if (['limit','c','x','y','z','dx','dy','dz','r','rm','rx','rxm','ry','rym','l','lm'].includes(key) && tok && !/^[-+]?\d+(?:\.\d+)?$/.test(tok)){
          issues.push(makeIssue(text, valueStart, `${key} には数値が必要です。`));
        }
      }

      reader.skipSpaces();
      if (reader.peek() === ','){
        reader.cursor++;
        continue;
      }
      if (reader.peek() === ']'){
        reader.cursor++;
        break;
      }
      if (!reader.eof()) issues.push(makeIssue(text, reader.cursor, 'セレクター引数の区切りは , または ] です。'));
      return;
    }
    if ((base === 'a' || base === 'p') && duplicates.has('type')){
      issues.push(makeIssue(text, 0, '@a / @p では type は使えません。', 'warn'));
    }
  }

  function parseTarget(reader, issues, text, edition){
    const result = parseSelector(reader, issues, text, edition);
    requireJavaSeparator(reader, issues, text, edition);
    return result;
  }

  function parseExecuteCondition(reader, issues, text, edition){
    reader.skipSpaces();
    const start = reader.cursor;
    const kind = reader.readAlphaWord().toLowerCase();
    if (!kind){
      issues.push(makeIssue(text, start, 'if / unless の条件が必要です。'));
      return;
    }
    switch (kind){
      case 'entity':
        parseTarget(reader, issues, text, edition);
        break;
      case 'block':
        parseVec3(reader, issues, text, '座標', edition);
        parseBlockSpec(reader, issues, text, edition);
        break;
      case 'blocks':
        parseVec3(reader, issues, text, '開始座標', edition);
        parseVec3(reader, issues, text, '終了座標', edition);
        parseVec3(reader, issues, text, '比較先座標', edition);
        parseIdentifier(reader, issues, text, 'all または masked', { edition });
        break;
      case 'score': {
        parseTarget(reader, issues, text, edition);
        parseIdentifier(reader, issues, text, 'objective', { edition });
        const opPos = reader.cursor;
        const op = parseIdentifier(reader, issues, text, 'score 条件', { edition });
        if (!op) return;
        if (op === 'matches'){
          parseRangeLike(reader, issues, text);
        }else if (['=','<','<=','>','>='].includes(op)){
          parseTarget(reader, issues, text, edition);
          parseIdentifier(reader, issues, text, 'source objective', { edition });
        }else{
          issues.push(makeIssue(text, opPos, 'score 条件は matches または比較演算子である必要があります。'));
        }
        break;
      }
      case 'data':
        if (edition !== 'java'){
          issues.push(makeIssue(text, start, 'Bedrock では execute if data は使えません。'));
          return;
        }
        {
          const scope = parseIdentifier(reader, issues, text, 'data 対象', { edition });
          if (scope === 'entity') parseTarget(reader, issues, text, edition);
          else if (scope === 'block') parseVec3(reader, issues, text, '座標', edition);
          else if (scope === 'storage') parseIdentifier(reader, issues, text, 'storage', { edition });
          else issues.push(makeIssue(text, start, 'data 条件は entity / block / storage です。'));
          parseIdentifier(reader, issues, text, 'NBT path', { edition });
        }
        break;
      case 'predicate':
        if (edition !== 'java') issues.push(makeIssue(text, start, 'Bedrock では execute if predicate は使えません。'));
        else parseIdentifier(reader, issues, text, 'predicate', { edition });
        break;
      default:
        issues.push(makeIssue(text, start, `不明な execute 条件です: ${kind}`));
    }
  }

  function parseExecuteStore(reader, issues, text){
    const start = reader.cursor;
    const mode = parseIdentifier(reader, issues, text, 'store mode');
    if (!mode) return;
    if (!['result','success'].includes(mode)) issues.push(makeIssue(text, start, 'store は result または success です。'));
    const kindStart = reader.cursor;
    const kind = parseIdentifier(reader, issues, text, 'store 先');
    if (!kind) return;
    switch (kind){
      case 'score':
        parseTarget(reader, issues, text, 'java');
        parseIdentifier(reader, issues, text, 'objective');
        break;
      case 'entity':
        parseTarget(reader, issues, text, 'java');
        parseIdentifier(reader, issues, text, 'path');
        parseIdentifier(reader, issues, text, 'type');
        parseIdentifier(reader, issues, text, 'scale');
        break;
      case 'block':
        parseVec3(reader, issues, text, '座標', 'java');
        parseIdentifier(reader, issues, text, 'path');
        parseIdentifier(reader, issues, text, 'type');
        parseIdentifier(reader, issues, text, 'scale');
        break;
      case 'storage':
        parseIdentifier(reader, issues, text, 'storage');
        parseIdentifier(reader, issues, text, 'path');
        parseIdentifier(reader, issues, text, 'type');
        parseIdentifier(reader, issues, text, 'scale');
        break;
      case 'bossbar':
        parseIdentifier(reader, issues, text, 'bossbar');
        parseIdentifier(reader, issues, text, 'value|max');
        break;
      default:
        issues.push(makeIssue(text, kindStart, 'store 先は score/entity/block/storage/bossbar のいずれかです。'));
    }
  }

  function parseRootCommand(reader, issues, text, edition){
    const start = reader.cursor;
    const rootRaw = reader.readAlphaWord().toLowerCase();
    if (!rootRaw){
      issues.push(makeIssue(text, start, 'コマンド名が必要です。'));
      return null;
    }
    const root = rootCanonical(rootRaw, edition);
    const roots = new Set((edition === 'java' ? JAVA_ROOTS : BEDROCK_ROOTS).map(x => rootCanonical(x, edition)));
    if (!roots.has(root)){
      issues.push(makeIssue(text, start, `不明なコマンドです: ${rootRaw}`));
      return { raw: rootRaw, root };
    }
    return { raw: rootRaw, root };
  }

  function parseExecute(reader, issues, text, edition){
    const subcommands = EXECUTE_SUBS[edition];
    while (reader.canRead()){
      reader.skipSpaces();
      if (reader.eof()) return;
      const start = reader.cursor;
      const sub = reader.readAlphaWord().toLowerCase();
      if (!sub){
        issues.push(makeIssue(text, start, 'execute のサブコマンドが必要です。'));
        return;
      }
      if (!subcommands.includes(sub)){
        issues.push(makeIssue(text, start, `不明な execute サブコマンドです: ${sub}`));
        return;
      }
      switch (sub){
        case 'as':
        case 'at':
          parseTarget(reader, issues, text, edition);
          break;
        case 'in':
          parseIdentifier(reader, issues, text, 'dimension', { edition });
          break;
        case 'positioned': {
          reader.skipSpaces();
          const maybe = reader.readAlphaWord().toLowerCase();
          if (maybe === 'as'){
            parseTarget(reader, issues, text, edition);
          }else{
            if (maybe) reader.cursor -= maybe.length;
            parseVec3(reader, issues, text, '座標', edition);
          }
          break;
        }
        case 'align':
          parseIdentifier(reader, issues, text, 'axes', { edition });
          break;
        case 'anchored': {
          const tok = parseIdentifier(reader, issues, text, 'eyes または feet', { edition });
          if (tok && !['eyes','feet'].includes(tok)) issues.push(makeIssue(text, Math.max(0, reader.cursor - tok.length), 'anchored は eyes または feet です。'));
          break;
        }
        case 'rotated': {
          reader.skipSpaces();
          const maybe = reader.readAlphaWord().toLowerCase();
          if (maybe === 'as'){
            parseTarget(reader, issues, text, edition);
          }else{
            if (maybe) reader.cursor -= maybe.length;
            parseRotation(reader, issues, text, edition);
          }
          break;
        }
        case 'facing': {
          reader.skipSpaces();
          const maybe = reader.readAlphaWord().toLowerCase();
          if (maybe === 'entity'){
            parseTarget(reader, issues, text, edition);
            const anchor = parseIdentifier(reader, issues, text, 'eyes または feet', { edition });
            if (anchor && !['eyes','feet'].includes(anchor)) issues.push(makeIssue(text, Math.max(0, reader.cursor - anchor.length), 'facing entity の最後は eyes または feet です。'));
          }else{
            if (maybe) reader.cursor -= maybe.length;
            parseVec3(reader, issues, text, '座標', edition);
          }
          break;
        }
        case 'if':
        case 'unless':
          parseExecuteCondition(reader, issues, text, edition);
          break;
        case 'store':
          if (edition !== 'java') issues.push(makeIssue(text, start, 'Bedrock では execute store は使えません。'));
          else parseExecuteStore(reader, issues, text);
          break;
        case 'on':
          if (edition !== 'java') issues.push(makeIssue(text, start, 'Bedrock では execute on は使えません。'));
          else parseIdentifier(reader, issues, text, 'on relation', { edition });
          break;
        case 'summon':
          if (edition !== 'java') issues.push(makeIssue(text, start, 'Bedrock では execute summon は使えません。'));
          else parseIdentifier(reader, issues, text, 'entity type', { edition });
          break;
        case 'run':
          reader.skipSpaces();
          if (reader.eof()){
            issues.push(makeIssue(text, reader.cursor, 'run の後ろに実行コマンドがありません。'));
            return;
          }
          parseCommand(reader, issues, text, edition);
          return;
      }
    }
  }

  function parseScoreboard(reader, issues, text, edition){
    const branchPos = reader.cursor;
    const branch = parseIdentifier(reader, issues, text, 'scoreboard branch', { edition });
    if (!branch) return;

    if (branch === 'objectives'){
      const action = parseIdentifier(reader, issues, text, 'objectives action', { edition });
      if (!action) return;
      if (action === 'add'){
        parseIdentifier(reader, issues, text, 'objective', { edition });
        parseIdentifier(reader, issues, text, 'criteria', { edition });
        if (!reader.eof()) parseIdentifier(reader, issues, text, 'display name', { edition });
      }else if (['remove','list','setdisplay','modify'].includes(action)){
        if (action !== 'list') parseIdentifier(reader, issues, text, 'objective or slot', { edition });
      }else{
        issues.push(makeIssue(text, branchPos, `不明な scoreboard objectives action です: ${action}`));
      }
      return;
    }

    if (branch === 'players'){
      const action = parseIdentifier(reader, issues, text, 'players action', { edition });
      if (!action) return;
      const bedrockActions = new Set(['add','list','operation','random','remove','reset','set','test']);
      const javaActions = new Set(['add','enable','get','list','operation','remove','reset','set']);
      const allowed = edition === 'java' ? javaActions : bedrockActions;
      if (!allowed.has(action)){
        issues.push(makeIssue(text, branchPos, `不明な scoreboard players action です: ${action}`));
        return;
      }
      if (action === 'list'){
        if (!reader.eof()) parseTarget(reader, issues, text, edition);
        return;
      }
      parseTarget(reader, issues, text, edition);
      if (action !== 'reset' && action !== 'get') parseIdentifier(reader, issues, text, 'objective', { edition });
      if (['set','add','remove','random','test'].includes(action)){
        parseIdentifier(reader, issues, text, 'value', { edition });
        if (action === 'test') parseIdentifier(reader, issues, text, 'max', { edition });
      }else if (action === 'operation'){
        const op = parseIdentifier(reader, issues, text, 'operation', { edition });
        if (op && !['+=','-=','*=','/=','%=','=','<','>','><'].includes(op)){
          issues.push(makeIssue(text, Math.max(0, reader.cursor - op.length), '無効な scoreboard operation です。'));
        }
        parseTarget(reader, issues, text, edition);
        parseIdentifier(reader, issues, text, 'source objective', { edition });
      }else if (action === 'enable'){
        parseIdentifier(reader, issues, text, 'objective', { edition });
      }
      return;
    }

    issues.push(makeIssue(text, branchPos, 'scoreboard の枝は objectives または players です。'));
  }

  function parseTeleport(reader, issues, text, edition){
    reader.skipSpaces();
    const save = reader.cursor;
    const first = readSimpleToken(reader);
    if (!first){
      issues.push(makeIssue(text, save, 'tp / teleport の引数が必要です。'));
      return;
    }
    if (first.startsWith('@') || /^[A-Za-z0-9_]+$/.test(first)){
      if (reader.eof()) return;
      reader.skipSpaces();
      const ch = reader.peek();
      if (ch === '@' || /[A-Za-z_]/.test(ch)) parseTarget(reader, issues, text, edition);
      else parseVec3(reader, issues, text, '座標', edition);
    }else{
      reader.cursor = save;
      parseVec3(reader, issues, text, '座標', edition);
    }
  }

  function parseTellraw(reader, issues, text, edition){
    parseTarget(reader, issues, text, edition);
    reader.skipSpaces();
    const pos = reader.cursor;
    if (reader.peek() !== '{' && reader.peek() !== '['){
      issues.push(makeIssue(text, pos, 'tellraw / titleraw の JSON が必要です。'));
      return;
    }
    if (reader.peek() === '{') parseBracketed(reader, issues, text, '{', '}');
    else parseBracketed(reader, issues, text, '[', ']');
  }

  function parseTitle(reader, issues, text, edition, rawJson=false){
    parseTarget(reader, issues, text, edition);
    const actionPos = reader.cursor;
    const action = parseIdentifier(reader, issues, text, 'title action', { edition });
    if (!action) return;
    if (['clear','reset'].includes(action)) return;
    if (action === 'times'){
      parseIdentifier(reader, issues, text, 'fadeIn', { edition });
      parseIdentifier(reader, issues, text, 'stay', { edition });
      parseIdentifier(reader, issues, text, 'fadeOut', { edition });
      return;
    }
    if (['title','subtitle','actionbar'].includes(action)){
      reader.skipSpaces();
      if (rawJson){
        if (reader.peek() !== '{' && reader.peek() !== '[') issues.push(makeIssue(text, reader.cursor, 'titleraw では JSON が必要です。'));
        else if (reader.peek() === '{') parseBracketed(reader, issues, text, '{', '}');
        else parseBracketed(reader, issues, text, '[', ']');
      }else if (reader.eof()){
        issues.push(makeIssue(text, reader.cursor, '表示テキストが必要です。'));
      }
      return;
    }
    issues.push(makeIssue(text, actionPos, `不明な title action です: ${action}`));
  }

  function parseTag(reader, issues, text, edition){
    parseTarget(reader, issues, text, edition);
    const actionPos = reader.cursor;
    const action = parseIdentifier(reader, issues, text, 'tag action', { edition });
    if (!action) return;
    if (action === 'list') return;
    if (!['add','remove'].includes(action)){
      issues.push(makeIssue(text, actionPos, 'tag action は add / remove / list です。'));
      return;
    }
    parseIdentifier(reader, issues, text, 'tag', { edition });
  }

  function parseEffect(reader, issues, text, edition){
    const save = reader.cursor;
    if (edition === 'java'){
      const kind = parseIdentifier(reader, issues, text, 'effect action', { edition });
      if (!kind) return;
      if (kind === 'clear'){
        parseTarget(reader, issues, text, edition);
      }else if (kind === 'give'){
        parseTarget(reader, issues, text, edition);
        parseIdentifier(reader, issues, text, 'effect', { edition });
      }else{
        issues.push(makeIssue(text, save, 'Java の effect は give / clear です。'));
      }
    }else{
      parseTarget(reader, issues, text, edition);
      const maybe = parseIdentifier(reader, issues, text, 'effect or clear', { edition });
      if (maybe && maybe !== 'clear') parseIdentifier(reader, issues, text, 'seconds', { edition });
    }
  }

  function parseFill(reader, issues, text, edition){
    parseVec3(reader, issues, text, '開始座標', edition);
    parseVec3(reader, issues, text, '終了座標', edition);
    parseBlockSpec(reader, issues, text, edition);
    if (reader.eof()) return;
    reader.skipSpaces();
    if (reader.eof()) return;
    const modeStart = reader.cursor;
    const mode = parseIdentifier(reader, issues, text, 'fill mode', { edition });
    if (!mode) return;
    const allowed = new Set(['destroy','hollow','keep','outline','replace']);
    if (!allowed.has(mode)){
      issues.push(makeIssue(text, modeStart, `不明な fill mode です: ${mode}`));
      return;
    }
    if (mode === 'replace' && !reader.eof()){
      reader.skipSpaces();
      if (!reader.eof()) parseBlockSpec(reader, issues, text, edition);
    }
  }

  function parseSetblock(reader, issues, text, edition){
    parseVec3(reader, issues, text, '座標', edition);
    parseBlockSpec(reader, issues, text, edition);
    if (reader.eof()) return;
    reader.skipSpaces();
    if (reader.eof()) return;
    const modeStart = reader.cursor;
    const mode = parseIdentifier(reader, issues, text, 'setblock mode', { edition });
    if (!mode) return;
    if (!['destroy','keep','replace'].includes(mode)){
      issues.push(makeIssue(text, modeStart, `不明な setblock mode です: ${mode}`));
    }
  }

  function parseClone(reader, issues, text, edition){
    parseVec3(reader, issues, text, '開始座標', edition);
    parseVec3(reader, issues, text, '終了座標', edition);
    parseVec3(reader, issues, text, 'コピー先座標', edition);
    if (!reader.eof()) parseIdentifier(reader, issues, text, 'clone mode', { edition });
  }

  function parseSummon(reader, issues, text, edition){
    parseIdentifier(reader, issues, text, 'entity type', { edition, stopBeforeCoords: edition === 'bedrock' });
    if (reader.eof()) return;
    reader.skipSpaces();
    if (reader.eof()) return;
    if (isCoordStart(reader.peek())){
      parseVec3(reader, issues, text, '座標', edition);
    }
  }

  function parseGive(reader, issues, text, edition){
    parseTarget(reader, issues, text, edition);
    parseItemSpec(reader, issues, text, edition);
  }

  function parseClear(reader, issues, text, edition){
    parseTarget(reader, issues, text, edition);
    if (!reader.eof()) parseItemSpec(reader, issues, text, edition);
  }

  function parsePlaysound(reader, issues, text, edition){
    parseIdentifier(reader, issues, text, 'sound', { edition });
    if (!reader.eof()) parseTarget(reader, issues, text, edition);
  }

  function parseData(reader, issues, text){
    const branchPos = reader.cursor;
    const branch = parseIdentifier(reader, issues, text, 'data branch', { edition:'java' });
    if (!branch) return;
    if (!['get','merge','modify','remove'].includes(branch)){
      issues.push(makeIssue(text, branchPos, 'data branch は get/merge/modify/remove です。'));
    }
    const scope = parseIdentifier(reader, issues, text, 'data scope', { edition:'java' });
    if (scope === 'entity') parseTarget(reader, issues, text, 'java');
    else if (scope === 'block') parseVec3(reader, issues, text, '座標', 'java');
    else if (scope === 'storage') parseIdentifier(reader, issues, text, 'storage', { edition:'java' });
    else issues.push(makeIssue(text, branchPos, 'data scope は entity/block/storage です。'));
  }

  function parseTeam(reader, issues, text){
    const actionPos = reader.cursor;
    const action = parseIdentifier(reader, issues, text, 'team action', { edition:'java' });
    if (action && !['add','empty','join','leave','list','modify','remove'].includes(action)){
      issues.push(makeIssue(text, actionPos, `不明な team action です: ${action}`));
    }
  }

  function parseCommand(reader, issues, text, edition){
    reader.skipSpaces();
    const rootInfo = parseRootCommand(reader, issues, text, edition);
    if (!rootInfo) return;

    switch (rootInfo.root){
      case 'execute': return parseExecute(reader, issues, text, edition);
      case 'scoreboard': return parseScoreboard(reader, issues, text, edition);
      case 'fill': return parseFill(reader, issues, text, edition);
      case 'setblock': return parseSetblock(reader, issues, text, edition);
      case 'clone': return parseClone(reader, issues, text, edition);
      case 'teleport': return parseTeleport(reader, issues, text, edition);
      case 'tellraw': return parseTellraw(reader, issues, text, edition);
      case 'titleraw': return parseTitle(reader, issues, text, edition, true);
      case 'title': return parseTitle(reader, issues, text, edition, false);
      case 'tag': return parseTag(reader, issues, text, edition);
      case 'effect': return parseEffect(reader, issues, text, edition);
      case 'summon': return parseSummon(reader, issues, text, edition);
      case 'give': return parseGive(reader, issues, text, edition);
      case 'clear': return parseClear(reader, issues, text, edition);
      case 'playsound': return parsePlaysound(reader, issues, text, edition);
      case 'data': if (edition === 'java') return parseData(reader, issues, text); break;
      case 'team': if (edition === 'java') return parseTeam(reader, issues, text); break;
      case 'say':
      case 'me':
      case 'help':
      case 'function':
      case 'gamerule':
      case 'time':
      case 'weather':
      case 'reload':
      case 'stop':
      case 'difficulty':
      case 'gamemode':
      case 'kick':
      case 'kill':
      case 'list':
      case 'locate':
      case 'particle':
      case 'place':
      case 'schedule':
      case 'spreadplayers':
      case 'structure':
      case 'msg':
      case 'xp':
      case 'experience':
      case 'aimassist':
      case 'allowlist':
      case 'camera':
      case 'camerashake':
      case 'changesetting':
      case 'daylock':
      case 'fog':
      case 'hud':
      case 'inputpermission':
      case 'mobevent':
      case 'music':
      case 'op':
      case 'permission':
      case 'playanimation':
      case 'project':
      case 'replaceitem':
      case 'save':
      case 'script':
      case 'scriptevent':
      case 'sendshowstoreoffer':
      case 'testfor':
      case 'testforblock':
      case 'testforblocks':
      case 'tickingarea':
      case 'toggledownfall':
      case 'transfer':
      case 'wsserver':
        reader.cursor = reader.text.length;
        return;
      default:
        return;
    }
  }

  function validateLine(line, edition, mode, lineNo=1){
    const issues = [];
    const trimmed = line.trim();
    if (!trimmed) return issues;
    issues.push(...scanBalance(trimmed).map(item => ({ ...item, lineNo })));
    if (mode === 'player' && !trimmed.startsWith('/')) issues.push({ severity:'warn', lineNo, pos:0, message:'player mode では通常、先頭に / が必要です。', marker: markerAt(trimmed, 0) });
    if (mode === 'command_block' && trimmed.startsWith('/')) issues.push({ severity:'warn', lineNo, pos:0, message:'command block mode では通常、先頭の / は不要です。', marker: markerAt(trimmed, 0) });

    const body = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    const reader = new Reader(body);
    parseCommand(reader, issues, body, edition);
    reader.skipSpaces();
    if (!reader.eof() && !issues.some(x => x.severity === 'error')){
      issues.push(makeIssue(body, reader.cursor, 'ここから先の構文を解釈できません。', 'error', lineNo));
    }
    return issues.map(item => ({ ...item, lineNo }));
  }

  function validateText(text, edition, mode){
    const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
    const issues = [];
    lines.forEach((line, idx) => issues.push(...validateLine(line, edition, mode, idx + 1)));
    return issues;
  }

  function currentWordBounds(text, cursor){
    let start = cursor, end = cursor;
    while (start > 0 && /[A-Za-z0-9_:@.\-\[\],=]/.test(text[start - 1])) start--;
    while (end < text.length && /[A-Za-z0-9_:@.\-\[\],=]/.test(text[end])) end++;
    return { start, end, word: text.slice(start, end) };
  }

  function prefixSuggestions(items, prefix=''){
    const p = String(prefix || '').toLowerCase();
    const list = uniq(items).filter(Boolean);
    const filtered = p ? list.filter(item => item.toLowerCase().startsWith(p)) : list.slice();
    return filtered.sort((a,b) => a.localeCompare(b));
  }

  function getSelectorSuggestions(prefix, edition){
    const base = edition === 'java' ? ['@p','@a','@r','@e','@s','@n'] : ['@p','@a','@r','@e','@s','@initiator'];
    return prefixSuggestions(base, prefix);
  }
  function getRootSuggestions(prefix, edition){
    return prefixSuggestions(edition === 'java' ? JAVA_ROOTS : BEDROCK_ROOTS, prefix);
  }
  function getExecuteSuggestions(prefix, edition){
    return prefixSuggestions(EXECUTE_SUBS[edition], prefix);
  }
  function cheapTokens(text){
    return text.trim().split(/\s+/).filter(Boolean).map(x => x.toLowerCase());
  }
  function getScoreboardSuggestions(tokens, prefix, edition){
    if (tokens.length <= 1) return prefixSuggestions(['objectives','players'], prefix);
    if (tokens[1] === 'objectives') return prefixSuggestions(['add','list','modify','remove','setdisplay'], prefix);
    if (tokens[1] === 'players'){
      const java = ['add','enable','get','list','operation','remove','reset','set'];
      const bedrock = ['add','list','operation','random','remove','reset','set','test'];
      return prefixSuggestions(edition === 'java' ? java : bedrock, prefix);
    }
    return [];
  }

  function getAutocompleteState(text, cursor, edition){
    const before = text.slice(0, cursor);
    const lineStart = before.lastIndexOf('\n') + 1;
    const line = before.slice(lineStart);
    const bounds = currentWordBounds(text, cursor);
    const word = bounds.word;

    const selectorCtx = line.match(/@(?:[a-z]+)?(?:\[[^\]]*)?$/i);
    if (selectorCtx){
      const fragment = selectorCtx[0];
      if (fragment.includes('[')){
        const inner = fragment.slice(fragment.indexOf('[') + 1);
        const last = splitTopLevel(inner, ',').slice(-1)[0] || '';
        if (!last.includes('=')){
          const prefix = last.trim();
          const opts = edition === 'java' ? [...JAVA_SELECTOR_OPTIONS] : [...BEDROCK_SELECTOR_OPTIONS];
          return { suggestions: prefixSuggestions(opts, prefix), range: bounds };
        }
      }else{
        return {
          suggestions: getSelectorSuggestions(fragment, edition),
          range: {
            start: lineStart + fragment.lastIndexOf('@'),
            end: lineStart + fragment.length,
            word: fragment
          }
        };
      }
    }

    const rawLine = line.trimStart();
    const noSlash = rawLine.startsWith('/') ? rawLine.slice(1) : rawLine;
    const tokens = cheapTokens(noSlash);
    const endsWithSpace = /\s$/.test(line);
    const rootToken = tokens[0] || '';

    if (!tokens.length){
      return { suggestions: getRootSuggestions('', edition), range: bounds };
    }

    if (tokens.length === 1 && !endsWithSpace){
      return { suggestions: getRootSuggestions(rootToken, edition), range: { start: lineStart + (rawLine.startsWith('/') ? 1 : 0), end: lineStart + rawLine.length, word: rootToken } };
    }

    const root = rootCanonical(rootToken, edition);
    const currentPrefix = endsWithSpace ? '' : word;

    if (root === 'execute'){
      return { suggestions: getExecuteSuggestions(currentPrefix, edition), range: bounds };
    }
    if (root === 'scoreboard'){
      return { suggestions: getScoreboardSuggestions(tokens, currentPrefix, edition), range: bounds };
    }
    if ((line.endsWith('@') || /\s@$/.test(line) || currentPrefix.startsWith('@'))){
      return { suggestions: getSelectorSuggestions(currentPrefix || '@', edition), range: bounds };
    }

    return { suggestions: [], range: bounds };
  }

  function formatIssues(issues){
    return {
      errors: issues.filter(x => x.severity === 'error'),
      warnings: issues.filter(x => x.severity !== 'error')
    };
  }

  function createMirror(textarea){
    const div = document.createElement('div');
    const style = getComputedStyle(textarea);
    const props = ['boxSizing','width','height','overflowX','overflowY','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','paddingTop','paddingRight','paddingBottom','paddingLeft','fontStyle','fontVariant','fontWeight','fontStretch','fontSize','lineHeight','fontFamily','textAlign','textTransform','textIndent','textDecoration','letterSpacing','wordSpacing','tabSize'];
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.top = '0';
    div.style.left = '-9999px';
    props.forEach(p => div.style[p] = style[p]);
    document.body.appendChild(div);
    return div;
  }

  function caretCoordinates(textarea, position){
    const div = createMirror(textarea);
    const before = textarea.value.slice(0, position);
    const after = textarea.value.slice(position) || '.';
    div.textContent = before;
    const span = document.createElement('span');
    span.textContent = after[0];
    div.appendChild(span);
    const rect = span.getBoundingClientRect();
    const base = div.getBoundingClientRect();
    div.remove();
    return {
      top: rect.top - base.top - textarea.scrollTop,
      left: rect.left - base.left - textarea.scrollLeft,
      bottom: rect.top - base.top - textarea.scrollTop + 24
    };
  }

  function initApp(){
    const input = document.getElementById('input');
    const editorView = document.getElementById('editorView');
    const output = document.getElementById('output');
    const editionEl = document.getElementById('edition');
    const modeEl = document.getElementById('mode');
    const optimizeBtn = document.getElementById('optimizeBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const sampleBtn = document.getElementById('sampleBtn');
    const clearBtn = document.getElementById('clearBtn');
    const summary = document.getElementById('summary');
    const sampleInfo = document.getElementById('sampleInfo');
    const errorsEl = document.getElementById('errors');
    const warningsEl = document.getElementById('warnings');
    const popup = document.getElementById('suggestions');
    const popupList = document.getElementById('suggestionsList');

    const state = {
      suggestionItems: [],
      activeIndex: 0,
      replaceRange: null,
      previewActive: false,
      acceptedRange: null,
      acceptedUntil: 0,
      lastSampleName: ''
    };

    function hidePopup(){
      popup.hidden = true;
      popupList.innerHTML = '';
      state.suggestionItems = [];
      state.activeIndex = 0;
      state.replaceRange = null;
      state.previewActive = false;
      renderEditor();
    }

    function renderPopup(){
      popupList.innerHTML = '';
      if (!state.suggestionItems.length){
        popup.hidden = true;
        return;
      }
      const typed = state.replaceRange ? input.value.slice(state.replaceRange.start, state.replaceRange.end) : '';
      state.suggestionItems.forEach((item, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'suggestion-item' + (idx === state.activeIndex ? ' active' : '');
        const prefixLen = item.toLowerCase().startsWith(String(typed).toLowerCase()) ? typed.length : 0;
        btn.innerHTML = `<span class="suggestion-prefix">${escapeHtml(item.slice(0, prefixLen))}</span><span class="suggestion-rest">${escapeHtml(item.slice(prefixLen))}</span>`;
        btn.addEventListener('mousedown', e => {
          e.preventDefault();
          state.activeIndex = idx;
          commitPreview();
        });
        popupList.appendChild(btn);
      });
      popup.hidden = false;
    }

    function placePopup(){
      if (!state.suggestionItems.length || !state.replaceRange) return;
      const coords = caretCoordinates(input, input.selectionStart);
      popup.style.left = Math.max(0, coords.left) + 'px';
      popup.style.top = Math.max(0, coords.bottom + 6) + 'px';
    }

    function syncOverlayScroll(){
      editorView.style.transform = `translate(${-input.scrollLeft}px, ${-input.scrollTop}px)`;
    }

    function renderEditor(){
      const value = input.value || '';
      const now = Date.now();
      const accepted = state.acceptedRange && state.acceptedUntil > now ? state.acceptedRange : null;
      const preview = state.previewActive && state.suggestionItems.length && state.replaceRange && input.selectionStart === input.selectionEnd
        ? {
            caret: input.selectionStart,
            range: state.replaceRange,
            typed: input.value.slice(state.replaceRange.start, state.replaceRange.end),
            suggestion: state.suggestionItems[state.activeIndex] || ''
          }
        : null;

      let html = '';
      let ghostInserted = false;
      let acceptOpen = false;

      function maybeInsertGhost(position){
        if (!ghostInserted && preview && position === preview.caret){
          const suggestion = preview.suggestion;
          const typed = preview.typed;
          const suffix = suggestion.toLowerCase().startsWith(typed.toLowerCase()) ? suggestion.slice(typed.length) : '';
          if (suffix) html += `<span class="ghost">${escapeHtml(suffix)}</span>`;
          ghostInserted = true;
        }
      }

      for (let i=0;i<=value.length;i++){
        maybeInsertGhost(i);
        if (i === value.length) break;
        if (accepted && i === accepted.start){
          html += '<span class="accepted">';
          acceptOpen = true;
        }
        const ch = value[i];
        if (ch === '\n') html += '\n';
        else if (ch === ' ') html += '&nbsp;';
        else html += escapeHtml(ch);
        if (accepted && i + 1 === accepted.end && acceptOpen){
          html += '</span>';
          acceptOpen = false;
        }
      }
      if (acceptOpen) html += '</span>';
      editorView.innerHTML = html || '&nbsp;';
      syncOverlayScroll();
    }

    function renderDiagnostics(){
      const issues = validateText(input.value, editionEl.value, modeEl.value);
      const parts = formatIssues(issues);
      errorsEl.innerHTML = '';
      warningsEl.innerHTML = '';

      if (!parts.errors.length){
        const li = document.createElement('li');
        li.className = 'ok';
        li.textContent = 'エラー候補は見つかりませんでした';
        errorsEl.appendChild(li);
      }else{
        parts.errors.forEach(item => {
          const li = document.createElement('li');
          li.className = 'danger';
          li.innerHTML = `<strong>${item.lineNo}行目:</strong> ${escapeHtml(item.message)}<br><code>${escapeHtml(item.marker)}</code>`;
          errorsEl.appendChild(li);
        });
      }

      if (!parts.warnings.length){
        const li = document.createElement('li');
        li.className = 'small';
        li.textContent = '追加の警告はありません';
        warningsEl.appendChild(li);
      }else{
        parts.warnings.forEach(item => {
          const li = document.createElement('li');
          li.className = item.severity === 'warn' ? 'warn' : 'small';
          li.innerHTML = `<strong>${item.lineNo}行目:</strong> ${escapeHtml(item.message)}<br><code>${escapeHtml(item.marker)}</code>`;
          warningsEl.appendChild(li);
        });
      }
    }

    function updateSuggestions(){
      const res = getAutocompleteState(input.value, input.selectionStart, editionEl.value);
      state.suggestionItems = (res.suggestions || []).slice(0, 16);
      state.replaceRange = res.range || null;
      if (!state.suggestionItems.length){
        state.previewActive = false;
        popup.hidden = true;
        popupList.innerHTML = '';
        renderEditor();
        return;
      }
      if (state.activeIndex >= state.suggestionItems.length) state.activeIndex = 0;
      renderPopup();
      placePopup();
      renderEditor();
    }

    function commitPreview(){
      if (!state.suggestionItems.length || !state.replaceRange) return false;
      const suggestion = state.suggestionItems[state.activeIndex];
      const start = state.replaceRange.start;
      const end = state.replaceRange.end;
      const typed = input.value.slice(start, end);
      input.value = input.value.slice(0, start) + suggestion + input.value.slice(end);
      const caret = start + suggestion.length;
      input.setSelectionRange(caret, caret);
      const prefixLen = suggestion.toLowerCase().startsWith(typed.toLowerCase()) ? typed.length : 0;
      state.acceptedRange = { start: start + prefixLen, end: start + suggestion.length };
      state.acceptedUntil = Date.now() + 900;
      state.previewActive = false;
      renderDiagnostics();
      updateSuggestions();
      return true;
    }

    function cyclePreview(direction){
      if (!state.suggestionItems.length) return;
      if (!state.previewActive){
        state.previewActive = true;
        state.activeIndex = direction < 0 ? state.suggestionItems.length - 1 : 0;
      }else{
        state.activeIndex = (state.activeIndex + direction + state.suggestionItems.length) % state.suggestionItems.length;
      }
      renderPopup();
      placePopup();
      renderEditor();
    }

    function closePreview(){
      state.previewActive = false;
      renderEditor();
    }

    function doOptimize(){
      const res = optimizeText(input.value, editionEl.value, modeEl.value);
      output.value = res.optimized;
      summary.textContent = `${res.total}行中 ${res.changed}行を調整`;
      renderDiagnostics();
      renderEditor();
      localStorage.setItem('mc-command-tool-input', input.value);
      localStorage.setItem('mc-command-tool-edition', editionEl.value);
      localStorage.setItem('mc-command-tool-mode', modeEl.value);
    }

    function shouldCommitOnKey(e){
      if (!state.previewActive) return false;
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (e.key === ' ' || e.key === 'Spacebar') return true;
      if (e.key.length === 1) return true;
      if (e.key === 'ArrowRight') return true;
      return false;
    }

    optimizeBtn.addEventListener('click', doOptimize);
    copyBtn.addEventListener('click', async () => {
      try{
        await navigator.clipboard.writeText(output.value);
        summary.textContent = '出力をコピーしました';
      }catch{
        summary.textContent = 'コピーに失敗しました';
      }
    });
    downloadBtn.addEventListener('click', () => {
      const blob = new Blob([output.value], { type:'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'optimized_commands.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    sampleBtn.addEventListener('click', () => {
      const sample = randSample(editionEl.value, state.lastSampleName);
      if (!sample) return;
      state.lastSampleName = sample.name;
      input.value = sample.command;
      sampleInfo.textContent = `${sample.name}: ${sample.desc}`;
      doOptimize();
      updateSuggestions();
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      output.value = '';
      summary.textContent = 'まだ実行されていません';
      sampleInfo.textContent = 'まだサンプルは入っていません。サンプル入力を押すと、今のエディションに合ったコマンドがランダムで 1 つ入ります。';
      state.acceptedRange = null;
      state.acceptedUntil = 0;
      hidePopup();
      renderDiagnostics();
      renderEditor();
    });

    input.addEventListener('input', () => {
      renderDiagnostics();
      updateSuggestions();
      renderEditor();
    });
    input.addEventListener('click', () => {
      state.previewActive = false;
      updateSuggestions();
    });
    input.addEventListener('keyup', e => {
      if (!['ArrowUp','ArrowDown','Enter','Escape','Tab'].includes(e.key)){
        updateSuggestions();
      }
    });
    input.addEventListener('scroll', () => {
      syncOverlayScroll();
      placePopup();
    });
    window.addEventListener('resize', placePopup);
    editionEl.addEventListener('change', () => {
      state.previewActive = false;
      renderDiagnostics();
      updateSuggestions();
      doOptimize();
    });
    modeEl.addEventListener('change', () => {
      renderDiagnostics();
      doOptimize();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Tab'){
        if (state.suggestionItems.length){
          e.preventDefault();
          cyclePreview(e.shiftKey ? -1 : 1);
        }
        return;
      }
      if (e.key === 'Enter' && state.previewActive){
        e.preventDefault();
        commitPreview();
        return;
      }
      if (e.key === 'Escape'){
        closePreview();
        return;
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && state.suggestionItems.length){
        e.preventDefault();
        cyclePreview(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (shouldCommitOnKey(e)){
        commitPreview();
      }
    });

    const savedInput = localStorage.getItem('mc-command-tool-input');
    const savedEdition = localStorage.getItem('mc-command-tool-edition');
    const savedMode = localStorage.getItem('mc-command-tool-mode');
    if (savedInput) input.value = savedInput;
    if (savedEdition) editionEl.value = savedEdition;
    if (savedMode) modeEl.value = savedMode;
    renderDiagnostics();
    updateSuggestions();
    doOptimize();
    renderEditor();
  }

  const api = {
    optimizeLine, optimizeText, validateLine, validateText,
    getAutocompleteState, randSample, JAVA_ROOTS, BEDROCK_ROOTS, SAMPLE_SETS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    window.MCCommandTool = api;
    window.addEventListener('DOMContentLoaded', initApp);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
