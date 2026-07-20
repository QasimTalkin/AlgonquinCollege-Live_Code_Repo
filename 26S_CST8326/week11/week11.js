/**
 * week11.js — interactivity for the Week 11 "Express.js" island.
 * Extends the Week 10 Node emulator with a mini-Express framework
 * (routing, middleware, params, res.send/json/render) and a mini-Pug
 * template engine, plus an enhanced mini-browser (method + body = a REST
 * tester), a middleware pipeline animation, a route-parameter matcher,
 * a live Pug playground, quiz, scroll-spy TOC and progress bar.
 */
(function () {
  'use strict';

  /* ---------- 1. Lightweight JS syntax highlighter ---------- */
  var KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|new|async|await|try|catch|finally|throw|typeof|of|in|class|extends|this|true|false|null|undefined)\b/;
  var TOKEN_RE = new RegExp(
    '(\\/\\/[^\\n]*)' +
    '|("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)' +
    '|' + KEYWORDS.source +
    '|\\b(\\d+(?:\\.\\d+)?)\\b' +
    '|([A-Za-z_$][\\w$]*)(?=\\s*\\()',
    'g'
  );

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(code) {
    var out = '', last = 0, m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(code)) !== null) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="tok-c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-s">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-k">' + esc(m[3]) + '</span>';
      else if (m[4]) out += '<span class="tok-n">' + esc(m[4]) + '</span>';
      else if (m[5]) out += '<span class="tok-f">' + esc(m[5]) + '</span>';
      last = TOKEN_RE.lastIndex;
    }
    out += esc(code.slice(last));
    return out;
  }

  document.querySelectorAll('.code-block pre > code').forEach(function (codeEl) {
    codeEl.innerHTML = highlight(codeEl.textContent);
  });

  /* ============================================================
     2. MINI-PUG TEMPLATE ENGINE
     Handles the slide subset: tags, .class/#id, (attrs), #{interp},
     = buffered code, each/if/else, extends/block layouts, doctype.
     ============================================================ */
  var VOID_TAGS = { meta: 1, link: 1, img: 1, br: 1, hr: 1, input: 1, area: 1, base: 1, col: 1, source: 1 };

  function evalExpr(expr, locals) {
    try {
      return (new Function('locals', 'with (locals) { return (' + expr + '); }'))(locals);
    } catch (e) {
      throw new Error('Pug expression error in "' + expr + '": ' + e.message);
    }
  }

  function interpolate(text, locals) {
    return text.replace(/#\{([^}]*)\}/g, function (_, expr) {
      var v = evalExpr(expr.trim(), locals);
      return esc(v == null ? '' : v);
    }).replace(/!\{([^}]*)\}/g, function (_, expr) {
      var v = evalExpr(expr.trim(), locals);
      return v == null ? '' : String(v);
    });
  }

  // Split "(a='1' b='2' c)" style attribute strings on top-level whitespace/commas
  function splitAttrs(str) {
    var parts = [], cur = '', q = null, depth = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(') depth++;
      if (c === ')') depth--;
      if ((c === ' ' || c === ',') && depth === 0) {
        if (cur.trim()) parts.push(cur.trim());
        cur = '';
      } else cur += c;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function parseLineToTag(line, locals) {
    // returns { tag, attrs (html string), rest, isCode, text, blockText:false }
    var rest = line, tag = '', classes = [], id = '';
    var m = rest.match(/^([a-zA-Z][\w-]*)/);
    if (m) { tag = m[1]; rest = rest.slice(m[0].length); }
    // .class and #id
    var cm;
    while ((cm = rest.match(/^([.#])([\w-]+)/))) {
      if (cm[1] === '.') classes.push(cm[2]); else id = cm[2];
      rest = rest.slice(cm[0].length);
    }
    if (!tag) tag = 'div';

    var attrHtml = '';
    if (id) attrHtml += ' id="' + esc(id) + '"';
    // (attrs)
    if (rest.charAt(0) === '(') {
      var close = rest.indexOf(')');
      var inside = rest.slice(1, close);
      rest = rest.slice(close + 1);
      splitAttrs(inside).forEach(function (pair) {
        var eq = pair.indexOf('=');
        if (eq === -1) { attrHtml += ' ' + pair; return; }
        var name = pair.slice(0, eq).trim();
        var valExpr = pair.slice(eq + 1).trim();
        var val = evalExpr(valExpr, locals);
        if (name === 'class') { classes.push(String(val)); return; }
        if (val === false || val == null) return;
        attrHtml += ' ' + name + '="' + esc(val) + '"';
      });
    }
    if (classes.length) attrHtml = ' class="' + esc(classes.join(' ')) + '"' + attrHtml;

    var isCode = false, text = '', blockText = false;
    rest = rest.replace(/^\s+/, '');
    if (rest.charAt(0) === '=') { isCode = true; text = rest.slice(1).trim(); }
    else if (rest === '.') { blockText = true; }
    else if (rest.length) { text = rest; }

    return { tag: tag, attrs: attrHtml, isCode: isCode, text: text, blockText: blockText };
  }

  function buildTree(lines) {
    var root = { indent: -1, line: '', children: [] };
    var stack = [root];
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (!raw.trim()) continue;
      var indent = raw.match(/^\s*/)[0].length;
      var node = { indent: indent, line: raw.trim(), rawLine: raw, children: [] };
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return root.children;
  }

  function collectBlocks(nodes, map) {
    nodes.forEach(function (n) {
      var bm = n.line.match(/^block\s+(\S+)/);
      if (bm) map[bm[1]] = n.children;
      collectBlocks(n.children, map);
    });
  }

  function renderNodes(nodes, locals, childBlocks) {
    var out = '';
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var line = node.line;

      if (/^\/\//.test(line)) continue;                    // comment
      if (/^extends\b/.test(line)) continue;               // handled elsewhere

      var bm = line.match(/^block\s+(\S+)/);
      if (bm) {
        var name = bm[1];
        var content = (childBlocks && childBlocks[name]) ? childBlocks[name] : node.children;
        out += renderNodes(content, locals, childBlocks);
        continue;
      }

      if (line === 'doctype html' || line === '!!! 5') { out += '<!DOCTYPE html>\n'; continue; }

      if (line.charAt(0) === '|') { out += esc(interpolateRaw(line.slice(1).trim(), locals)) + '\n'; continue; }

      if (line.charAt(0) === '-') {              // inline JS: support const/let/var NAME = EXPR
        var code = line.slice(1).trim();
        var am = code.match(/^(?:const|let|var)\s+([\w$]+)\s*=\s*([\s\S]+)$/);
        if (am) locals[am[1]] = evalExpr(am[2], locals);
        else { try { evalExpr(code, locals); } catch (e) { /* ignore side-effect-only */ } }
        continue;
      }

      var ifm = line.match(/^if\s+([\s\S]+)$/);
      if (ifm) {
        var branches = [{ cond: ifm[1], node: node }];
        while (i + 1 < nodes.length) {
          var nx = nodes[i + 1].line;
          var eim = nx.match(/^else if\s+([\s\S]+)$/);
          if (eim) { i++; branches.push({ cond: eim[1], node: nodes[i] }); continue; }
          if (nx === 'else') { i++; branches.push({ cond: null, node: nodes[i] }); }
          break;
        }
        for (var b = 0; b < branches.length; b++) {
          var take = branches[b].cond === null || evalExpr(branches[b].cond, locals);
          if (take) { out += renderNodes(branches[b].node.children, locals, childBlocks); break; }
        }
        continue;
      }

      var eachm = line.match(/^each\s+([\w$]+)(?:\s*,\s*([\w$]+))?\s+in\s+([\s\S]+)$/);
      if (eachm) {
        var valName = eachm[1], idxName = eachm[2], arr = evalExpr(eachm[3], locals);
        var savedV = locals[valName], savedI = idxName ? locals[idxName] : undefined;
        (arr || []).forEach(function (item, idx) {
          locals[valName] = item;
          if (idxName) locals[idxName] = idx;
          out += renderNodes(node.children, locals, childBlocks);
        });
        locals[valName] = savedV;
        if (idxName) locals[idxName] = savedI;
        continue;
      }

      // a tag line
      var t = parseLineToTag(line, locals);
      if (t.blockText) {                          // style. / script. → raw child text
        var rawText = node.children.map(function (c) { return c.line; }).join('\n');
        out += '<' + t.tag + t.attrs + '>' + rawText + '</' + t.tag + '>\n';
        continue;
      }

      var inner = '';
      if (t.isCode) inner = esc(evalExpr(t.text, locals));
      else if (t.text) inner = interpolateRaw(t.text, locals);

      if (VOID_TAGS[t.tag]) { out += '<' + t.tag + t.attrs + '>\n'; continue; }

      var childHtml = renderNodes(node.children, locals, childBlocks);
      out += '<' + t.tag + t.attrs + '>' + inner + childHtml + '</' + t.tag + '>\n';
    }
    return out;
  }

  function interpolateRaw(text, locals) { return interpolate(text, locals); }

  function pugRender(src, locals, viewLookup) {
    locals = locals || {};
    var lines = src.replace(/\t/g, '  ').split('\n');
    var nodes = buildTree(lines);

    // extends?
    var extLine = null;
    for (var i = 0; i < nodes.length; i++) {
      var em = nodes[i].line.match(/^extends\s+(\S+)/);
      if (em) { extLine = em[1]; break; }
    }
    if (extLine) {
      var childBlocks = {};
      collectBlocks(nodes, childBlocks);
      var layoutSrc = viewLookup ? viewLookup(extLine) : null;
      if (layoutSrc == null) throw new Error('Pug: cannot find layout "' + extLine + '"');
      var layoutNodes = buildTree(layoutSrc.replace(/\t/g, '  ').split('\n'));
      return renderNodes(layoutNodes, locals, childBlocks).replace(/\n{2,}/g, '\n');
    }
    return renderNodes(nodes, locals, null).replace(/\n{2,}/g, '\n');
  }

  /* ============================================================
     3. THE NODE + EXPRESS EMULATOR
     ============================================================ */
  var CWD = '/home/student/project';
  var VDISK = { 'example.txt': 'Hello from the virtual disk! 🗄️' };

  /* views shipped with the emulator so res.render() works out of the box */
  var VIEWS = {
    students:
      'doctype html\n' +
      'html\n' +
      '  head\n' +
      '    title #{title}\n' +
      '  body\n' +
      '    h1= title\n' +
      '    ul\n' +
      '      each s in students\n' +
      '        li #{s.name} — #{s.grade}',
    index:
      'doctype html\n' +
      'html\n' +
      '  head\n' +
      '    title My Pug Page\n' +
      '  body\n' +
      '    h1 Welcome, #{name}!\n' +
      '    ul\n' +
      '      each item in items\n' +
      '        li= item'
  };
  function viewLookup(name) {
    var key = String(name).replace(/\.pug$/, '');
    return VIEWS.hasOwnProperty(key) ? VIEWS[key] : null;
  }

  function normFile(p) { return String(p).replace(/^\.\//, ''); }
  function normPath(str, isAbs) {
    var parts = String(str).split('/'), out = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part || part === '.') continue;
      if (part === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else if (!isAbs) out.push('..'); }
      else out.push(part);
    }
    return (isAbs ? '/' : '') + out.join('/');
  }
  var pathModule = {
    sep: '/',
    join: function () { var s = Array.prototype.filter.call(arguments, Boolean).join('/'); return normPath(s, s.charAt(0) === '/') || '.'; },
    basename: function (p) { var a = String(p).split('/').filter(Boolean); return a.length ? a[a.length - 1] : ''; },
    dirname: function (p) { var i = String(p).lastIndexOf('/'); return i === -1 ? '.' : i === 0 ? '/' : String(p).slice(0, i); },
    extname: function (p) { var b = pathModule.basename(p); var i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; },
    resolve: function () { var cur = CWD; for (var i = 0; i < arguments.length; i++) { var part = String(arguments[i]); cur = part.charAt(0) === '/' ? part : cur + '/' + part; } return normPath(cur, true); }
  };
  var plat = /Mac/i.test(navigator.platform) ? 'darwin' : /Win/i.test(navigator.platform) ? 'win32' : 'linux';
  var osModule = {
    platform: function () { return plat; }, arch: function () { return 'x64'; }, hostname: function () { return 'algonquin-lab'; },
    cpus: function () { var n = navigator.hardwareConcurrency || 4, a = []; for (var i = 0; i < n; i++) a.push({ model: 'Virtual vCPU', speed: 2400 }); return a; }
  };
  function delay(v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 30); }); }
  var fsPromises = {
    readFile: function (p) { p = normFile(p); if (!(p in VDISK)) return delay().then(function () { throw new Error("ENOENT: '" + p + "'"); }); return delay(VDISK[p]); },
    writeFile: function (p, d) { VDISK[normFile(p)] = String(d); return delay(); },
    appendFile: function (p, d) { p = normFile(p); VDISK[p] = (VDISK[p] || '') + String(d); return delay(); },
    readdir: function () { return delay(Object.keys(VDISK).sort()); }
  };
  var fsModule = { promises: fsPromises };
  var urlModule = { URL: window.URL, URLSearchParams: window.URLSearchParams };

  var STATUS_TEXT = {
    200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently',
    302: 'Found', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized',
    403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error'
  };

  /* ---- path → matcher (shared by Express routing + the param widget) ---- */
  function compilePath(path, prefix) {
    var keys = [];
    if (prefix && path === '/') return { regexp: /^\//, keys: keys };  // root mount matches everything
    if (/:/.test(path)) {
      var re = path.replace(/[.\\+*?^${}|[\]]/g, function (c) { return c === '*' ? '.*' : '\\' + c; });
      re = re.replace(/:([\w]+)/g, function (_, k) { keys.push(k); return '([^/]+)'; });
      return { regexp: new RegExp('^' + re + (prefix ? '(?:/|$)' : '$')), keys: keys };
    }
    // pattern / literal: keep ( ) ? * + as regex meta, escape the rest
    var out = '';
    for (var i = 0; i < path.length; i++) {
      var c = path[i];
      if ('()?*+'.indexOf(c) !== -1) out += (c === '*' ? '.*' : c);
      else if (c === '/') out += '/';
      else if ('.\\^${}|[]'.indexOf(c) !== -1) out += '\\' + c;
      else out += c;
    }
    return { regexp: new RegExp('^' + out + (prefix ? '(?:/|$)' : '$')), keys: keys };
  }
  function matchPath(compiled, pathname) {
    var m = compiled.regexp.exec(pathname);
    if (!m) return null;
    var params = {};
    compiled.keys.forEach(function (k, i) { params[k] = decodeURIComponent(m[i + 1]); });
    return params;
  }

  /* ---- express() factory ---- */
  function makeExpress() {
    function express() {
      var stack = [];      // ordered layers: { type:'use'|'route', method, compiled, handlers }
      var settings = {};

      function addRoute(method) {
        return function (path) {
          var handlers = Array.prototype.slice.call(arguments, 1).filter(function (h) { return typeof h === 'function'; });
          stack.push({ type: 'route', method: method, path: path, compiled: compilePath(path, false), handlers: handlers });
          return app;
        };
      }

      var app = function () {};   // app is callable in real express; not needed here
      app._stack = stack;
      app._settings = settings;
      app.get = function (path) {
        // app.get('setting') getter vs app.get(path, handler) route
        if (arguments.length === 1 && typeof path === 'string' && !/[/:*(]/.test(path) && settings.hasOwnProperty(path)) {
          return settings[path];
        }
        return addRoute('get').apply(null, arguments);
      };
      app.post = addRoute('post');
      app.put = addRoute('put');
      app.delete = addRoute('delete');
      app.patch = addRoute('patch');
      app.all = addRoute('all');
      app.use = function (a, b) {
        var path = typeof a === 'string' ? a : '/';
        var fn = typeof a === 'function' ? a : b;
        if (typeof fn !== 'function') return app;
        stack.push({ type: 'use', method: 'use', path: path, compiled: compilePath(path, true), handlers: [fn] });
        return app;
      };
      app.set = function (k, v) { settings[k] = v; return app; };
      app.listen = function (port, cb) {
        port = port || 3000;
        app._port = port;
        app._register(port);
        if (typeof cb === 'function') cb();
        return { close: function () {} };
      };
      return app;
    }
    express.json = function () {
      return function jsonBodyParser(req, res, next) {
        if (req._rawBody && req._rawBody.trim()) {
          try { req.body = JSON.parse(req._rawBody); }
          catch (e) { res.status(400).json({ error: 'Invalid JSON in request body' }); return; }
        } else if (req.body === undefined) {
          req.body = {};
        }
        next();
      };
    };
    express.urlencoded = function () { return function (req, res, next) { if (req.body === undefined) req.body = {}; next(); }; };
    express.static = function (dir) { return function expressStatic(req, res, next) { next(); }; };
    express.Router = function () { return makeExpress()(); };
    return express;
  }

  /* ---- dispatch a request through an Express app ---- */
  function dispatchExpress(app, req, res) {
    var stack = app._stack, idx = 0;
    req.app = app;

    function next(err) {
      if (res._finished) return;
      if (idx >= stack.length) {
        if (!res._finished) res.status(404).send('Cannot ' + req.method + ' ' + req.path);
        return;
      }
      var layer = stack[idx++];
      var params = matchPath(layer.compiled, req.path);
      if (params === null) return next(err);
      if (layer.type === 'route' && layer.method !== 'all' && layer.method !== req.method.toLowerCase()) return next(err);
      req.params = params;
      var hi = 0;
      function runNext(e) {
        if (e) return next(e);
        if (res._finished) return;
        if (hi >= layer.handlers.length) return next();
        var h = layer.handlers[hi++];
        try {
          var out = h(req, res, runNext);
          if (out && typeof out.catch === 'function') out.catch(function (er) { fail(res, er); });
        } catch (er) { fail(res, er); }
      }
      runNext();
    }
    next();
  }
  function fail(res, err) {
    if (res._finished) return;
    res.status(500).send((err && err.name ? err.name : 'Error') + ': ' + (err && err.message ? err.message : String(err)));
  }

  /* ---- augment the mini-browser's raw res with Express conveniences ---- */
  function augmentExpressReqRes(req, res) {
    var u = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    req.path = u.pathname;
    req.query = {};
    u.searchParams.forEach(function (v, k) { req.query[k] = v; });
    req.ip = '::1 (emulated)';
    if (req.body === undefined && !req._rawBody) req.body = undefined;

    res.send = function (body) {
      if (body != null && typeof body === 'object') return res.json(body);
      if (!res._headers['Content-Type']) res._headers['Content-Type'] = 'text/html';
      res.end(String(body));
      return res;
    };
    res.json = function (obj) {
      res._headers['Content-Type'] = 'application/json';
      res.end(JSON.stringify(obj));
      return res;
    };
    res.status = function (code) { res.statusCode = code; return res; };
    res.set = function (k, v) { res._headers[k] = v; return res; };
    res.redirect = function (url) {
      res.statusCode = 302; res._headers['Location'] = url;
      res.end('Redirecting to ' + url);
      return res;
    };
    res.render = function (view, data) {
      var src = viewLookup(view);
      if (src == null) { res.status(500).send('Pug: no view named "' + view + '" in the emulator (ships: index, students)'); return res; }
      try {
        var html = pugRender(src, data || {}, viewLookup);
        res._headers['Content-Type'] = 'text/html';
        res.end(html);
      } catch (e) { res.status(500).send(e.message); }
      return res;
    };
  }

  function makeRequire(ctx) {
    return function require(name) {
      switch (name) {
        case 'express': return makeExpress();
        case 'http': return { createServer: function (h) { return { listen: function (p, cb) { ctx.registerRaw(h, p || 3000); if (cb) cb(); return this; }, close: function () {} }; } };
        case 'url': return urlModule;
        case 'fs': return fsModule;
        case 'path': return pathModule;
        case 'os': return osModule;
        case 'pug': return { render: function (src, opts) { return pugRender(src, opts || {}, viewLookup); }, compile: function (src) { return function (opts) { return pugRender(src, opts || {}, viewLookup); }; } };
        default:
          if (/^\.{0,2}\//.test(name)) throw new Error("Cannot find module '" + name + "' — the emulator has no project files.");
          throw new Error("Cannot find module '" + name + "'. The emulator ships: express, http, url, fs, path, os, pug.");
      }
    };
  }

  /* ---- the enhanced mini-browser (method selector + body = REST tester) ---- */
  function mountMiniBrowser(runner, isExpress) {
    var mb = runner.querySelector('.mini-browser');
    if (mb) return mb;
    mb = document.createElement('div');
    mb.className = 'mini-browser';
    var methodSel = isExpress
      ? '<select class="mb-method" aria-label="HTTP method"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select>'
      : '';
    mb.innerHTML =
      '<div class="mb-bar">' +
      '<span class="mb-icon">🌐</span>' + methodSel +
      '<span class="mb-origin"></span>' +
      '<input class="mb-path" value="/" spellcheck="false" aria-label="Request path">' +
      '<button class="mb-go">Send ⏎</button>' +
      '</div>' +
      (isExpress ? '<div class="mb-body-wrap hidden"><span class="mb-body-label">JSON request body</span>' +
        '<textarea class="mb-body-input" spellcheck="false">{\n  "title": "Demon Slayer",\n  "studio": "Ufotable"\n}</textarea></div>' : '') +
      '<div class="mb-result"><div class="mb-hint">Your server is running — press <b>Send</b> to make a request.</div></div>';
    runner.appendChild(mb);

    var input = mb.querySelector('.mb-path');
    var methodEl = mb.querySelector('.mb-method');
    var bodyWrap = mb.querySelector('.mb-body-wrap');
    function syncBody() {
      if (!bodyWrap) return;
      var m = methodEl ? methodEl.value : 'GET';
      bodyWrap.classList.toggle('hidden', m === 'GET' || m === 'DELETE');
    }
    if (methodEl) methodEl.addEventListener('change', syncBody);
    function go() { visitServer(runner, input.value, methodEl ? methodEl.value : 'GET', bodyWrap ? mb.querySelector('.mb-body-input').value : ''); }
    mb.querySelector('.mb-go').addEventListener('click', go);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    return mb;
  }

  function renderResponse(mb, status, headers, body, extraClass) {
    var result = mb.querySelector('.mb-result');
    var cls = status >= 400 ? 'err' : status >= 300 ? 'warn' : status === 0 ? 'warn' : 'ok';
    var headerLines = Object.keys(headers).map(function (k) { return esc(k) + ': ' + esc(String(headers[k])); }).join('<br>');
    var ct = '';
    Object.keys(headers).forEach(function (k) { if (k.toLowerCase() === 'content-type') ct = String(headers[k]).toLowerCase(); });

    var bodyHtml;
    if (extraClass === 'timeout') {
      cls = 'warn';
      bodyHtml = '<div class="mb-timeout">⏳ Still waiting…<br><small>' + esc(body) + '</small></div>';
    } else if (ct.indexOf('text/html') !== -1) {
      var srcdoc = '<style>body{font-family:system-ui,sans-serif;padding:14px;color:#16202b;font-size:14px;line-height:1.6}ul{padding-left:20px}</style>' + body;
      bodyHtml = '<iframe class="mb-frame" sandbox="" srcdoc="' + srcdoc.replace(/"/g, '&quot;') + '"></iframe>';
    } else if (ct.indexOf('application/json') !== -1) {
      var pretty = body;
      try { pretty = JSON.stringify(JSON.parse(body), null, 2); } catch (e) {}
      bodyHtml = '<pre class="mb-body">' + esc(pretty) + '</pre>';
    } else {
      bodyHtml = '<pre class="mb-body">' + esc(body) + '</pre>';
    }
    result.innerHTML =
      '<div class="mb-status ' + cls + '">HTTP/1.1 ' + status + ' ' + (STATUS_TEXT[status] || '') + '</div>' +
      (headerLines ? '<div class="mb-headers">' + headerLines + '</div>' : '') + bodyHtml;
  }

  function visitServer(runner, rawPath, method, body) {
    var mb = runner.querySelector('.mini-browser');
    var srv = runner._server;
    if (!mb) return;
    if (!srv) { mb.querySelector('.mb-result').innerHTML = '<div class="mb-hint">No server is running — press <b>Run</b> first.</div>'; return; }
    var pathStr = String(rawPath || '/').trim();
    if (pathStr.charAt(0) !== '/') pathStr = '/' + pathStr;
    method = (method || 'GET').toUpperCase();

    var req = {
      method: method, url: pathStr, httpVersion: '1.1',
      headers: { host: 'localhost:' + srv.port, 'user-agent': 'MiniBrowser/1.0 (CST8326)', 'content-type': 'application/json' },
      _rawBody: (method === 'POST' || method === 'PUT') ? (body || '') : '',
      body: undefined
    };

    var finished = false;
    var timeoutId = setTimeout(function () {
      if (finished) return; finished = true;
      renderResponse(mb, 0, {}, 'The handler never finished the response (no res.send/res.end, or a middleware never called next()). A real browser would spin forever.', 'timeout');
    }, 2500);

    var res = {
      statusCode: 200, _headers: {}, _chunks: [], _finished: false,
      setHeader: function (k, v) { this._headers[k] = v; },
      writeHead: function (code, headers) { this.statusCode = code; if (headers) for (var k in headers) this._headers[k] = headers[k]; },
      write: function (chunk) { this._chunks.push(String(chunk)); },
      end: function (chunk) {
        if (finished) return; finished = true; this._finished = true;
        clearTimeout(timeoutId);
        if (chunk !== undefined) this._chunks.push(String(chunk));
        renderResponse(mb, this.statusCode, this._headers, this._chunks.join(''));
      }
    };

    try {
      if (srv.express) {
        augmentExpressReqRes(req, res);
        dispatchExpress(srv.express, req, res);
      } else {
        srv.handler(req, res);
      }
    } catch (err) {
      if (!finished) { finished = true; clearTimeout(timeoutId); renderResponse(mb, 500, { 'Content-Type': 'text/plain' }, (err.name || 'Error') + ': ' + err.message); }
    }
  }

  /* ---------- 4. Runnable demos ---------- */
  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.name + ': ' + v.message;
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }

  document.querySelectorAll('.runner').forEach(function (runner) {
    var pre = runner.querySelector('pre');
    var codeEl = runner.querySelector('pre > code');
    var out = runner.querySelector('.run-out');
    var runBtn = runner.querySelector('.run-btn');
    var clearBtn = runner.querySelector('.clear-btn');
    var head = runner.querySelector('.code-head');
    var isExpress = runner.classList.contains('express-run');
    var runId = 0, liveTimer = null;

    if (isExpress) {
      var badge = document.createElement('span');
      badge.className = 'express-badge';
      badge.textContent = '🚂 express emulator';
      head.appendChild(badge);
    }

    codeEl.setAttribute('contenteditable', 'plaintext-only');
    if (codeEl.contentEditable !== 'plaintext-only') {
      codeEl.setAttribute('contenteditable', 'true');
      codeEl.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });
    }
    codeEl.spellcheck = false;

    var hint = document.createElement('span');
    hint.className = 'edit-hint'; hint.textContent = '✏️ editable';
    head.appendChild(hint);

    var toggle = document.createElement('label');
    toggle.className = 'live-toggle';
    toggle.title = 'Auto-run the code whenever it changes';
    toggle.innerHTML = '<input type="checkbox"><span class="lt-label">auto-run</span><span class="live-dot"></span>';
    head.appendChild(toggle);
    var liveBox = toggle.querySelector('input');
    liveBox.addEventListener('change', function () { runner.classList.toggle('live-mode', liveBox.checked); if (liveBox.checked) run(); });

    function makeConsole(myRun) {
      function push(kind) {
        return function () {
          if (runId !== myRun) return;
          var line = document.createElement('span');
          line.className = 'log-line' + (kind === 'error' ? ' err' : kind === 'note' ? ' note' : '');
          line.textContent = Array.prototype.map.call(arguments, fmt).join(' ');
          out.appendChild(line);
        };
      }
      return { log: push('log'), error: push('error'), warn: push('error'), info: push('log'), _note: push('note') };
    }

    function run() {
      runId++;
      out.textContent = '';
      runner._server = null;
      var myRun = runId;
      var sandboxConsole = makeConsole(myRun);

      var ctx = {
        note: function (msg) { sandboxConsole._note(msg); },
        registerRaw: function (handler, port) { boot({ handler: handler, port: port, express: null }, port); },
        registerExpress: function (appObj, port) { boot({ express: appObj, port: port }, port); }
      };
      function boot(srvObj, port) {
        runner._server = srvObj;
        sandboxConsole._note('🚂 [emulator] server listening on port ' + port + ' — use the REST tester below ↓');
        var mb = mountMiniBrowser(runner, !!srvObj.express);
        mb.querySelector('.mb-origin').textContent = 'localhost:' + port;
        mb.querySelector('.mb-result').innerHTML = '<div class="mb-hint">Your server is running — press <b>Send</b> to make a request.</div>';
      }

      // wire express app.listen → boot
      var expressFactory = makeRequire(ctx);
      // We intercept express by giving the sandbox a require that, for express,
      // returns a factory whose app._register calls ctx.registerExpress.
      var requireFn = function (name) {
        if (name === 'express') {
          var ex = makeExpress();
          var origCall = function () {
            var app = ex();
            app._register = function (port) { ctx.registerExpress(app, port); };
            return app;
          };
          origCall.json = ex.json; origCall.urlencoded = ex.urlencoded;
          origCall.static = ex.static; origCall.Router = ex.Router;
          return origCall;
        }
        return expressFactory(name);
      };

      try {
        if (isExpress) {
          var fn = new Function('console', 'require', 'process', '"use strict";\nreturn (async () => {\n' + pre.textContent + '\n})();');
          var r = fn(sandboxConsole, requireFn, { env: { PORT: '3000' }, platform: plat, argv: ['node', 'app.js'] });
          if (r && typeof r.catch === 'function') r.catch(function (err) { sandboxConsole.error(err); });
        } else {
          var fnSync = new Function('console', '"use strict";\n' + pre.textContent);
          fnSync(sandboxConsole);
        }
      } catch (err) { sandboxConsole.error(err); }
    }

    runBtn.addEventListener('click', function () { runBtn.disabled = true; setTimeout(function () { runBtn.disabled = false; }, 400); run(); });
    codeEl.addEventListener('input', function () { if (!liveBox.checked) return; clearTimeout(liveTimer); liveTimer = setTimeout(run, 700); });
    codeEl.addEventListener('blur', function () { codeEl.innerHTML = highlight(codeEl.textContent); });
    clearBtn.addEventListener('click', function () { runId++; out.textContent = ''; });
  });

  /* ---------- 5. Middleware pipeline animation ---------- */
  var mwPlay = document.getElementById('mw-play');
  if (mwPlay) {
    var track = document.getElementById('mw-track');
    var token = document.getElementById('mw-token');
    var narrate = document.getElementById('mw-narrate');
    var stages = Array.prototype.slice.call(track.querySelectorAll('.mw-stage'));
    var timer = null;
    var SAY = [
      'A request enters the stack. First stop: the <span class="b">Logger</span> middleware — it records the request, then calls <span class="b">next()</span>.',
      '<span class="b">Auth check</span> middleware runs — is this user allowed? It calls <span class="b">next()</span> to continue.',
      '<span class="b">express.json()</span> parses the request body into <span class="b">req.body</span>, then <span class="b">next()</span>.',
      'Finally the <span class="b">route handler</span> runs and calls <span class="b">res.send()</span> — the response travels back. ✅',
      '✅ Four functions, one request. Each middleware called <span class="b">next()</span> to pass control down the line.'
    ];
    function place(i) {
      var stage = stages[i];
      var trackRect = track.getBoundingClientRect();
      var sRect = stage.getBoundingClientRect();
      token.style.left = (sRect.left - trackRect.left + sRect.width / 2 - 12) + 'px';
      token.style.opacity = '1';
    }
    function reset() {
      clearInterval(timer); timer = null; mwPlay.disabled = false;
      token.style.opacity = '0';
      stages.forEach(function (s) { s.classList.remove('active', 'passed'); });
      narrate.innerHTML = 'Press the button — a request enters the middleware stack.';
    }
    mwPlay.addEventListener('click', function () {
      var i = 0; mwPlay.disabled = true;
      stages.forEach(function (s) { s.classList.remove('active', 'passed'); });
      function step() {
        if (i > 0) stages[i - 1].classList.add('passed');
        if (i >= stages.length) {
          stages[stages.length - 1].classList.remove('active');
          stages[stages.length - 1].classList.add('passed');
          narrate.innerHTML = SAY[4]; token.style.opacity = '0';
          clearInterval(timer); timer = null; mwPlay.disabled = false; return;
        }
        stages.forEach(function (s) { s.classList.remove('active'); });
        stages[i].classList.add('active');
        place(i);
        narrate.innerHTML = SAY[i];
        i++;
      }
      step();
      timer = setInterval(step, 1700);
    });
    document.getElementById('mw-reset').addEventListener('click', reset);
  }

  /* ---------- 6. Route parameter matcher ---------- */
  var paramResult = document.getElementById('param-result');
  if (paramResult) {
    var patternIn = document.getElementById('param-pattern');
    var urlIn = document.getElementById('param-url');
    function renderMatch() {
      var pattern = patternIn.value.trim() || '/';
      var url = urlIn.value.trim() || '/';
      var pathOnly = url.split('?')[0];
      var segHtml = pattern.split('/').filter(Boolean).map(function (seg) {
        var dyn = seg.charAt(0) === ':';
        return '<span class="param-seg ' + (dyn ? 'dyn' : 'static') + '">/' + esc(seg) + '</span>';
      }).join('');
      var compiled, params = null;
      try { compiled = compilePath(pattern, false); params = matchPath(compiled, pathOnly); } catch (e) { params = null; }
      if (params) {
        var json = Object.keys(params).length
          ? Object.keys(params).map(function (k) { return '  <span class="k">"' + esc(k) + '"</span>: "' + esc(params[k]) + '"'; }).join(',\n')
          : '  (no named parameters in this route)';
        paramResult.className = 'param-result match';
        paramResult.innerHTML = '<div class="pr-head">✅ ' + esc(pathOnly) + ' matches ' + esc(pattern) + '</div>' +
          '<div>' + segHtml + '</div>' +
          '<div class="param-json">req.params = {' + (Object.keys(params).length ? '\n' + json + '\n' : ' ') + '}</div>';
      } else {
        paramResult.className = 'param-result nomatch';
        paramResult.innerHTML = '<div class="pr-head">❌ ' + esc(pathOnly) + ' does not match ' + esc(pattern) + '</div>' +
          '<div>' + segHtml + '</div>' +
          '<div class="param-json" style="color:var(--err)">no route matched → Express would return 404</div>';
      }
    }
    patternIn.addEventListener('input', renderMatch);
    urlIn.addEventListener('input', renderMatch);
    renderMatch();
  }

  /* ---------- 7. Live Pug playground ---------- */
  var pugEditor = document.getElementById('pug-editor');
  if (pugEditor) {
    var pugFrame = document.getElementById('pug-frame');
    var pugHtmlOut = document.getElementById('pug-html');
    var pugData = document.getElementById('pug-data');
    var pugTimer = null;
    function renderPug() {
      var locals = {};
      try { locals = JSON.parse(pugData.value || '{}'); }
      catch (e) { pugHtmlOut.className = 'pug-html err'; pugHtmlOut.textContent = 'data is not valid JSON: ' + e.message; return; }
      try {
        var html = pugRender(pugEditor.value, locals, viewLookup);
        pugFrame.srcdoc = '<style>body{font-family:system-ui,sans-serif;padding:14px;color:#16202b;font-size:14px;line-height:1.6}ul{padding-left:20px}</style>' + html;
        pugHtmlOut.className = 'pug-html';
        pugHtmlOut.textContent = html.replace(/\n+/g, '\n').trim();
      } catch (e) {
        pugHtmlOut.className = 'pug-html err';
        pugHtmlOut.textContent = e.message;
      }
    }
    function debounced() { clearTimeout(pugTimer); pugTimer = setTimeout(renderPug, 250); }
    pugEditor.addEventListener('input', debounced);
    pugData.addEventListener('input', debounced);
    // support Tab in the editor
    pugEditor.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') { e.preventDefault(); var s = this.selectionStart, en = this.selectionEnd; this.value = this.value.slice(0, s) + '  ' + this.value.slice(en); this.selectionStart = this.selectionEnd = s + 2; debounced(); }
    });
    renderPug();
  }

  /* ---------- 8. Quiz ---------- */
  document.querySelectorAll('.quiz-q').forEach(function (q) {
    var answer = +q.dataset.answer;
    var opts = q.querySelectorAll('.quiz-opt');
    var feedback = q.querySelector('.quiz-feedback');
    opts.forEach(function (opt, i) {
      opt.addEventListener('click', function () {
        opts.forEach(function (o, j) { o.disabled = true; if (j === answer) o.classList.add('correct'); });
        if (i !== answer) opt.classList.add('wrong');
        feedback.classList.add('show');
      });
    });
  });

  /* ---------- 9. Scroll-spy TOC + progress bar ---------- */
  var tocLinks = document.querySelectorAll('.doc-toc a');
  var sections = document.querySelectorAll('.doc-content > section');
  if ('IntersectionObserver' in window && tocLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) tocLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-15% 0px -75% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }
  var bar = document.getElementById('progress-bar');
  if (bar) {
    window.addEventListener('scroll', function () {
      var h = document.documentElement;
      bar.style.width = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100 + '%';
    }, { passive: true });
  }
})();
