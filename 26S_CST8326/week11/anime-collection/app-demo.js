/**
 * app-demo.js — runs the anime-collection MVC app live in the browser.
 * A compact Express-ish router + a mini Pug engine (the same one used on
 * the Week 11 island) drive a clickable mini-browser: links navigate,
 * forms submit, and the in-memory "database" really changes. MVC under
 * the hood — Model (array) · View (Pug) · Controller (functions).
 */
(function () {
  'use strict';

  /* ---------- syntax highlighter (for the code listings) ---------- */
  var KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|new|async|await|try|catch|finally|throw|typeof|of|in|class|extends|this|true|false|null|undefined|require|module|exports)\b/;
  var TOKEN_RE = new RegExp('(\\/\\/[^\\n]*)|("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)|' + KEYWORDS.source + '|\\b(\\d+(?:\\.\\d+)?)\\b|([A-Za-z_$][\\w$]*)(?=\\s*\\()', 'g');
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function highlight(code) {
    var out = '', last = 0, m; TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(code)) !== null) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="tok-c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-s">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-k">' + esc(m[3]) + '</span>';
      else if (m[4]) out += '<span class="tok-n">' + esc(m[4]) + '</span>';
      else if (m[5]) out += '<span class="tok-f">' + esc(m[5]) + '</span>';
      last = TOKEN_RE.lastIndex;
    }
    return out + esc(code.slice(last));
  }
  document.querySelectorAll('.code-block pre > code').forEach(function (c) { c.innerHTML = highlight(c.textContent); });

  /* ============ mini Pug engine (subset used by this app) ============ */
  var VOID_TAGS = { meta: 1, link: 1, img: 1, br: 1, hr: 1, input: 1 };
  function evalExpr(expr, locals) {
    try { return (new Function('locals', 'with (locals) { return (' + expr + '); }'))(locals); }
    catch (e) { throw new Error('Pug expression error in "' + expr + '": ' + e.message); }
  }
  function interpolate(text, locals) {
    return text.replace(/#\{([^}]*)\}/g, function (_, ex) { var v = evalExpr(ex.trim(), locals); return esc(v == null ? '' : v); })
               .replace(/!\{([^}]*)\}/g, function (_, ex) { var v = evalExpr(ex.trim(), locals); return v == null ? '' : String(v); });
  }
  function splitAttrs(str) {
    var parts = [], cur = '', q = null, depth = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(') depth++; if (c === ')') depth--;
      if ((c === ' ' || c === ',') && depth === 0) { if (cur.trim()) parts.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }
  function parseLineToTag(line, locals) {
    var rest = line, tag = '', classes = [], id = '';
    var m = rest.match(/^([a-zA-Z][\w-]*)/); if (m) { tag = m[1]; rest = rest.slice(m[0].length); }
    var cm; while ((cm = rest.match(/^([.#])([\w-]+)/))) { if (cm[1] === '.') classes.push(cm[2]); else id = cm[2]; rest = rest.slice(cm[0].length); }
    if (!tag) tag = 'div';
    var attrHtml = ''; if (id) attrHtml += ' id="' + esc(id) + '"';
    if (rest.charAt(0) === '(') {
      var close = rest.indexOf(')'); var inside = rest.slice(1, close); rest = rest.slice(close + 1);
      splitAttrs(inside).forEach(function (pair) {
        var eq = pair.indexOf('='); if (eq === -1) { attrHtml += ' ' + pair; return; }
        var name = pair.slice(0, eq).trim(); var val = evalExpr(pair.slice(eq + 1).trim(), locals);
        if (name === 'class') { classes.push(String(val)); return; }
        if (val === false || val == null) return;
        attrHtml += ' ' + name + '="' + esc(val) + '"';
      });
    }
    if (classes.length) attrHtml = ' class="' + esc(classes.join(' ')) + '"' + attrHtml;
    var isCode = false, text = '', blockText = false;
    rest = rest.replace(/^\s+/, '');
    if (rest.charAt(0) === '=') { isCode = true; text = rest.slice(1).trim(); }
    else if (rest === '.') blockText = true;
    else if (rest.length) text = rest;
    return { tag: tag, attrs: attrHtml, isCode: isCode, text: text, blockText: blockText };
  }
  function buildTree(lines) {
    var root = { indent: -1, children: [] }, stack = [root];
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i]; if (!raw.trim()) continue;
      var indent = raw.match(/^\s*/)[0].length;
      var node = { indent: indent, line: raw.trim(), children: [] };
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      stack[stack.length - 1].children.push(node); stack.push(node);
    }
    return root.children;
  }
  function collectBlocks(nodes, map) {
    nodes.forEach(function (n) { var bm = n.line.match(/^block\s+(\S+)/); if (bm) map[bm[1]] = n.children; collectBlocks(n.children, map); });
  }
  function renderNodes(nodes, locals, childBlocks) {
    var out = '';
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i], line = node.line;
      if (/^\/\//.test(line)) continue;
      if (/^extends\b/.test(line)) continue;
      var bm = line.match(/^block\s+(\S+)/);
      if (bm) { var content = (childBlocks && childBlocks[bm[1]]) ? childBlocks[bm[1]] : node.children; out += renderNodes(content, locals, childBlocks); continue; }
      if (line === 'doctype html') { out += '<!DOCTYPE html>\n'; continue; }
      if (line.charAt(0) === '|') { out += interpolate(line.slice(1).trim(), locals) + '\n'; continue; }
      if (line.charAt(0) === '-') {
        var code = line.slice(1).trim(); var am = code.match(/^(?:const|let|var)\s+([\w$]+)\s*=\s*([\s\S]+)$/);
        if (am) locals[am[1]] = evalExpr(am[2], locals); else { try { evalExpr(code, locals); } catch (e) {} }
        continue;
      }
      var ifm = line.match(/^if\s+([\s\S]+)$/);
      if (ifm) {
        var branches = [{ cond: ifm[1], node: node }];
        while (i + 1 < nodes.length) {
          var nx = nodes[i + 1].line, eim = nx.match(/^else if\s+([\s\S]+)$/);
          if (eim) { i++; branches.push({ cond: eim[1], node: nodes[i] }); continue; }
          if (nx === 'else') { i++; branches.push({ cond: null, node: nodes[i] }); } break;
        }
        for (var b = 0; b < branches.length; b++) { if (branches[b].cond === null || evalExpr(branches[b].cond, locals)) { out += renderNodes(branches[b].node.children, locals, childBlocks); break; } }
        continue;
      }
      var em = line.match(/^each\s+([\w$]+)(?:\s*,\s*([\w$]+))?\s+in\s+([\s\S]+)$/);
      if (em) {
        var vN = em[1], iN = em[2], arr = evalExpr(em[3], locals), sV = locals[vN], sI = iN ? locals[iN] : undefined;
        (arr || []).forEach(function (item, idx) { locals[vN] = item; if (iN) locals[iN] = idx; out += renderNodes(node.children, locals, childBlocks); });
        locals[vN] = sV; if (iN) locals[iN] = sI; continue;
      }
      var t = parseLineToTag(line, locals);
      if (t.blockText) { out += '<' + t.tag + t.attrs + '>' + node.children.map(function (c) { return c.line; }).join('\n') + '</' + t.tag + '>\n'; continue; }
      var inner = t.isCode ? esc(evalExpr(t.text, locals)) : (t.text ? interpolate(t.text, locals) : '');
      if (VOID_TAGS[t.tag]) { out += '<' + t.tag + t.attrs + '>\n'; continue; }
      out += '<' + t.tag + t.attrs + '>' + inner + renderNodes(node.children, locals, childBlocks) + '</' + t.tag + '>\n';
    }
    return out;
  }
  function pugRender(src, locals, lookup) {
    locals = locals || {};
    var nodes = buildTree(src.replace(/\t/g, '  ').split('\n'));
    for (var i = 0; i < nodes.length; i++) {
      var em = nodes[i].line.match(/^extends\s+(\S+)/);
      if (em) {
        var cb = {}; collectBlocks(nodes, cb);
        var layoutSrc = lookup(em[1]); if (layoutSrc == null) throw new Error('cannot find layout "' + em[1] + '"');
        return renderNodes(buildTree(layoutSrc.replace(/\t/g, '  ').split('\n')), locals, cb).replace(/\n{2,}/g, '\n');
      }
    }
    return renderNodes(nodes, locals, null).replace(/\n{2,}/g, '\n');
  }

  /* ---------- route path matcher ---------- */
  function compilePath(p) {
    var keys = [];
    var re = p.replace(/[.\\+*?^${}|[\]]/g, '\\$&').replace(/:([\w]+)/g, function (_, k) { keys.push(k); return '([^/]+)'; });
    return { regexp: new RegExp('^' + re + '$'), keys: keys };
  }
  function matchPath(c, path) {
    var m = c.regexp.exec(path); if (!m) return null;
    var params = {}; c.keys.forEach(function (k, i) { params[k] = decodeURIComponent(m[i + 1]); }); return params;
  }

  /* ============ THE APP (Model · View · Controller) ============ */
  var SEED = [
    { id: 1, title: "Fullmetal Alchemist: Brotherhood", rating: 10 },
    { id: 2, title: "Attack on Titan", rating: 9 },
    { id: 3, title: "Frieren", rating: 10 }
  ];

  var VIEWS = {
    layout:
      'doctype html\nhtml(lang="en")\n  head\n    title #{title} — Anime Collection\n  body\n' +
      '    header.site-header\n      a.brand(href="/") 🎬 Anime Collection\n      a.btn(href="/add") + Add anime\n' +
      '    main.container\n      block content\n    footer.site-footer\n      p Built with Express + Pug · CST8326',
    index:
      'extends layout\nblock content\n  h1= title\n  if anime.length === 0\n    p.empty No anime yet — add your first one!\n  else\n' +
      '    ul.anime-list\n      each item in anime\n        li.anime-card\n          a.anime-title(href=`/anime/${item.id}`)= item.title\n          span.rating ★ #{item.rating}/10',
    add:
      'extends layout\nblock content\n  h1 Add a new anime\n  form.form(action="/add" method="POST")\n' +
      '    label(for="title") Title\n    input(type="text" id="title" name="title" required)\n' +
      '    label(for="rating") Rating (1–10)\n    input(type="number" id="rating" name="rating" min="1" max="10" required)\n' +
      '    button.btn(type="submit") Save\n  a.back(href="/") ← Cancel',
    details:
      'extends layout\nblock content\n  h1= anime.title\n  p.rating-big ★ #{anime.rating}/10\n' +
      '  form.inline(action=`/anime/${anime.id}/delete` method="POST")\n    button.btn.danger(type="submit") Delete\n  a.back(href="/") ← Back to list'
  };
  function viewLookup(name) { name = String(name).replace(/\.pug$/, ''); return VIEWS.hasOwnProperty(name) ? VIEWS[name] : null; }

  var demo = document.getElementById('app-screen');
  if (!demo) return;

  var animeList, nextId;
  function reset() {
    animeList = SEED.map(function (a) { return { id: a.id, title: a.title, rating: a.rating }; });
    nextId = 4;
  }
  reset();

  // CONTROLLER
  var controller = {
    index: function (req, res) { res.render('index', { title: 'My Anime Collection', anime: animeList }); },
    details: function (req, res) {
      var a = animeList.find(function (x) { return x.id === Number(req.params.id); });
      if (!a) { res.status(404); res.render('index', { title: 'Not found', anime: animeList }); return; }
      res.render('details', { title: a.title, anime: a });
    },
    addForm: function (req, res) { res.render('add', { title: 'Add anime' }); },
    create: function (req, res) {
      var title = (req.body.title || '').trim();
      if (title) { animeList.push({ id: nextId++, title: title, rating: Number(req.body.rating) || 0 }); }
      res.redirect('/');
    },
    remove: function (req, res) { animeList = animeList.filter(function (x) { return x.id !== Number(req.params.id); }); res.redirect('/'); }
  };

  // ROUTES (method, path, handler)
  var routes = [
    ['GET', '/', controller.index],
    ['GET', '/add', controller.addForm],
    ['POST', '/add', controller.create],
    ['GET', '/anime/:id', controller.details],
    ['POST', '/anime/:id/delete', controller.remove]
  ].map(function (r) { return { method: r[0], compiled: compilePath(r[1]), handler: r[2] }; });

  /* ---------- the mini-browser ---------- */
  var addrEl = document.getElementById('app-url');
  var statusEl = document.getElementById('app-status');

  function bodyInner(html) { var m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i); return m ? m[1] : html; }

  function navigate(method, rawPath, body) {
    var path = String(rawPath || '/').split('?')[0];
    if (path.charAt(0) !== '/') path = '/' + path;
    method = (method || 'GET').toUpperCase();

    var res = {
      _code: 200,
      status: function (c) { this._code = c; return this; },
      render: function (view, locals) {
        var html;
        try { html = pugRender(viewLookup(view), locals || {}, viewLookup); }
        catch (e) { demo.innerHTML = '<p style="color:#f87171;padding:16px">Render error: ' + esc(e.message) + '</p>'; return; }
        demo.innerHTML = bodyInner(html);
        if (addrEl) addrEl.textContent = 'localhost:3000' + path;
        if (statusEl) { statusEl.textContent = method + ' ' + path + ' → ' + this._code; statusEl.className = 'app-req ' + (this._code >= 400 ? 'bad' : 'ok'); }
      },
      redirect: function (loc) {
        if (statusEl) { statusEl.textContent = method + ' ' + path + ' → 302 → GET ' + loc; statusEl.className = 'app-req ok'; }
        navigate('GET', loc);
      }
    };

    for (var i = 0; i < routes.length; i++) {
      if (routes[i].method !== method) continue;
      var params = matchPath(routes[i].compiled, path);
      if (!params) continue;
      var req = { method: method, params: params, body: body || {}, query: {} };
      try { routes[i].handler(req, res); } catch (e) { demo.innerHTML = '<p style="color:#f87171;padding:16px">Server error: ' + esc(e.message) + '</p>'; }
      return;
    }
    // no route matched
    demo.innerHTML = '<div style="padding:20px"><h1>404</h1><p>Cannot ' + method + ' ' + esc(path) + '</p><a class="back" href="/">← Home</a></div>';
    if (statusEl) { statusEl.textContent = method + ' ' + path + ' → 404'; statusEl.className = 'app-req bad'; }
  }

  // intercept link clicks + form submits inside the screen
  demo.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (a && a.getAttribute('href').charAt(0) === '/') { e.preventDefault(); navigate('GET', a.getAttribute('href')); }
  });
  demo.addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var body = {}; Array.prototype.forEach.call(form.elements, function (el) { if (el.name) body[el.name] = el.value; });
    navigate((form.getAttribute('method') || 'GET'), form.getAttribute('action') || '/', body);
  });

  var homeBtn = document.getElementById('app-home');
  if (homeBtn) homeBtn.addEventListener('click', function () { navigate('GET', '/'); });
  var resetBtn = document.getElementById('app-reset');
  if (resetBtn) resetBtn.addEventListener('click', function () { reset(); navigate('GET', '/'); });

  // boot
  navigate('GET', '/');
})();
