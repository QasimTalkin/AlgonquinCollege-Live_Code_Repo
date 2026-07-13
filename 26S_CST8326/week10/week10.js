/**
 * week10.js — interactivity for the Week 10 "Node.js" island.
 * Syntax highlighting, a browser-hosted Node.js emulator (require, http
 * mini-browser, virtual fs, path, os), event-loop simulator with the
 * micro-task queue, npm practice terminal, semver playground, URL anatomy,
 * MVC machine, will-it-run game, quiz, scroll-spy TOC and progress bar.
 */
(function () {
  'use strict';

  /* ---------- 1. Lightweight JS syntax highlighter ---------- */
  var KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|new|async|await|try|catch|finally|throw|typeof|of|in|class|extends|this|true|false|null|undefined)\b/;
  var TOKEN_RE = new RegExp(
    '(\\/\\/[^\\n]*)' +                            // 1 comment
    '|("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)' + // 2 string
    '|' + KEYWORDS.source +                        // 3 keyword
    '|\\b(\\d+(?:\\.\\d+)?)\\b' +                  // 4 number
    '|([A-Za-z_$][\\w$]*)(?=\\s*\\()',             // 5 function call
    'g'
  );

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(code) {
    var out = '';
    var last = 0;
    var m;
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
     2. THE NODE EMULATOR
     A tiny Node.js written in browser JavaScript: require() with
     the core modules the lecture uses, a virtual disk for fs, a
     path implementation, and an http server wired to a mini-browser.
     ============================================================ */

  var CWD = '/home/student/project';

  /* --- virtual disk (shared across all examples on the page) --- */
  var VDISK = {
    'example.txt': 'Hello from the virtual disk! 🗄️ This file lives in your browser\'s memory — no real files were harmed.'
  };

  function normFile(p) {
    return String(p).replace(/^\.\//, '');
  }

  /* --- path module --- */
  function normPath(str, isAbs) {
    var parts = String(str).split('/');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part || part === '.') continue;
      if (part === '..') {
        if (out.length && out[out.length - 1] !== '..') out.pop();
        else if (!isAbs) out.push('..');
      } else out.push(part);
    }
    return (isAbs ? '/' : '') + out.join('/');
  }

  var pathModule = {
    sep: '/',
    join: function () {
      var s = Array.prototype.filter.call(arguments, Boolean).join('/');
      return normPath(s, s.charAt(0) === '/') || '.';
    },
    basename: function (p) {
      var parts = String(p).split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : '';
    },
    dirname: function (p) {
      var i = String(p).lastIndexOf('/');
      if (i === -1) return '.';
      if (i === 0) return '/';
      return String(p).slice(0, i);
    },
    extname: function (p) {
      var b = pathModule.basename(p);
      var i = b.lastIndexOf('.');
      return i > 0 ? b.slice(i) : '';
    },
    resolve: function () {
      var cur = CWD;
      for (var i = 0; i < arguments.length; i++) {
        var part = String(arguments[i]);
        cur = part.charAt(0) === '/' ? part : cur + '/' + part;
      }
      return normPath(cur, true);
    }
  };

  /* --- os module --- */
  var plat = /Mac/i.test(navigator.platform) ? 'darwin'
    : /Win/i.test(navigator.platform) ? 'win32' : 'linux';
  var osModule = {
    platform: function () { return plat; },
    arch: function () { return 'x64'; },
    hostname: function () { return 'algonquin-lab'; },
    cpus: function () {
      var n = navigator.hardwareConcurrency || 4;
      var arr = [];
      for (var i = 0; i < n; i++) arr.push({ model: 'Virtual vCPU (emulated)', speed: 2400 });
      return arr;
    },
    totalmem: function () { return 8 * 1024 * 1024 * 1024; },
    freemem: function () { return 3 * 1024 * 1024 * 1024; }
  };

  /* --- fs module (Promise-based, backed by VDISK) --- */
  function delay(value) {
    return new Promise(function (resolve) { setTimeout(function () { resolve(value); }, 30); });
  }
  function enoent(op, p) {
    return new Error("ENOENT: no such file or directory, " + op + " '" + p + "'");
  }
  var fsPromises = {
    readFile: function (p, enc) {
      p = normFile(p);
      if (!(p in VDISK)) return delay().then(function () { throw enoent('open', p); });
      return delay(VDISK[p]);
    },
    writeFile: function (p, data) {
      VDISK[normFile(p)] = String(data);
      return delay();
    },
    appendFile: function (p, data) {
      p = normFile(p);
      VDISK[p] = (VDISK[p] || '') + String(data);
      return delay();
    },
    readdir: function () {
      return delay(Object.keys(VDISK).sort());
    },
    unlink: function (p) {
      p = normFile(p);
      if (!(p in VDISK)) return delay().then(function () { throw enoent('unlink', p); });
      delete VDISK[p];
      return delay();
    }
  };
  function cbStyle(promiseFn) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      var cb = args.pop();
      if (typeof cb !== 'function') throw new Error('fs: last argument must be a callback (or use require("fs").promises)');
      promiseFn.apply(null, args).then(function (d) { cb(null, d); }, function (e) { cb(e); });
    };
  }
  var fsModule = {
    promises: fsPromises,
    readFile: cbStyle(fsPromises.readFile),
    writeFile: cbStyle(fsPromises.writeFile),
    appendFile: cbStyle(fsPromises.appendFile),
    readdir: cbStyle(fsPromises.readdir),
    unlink: cbStyle(fsPromises.unlink)
  };

  /* --- url module (delegates to the real thing) --- */
  var urlModule = { URL: window.URL, URLSearchParams: window.URLSearchParams };

  /* --- http module + mini-browser --- */
  var STATUS_TEXT = {
    100: 'Continue', 200: 'OK', 201: 'Created', 204: 'No Content',
    301: 'Moved Permanently', 304: 'Not Modified',
    400: 'Bad Request', 403: 'Forbidden', 404: 'Not Found',
    500: 'Internal Server Error'
  };

  function makeHttp(ctx) {
    return {
      createServer: function (handler) {
        if (typeof handler !== 'function') throw new Error('http.createServer expects a callback function(req, res)');
        return {
          listen: function (port, cb) {
            port = port || 3000;
            ctx.registerServer(handler, port);
            ctx.note('🖥 [emulator] server is listening on port ' + port + ' — visit it in the mini-browser below ↓');
            if (typeof cb === 'function') cb();
            return this;
          },
          close: function () { ctx.note('🖥 [emulator] server closed.'); }
        };
      }
    };
  }

  /* --- blocked browser globals (to teach "no DOM in Node") --- */
  function blockedGlobal(name, hint) {
    return new Proxy(function () {}, {
      get: function () { throw new ReferenceError(name + ' is not defined — ' + hint); },
      set: function () { throw new ReferenceError(name + ' is not defined — ' + hint); },
      apply: function () { throw new ReferenceError(name + ' is not defined — ' + hint); }
    });
  }
  var blockedDocument = blockedGlobal('document', 'Node.js has no DOM. The browser owns the page; Node owns the server.');
  var blockedWindow = blockedGlobal('window', 'there are no browser windows on a server. Node has "global" instead.');
  var blockedAlert = blockedGlobal('alert', 'alert() is a browser Web API — servers have nobody to pop a dialog at.');

  var processShim = {
    platform: plat,
    version: 'v22.0.0 (emulated)',
    argv: ['node', 'app.js'],
    env: { PORT: '3000' },
    cwd: function () { return CWD; }
  };

  function makeRequire(ctx) {
    return function require(name) {
      switch (name) {
        case 'http': return makeHttp(ctx);
        case 'url': return urlModule;
        case 'fs': return fsModule;
        case 'path': return pathModule;
        case 'os': return osModule;
        default:
          if (/^\.{0,2}\//.test(name)) {
            throw new Error("Cannot find module '" + name + "' — the emulator has no project files. In real Node, ./ loads a file from the same directory.");
          }
          throw new Error("Cannot find module '" + name + "'. The browser emulator ships core modules only: http, url, fs, path, os. (Real Node + npm can install anything!)");
      }
    };
  }

  /* --- the mini-browser UI --- */
  function mountMiniBrowser(runner) {
    var mb = runner.querySelector('.mini-browser');
    if (mb) return mb;
    mb = document.createElement('div');
    mb.className = 'mini-browser';
    mb.innerHTML =
      '<div class="mb-bar">' +
      '<span class="mb-icon">🌐</span>' +
      '<span class="mb-origin"></span>' +
      '<input class="mb-path" value="/" spellcheck="false" aria-label="Request path">' +
      '<button class="mb-go">Visit ⏎</button>' +
      '</div>' +
      '<div class="mb-result"><div class="mb-hint">Your server is running — press <b>Visit</b> to send it a request.</div></div>';
    runner.appendChild(mb);

    var input = mb.querySelector('.mb-path');
    function go() { visitServer(runner, input.value); }
    mb.querySelector('.mb-go').addEventListener('click', go);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
    });
    return mb;
  }

  function renderResponse(mb, status, headers, body, extraClass) {
    var result = mb.querySelector('.mb-result');
    var cls = status >= 500 ? 'err' : status >= 400 ? 'err' : status >= 300 ? 'warn' : 'ok';
    var headerLines = Object.keys(headers).map(function (k) {
      return esc(k) + ': ' + esc(String(headers[k]));
    }).join('<br>');
    var ct = '';
    Object.keys(headers).forEach(function (k) {
      if (k.toLowerCase() === 'content-type') ct = String(headers[k]).toLowerCase();
    });

    var bodyHtml;
    if (extraClass === 'timeout') {
      cls = 'warn';
      bodyHtml = '<div class="mb-timeout">⏳ Still waiting…<br><small>' + esc(body) + '</small></div>';
    } else if (ct.indexOf('text/html') !== -1) {
      var srcdoc = '<style>body{font-family:system-ui,sans-serif;padding:14px;color:#16202b;font-size:14px;line-height:1.6}</style>' + body;
      bodyHtml = '<iframe class="mb-frame" sandbox="" srcdoc="' + srcdoc.replace(/"/g, '&quot;') + '"></iframe>';
    } else if (ct.indexOf('application/json') !== -1) {
      var pretty = body;
      try { pretty = JSON.stringify(JSON.parse(body), null, 2); } catch (e) { /* leave as-is */ }
      bodyHtml = '<pre class="mb-body">' + esc(pretty) + '</pre>';
    } else {
      bodyHtml = '<pre class="mb-body">' + esc(body) + '</pre>';
    }

    result.innerHTML =
      '<div class="mb-status ' + cls + '">HTTP/1.1 ' + status + ' ' + (STATUS_TEXT[status] || '') + '</div>' +
      (headerLines ? '<div class="mb-headers">' + headerLines + '</div>' : '') +
      bodyHtml;
  }

  function visitServer(runner, rawPath) {
    var mb = runner.querySelector('.mini-browser');
    var srv = runner._server;
    if (!mb) return;
    if (!srv) {
      mb.querySelector('.mb-result').innerHTML = '<div class="mb-hint">No server is running — press <b>Run</b> first.</div>';
      return;
    }
    var pathStr = String(rawPath || '/').trim();
    if (pathStr.charAt(0) !== '/') pathStr = '/' + pathStr;

    var req = {
      method: 'GET',
      url: pathStr,
      httpVersion: '1.1',
      headers: { host: 'localhost:' + srv.port, 'user-agent': 'MiniBrowser/1.0 (CST8326)', accept: 'text/html' }
    };

    var finished = false;
    var timeoutId = setTimeout(function () {
      if (finished) return;
      finished = true;
      renderResponse(mb, 0, {},
        'Your handler never called res.end() — the response was never finished, so a real browser would spin forever. Add res.end() and run again!',
        'timeout');
    }, 2500);

    var res = {
      statusCode: 200,
      _headers: {},
      _chunks: [],
      setHeader: function (k, v) { this._headers[k] = v; },
      writeHead: function (code, headers) {
        this.statusCode = code;
        if (headers) for (var k in headers) this._headers[k] = headers[k];
      },
      write: function (chunk) { this._chunks.push(String(chunk)); },
      end: function (chunk) {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        if (chunk !== undefined) this._chunks.push(String(chunk));
        renderResponse(mb, this.statusCode, this._headers, this._chunks.join(''));
      },
      json: function (obj) {
        this._headers['Content-Type'] = 'application/json';
        this.end(JSON.stringify(obj));
      },
      download: function (p) {
        this._headers['Content-Type'] = 'application/octet-stream';
        this._headers['Content-Disposition'] = 'attachment; filename="' + pathModule.basename(p) + '"';
        this.end('(pretend the file ' + p + ' just downloaded 📦 — res.download comes from Express)');
      }
    };

    function fail(err) {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      renderResponse(mb, 500, { 'Content-Type': 'text/plain' },
        (err && err.name ? err.name : 'Error') + ': ' + (err && err.message ? err.message : String(err)) +
        '\n\nThe server crashed while handling this request — the handler only runs when someone visits!');
    }

    try {
      var out = srv.handler(req, res);
      if (out && typeof out.catch === 'function') out.catch(fail);
    } catch (err) {
      fail(err);
    }
  }

  /* ---------- 3. Runnable demos (browser + node emulator) ---------- */
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
    var isNode = runner.classList.contains('node-run');
    var runId = 0;
    var liveTimer = null;

    if (isNode) {
      var badge = document.createElement('span');
      badge.className = 'node-badge';
      badge.textContent = '🟢 node emulator';
      head.appendChild(badge);
    }

    /* --- live-edit setup: editable code + auto-run toggle --- */
    codeEl.setAttribute('contenteditable', 'plaintext-only');
    if (codeEl.contentEditable !== 'plaintext-only') {
      codeEl.setAttribute('contenteditable', 'true'); // Firefox fallback
      codeEl.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });
    }
    codeEl.spellcheck = false;

    var hint = document.createElement('span');
    hint.className = 'edit-hint';
    hint.textContent = '✏️ editable';
    head.appendChild(hint);

    var toggle = document.createElement('label');
    toggle.className = 'live-toggle';
    toggle.title = 'Auto-run the code whenever it changes';
    toggle.innerHTML = '<input type="checkbox"><span class="lt-label">auto-run</span><span class="live-dot"></span>';
    head.appendChild(toggle);
    var liveBox = toggle.querySelector('input');

    liveBox.addEventListener('change', function () {
      runner.classList.toggle('live-mode', liveBox.checked);
      if (liveBox.checked) run();
    });

    function makeConsole(myRun) {
      function push(kind) {
        return function () {
          if (runId !== myRun) return; // drop logs from stale runs
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
        registerServer: function (handler, port) {
          runner._server = { handler: handler, port: port };
          var mb = mountMiniBrowser(runner);
          mb.querySelector('.mb-origin').textContent = 'http://localhost:' + port;
          mb.querySelector('.mb-result').innerHTML =
            '<div class="mb-hint">Your server is running — press <b>Visit</b> to send it a request.</div>';
        }
      };

      try {
        if (isNode) {
          var fn = new Function('console', 'require', 'process', 'document', 'window', 'alert',
            '"use strict";\nreturn (async () => {\n' + pre.textContent + '\n})();');
          var result = fn(sandboxConsole, makeRequire(ctx), processShim, blockedDocument, blockedWindow, blockedAlert);
          if (result && typeof result.catch === 'function') {
            result.catch(function (err) { sandboxConsole.error(err); });
          }
        } else {
          var fnSync = new Function('console', '"use strict";\n' + pre.textContent);
          fnSync(sandboxConsole);
        }
      } catch (err) {
        sandboxConsole.error(err);
      }
    }

    runBtn.addEventListener('click', function () {
      runBtn.disabled = true;
      setTimeout(function () { runBtn.disabled = false; }, 400);
      run();
    });

    codeEl.addEventListener('input', function () {
      if (!liveBox.checked) return;
      clearTimeout(liveTimer);
      liveTimer = setTimeout(run, 700);
    });

    codeEl.addEventListener('blur', function () {
      codeEl.innerHTML = highlight(codeEl.textContent);
    });

    clearBtn.addEventListener('click', function () {
      runId++; // invalidates pending timers' logs
      out.textContent = '';
    });
  });

  /* ---------- 4. Server vs. View-Source tabs ---------- */
  document.querySelectorAll('.vs-demo').forEach(function (demo) {
    var tabs = demo.querySelectorAll('.vs-tab');
    var panes = demo.querySelectorAll('.vs-pane');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        panes.forEach(function (p) { p.classList.toggle('hidden', p.dataset.pane !== tab.dataset.pane); });
      });
    });
  });

  /* ---------- 5. Will-it-run sorting game ---------- */
  var wirScore = document.getElementById('wir-score');
  if (wirScore) {
    var wirCards = document.querySelectorAll('.wir-card');
    var answered = 0;
    var correct = 0;
    wirCards.forEach(function (card) {
      var answer = card.dataset.a;
      var why = card.dataset.why;
      var btns = card.querySelectorAll('.wir-btns button');
      var fb = card.querySelector('.wir-fb');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (card.classList.contains('done')) return;
          card.classList.add('done');
          answered++;
          var right = btn.dataset.v === answer;
          if (right) correct++;
          btns.forEach(function (b) {
            b.disabled = true;
            if (b.dataset.v === answer) b.classList.add('correct');
          });
          if (!right) btn.classList.add('wrong');
          fb.textContent = (right ? '✅ ' : '❌ ') + why;
          fb.classList.add('show');
          wirScore.textContent = correct + ' / ' + wirCards.length + ' sorted correctly' +
            (answered === wirCards.length && correct === wirCards.length ? ' — perfect sort! 🏆' : '');
        });
      });
    });
  }

  /* ---------- 6. Event loop simulator, level 2 (micro-tasks) ---------- */
  var elPlay = document.getElementById('el-play');
  if (elPlay) {
    var boxes = {
      stack: document.querySelector('#el-stack .el-chips'),
      api: document.querySelector('#el-api .el-chips'),
      micro: document.querySelector('#el-micro .el-chips'),
      queue: document.querySelector('#el-queue .el-chips'),
      consoleBox: document.getElementById('el-console')
    };
    var narrate = document.getElementById('el-narrate');
    var codeLines = document.querySelectorAll('#el-code .code-line');
    var timer = null;

    var STEPS = [
      {
        line: 1, stack: ['console.log("Start")'], api: [], micro: [], queue: [], out: ['Start'],
        say: '1 · "Start" prints — synchronous code runs first, top to bottom.'
      },
      {
        line: 2, stack: ['setTimeout(...)'], api: [], micro: [], queue: [], out: ['Start'],
        say: '2 · setTimeout hands its callback to the internal implementation. Even at 0 ms, it will NOT run now.'
      },
      {
        line: 2, stack: [], api: ['⏱ timer: 0 ms'], micro: [], queue: [], out: ['Start'],
        say: '3 · The 0 ms timer finishes almost instantly…'
      },
      {
        line: 2, stack: [], api: [], micro: [], queue: ['timeout callback'], out: ['Start'],
        say: '4 · …and its callback is placed in the TASK queue, where it must wait its turn.'
      },
      {
        line: 3, stack: ['Promise.resolve().then(...)'], api: [], micro: ['⚡ promise callback'], queue: ['timeout callback'], out: ['Start'],
        say: '5 · The promise is already resolved — its .then callback enters the MICRO-task queue. The VIP lane.'
      },
      {
        line: 4, stack: ['console.log("End")'], api: [], micro: ['⚡ promise callback'], queue: ['timeout callback'], out: ['Start', 'End'],
        say: '6 · "End" prints — the synchronous code is done. The call stack is now empty…'
      },
      {
        line: 3, stack: ['promise callback'], api: [], micro: [], queue: ['timeout callback'], out: ['Start', 'End', 'Promise!'],
        say: '7 · Event loop rule: drain ALL micro-tasks first. "Promise!" prints — it cut the line!'
      },
      {
        line: 2, stack: ['timeout callback'], api: [], micro: [], queue: [], out: ['Start', 'End', 'Promise!', 'Timeout!'],
        say: '8 · Only now does the task queue get a turn. "Timeout!" prints last.'
      },
      {
        line: 0, stack: [], api: [], micro: [], queue: [], out: ['Start', 'End', 'Promise!', 'Timeout!'],
        say: '✅ Final order: Start → End → Promise! → Timeout! — micro-tasks beat tasks, every time.'
      }
    ];

    function renderChips(el, items, cls) {
      el.innerHTML = '';
      items.forEach(function (t) {
        var c = document.createElement('span');
        c.className = 'el-chip' + (cls ? ' ' + cls : '');
        c.textContent = t;
        el.appendChild(c);
      });
    }

    function renderStep(s) {
      codeLines.forEach(function (l) { l.classList.toggle('hl', +l.dataset.l === s.line); });
      renderChips(boxes.stack, s.stack);
      renderChips(boxes.api, s.api, 'timer');
      renderChips(boxes.micro, s.micro);
      renderChips(boxes.queue, s.queue, 'timer');
      boxes.consoleBox.innerHTML = s.out.map(function (o) { return '<div>▸ ' + o + '</div>'; }).join('');
      narrate.textContent = s.say;
      document.getElementById('el-stack').classList.toggle('active-box', s.stack.length > 0);
      document.getElementById('el-api').classList.toggle('active-box', s.api.length > 0);
      document.getElementById('el-micro').classList.toggle('active-box', s.micro.length > 0);
      document.getElementById('el-queue').classList.toggle('active-box', s.queue.length > 0);
    }

    function reset() {
      clearInterval(timer);
      timer = null;
      elPlay.disabled = false;
      renderStep({ line: 0, stack: [], api: [], micro: [], queue: [], out: [], say: 'Press Play to start the simulation.' });
    }

    elPlay.addEventListener('click', function () {
      var i = 0;
      elPlay.disabled = true;
      clearInterval(timer);
      renderStep(STEPS[i++]);
      timer = setInterval(function () {
        if (i >= STEPS.length) { clearInterval(timer); timer = null; elPlay.disabled = false; return; }
        renderStep(STEPS[i++]);
      }, 2100);
    });

    document.getElementById('el-reset').addEventListener('click', reset);
  }

  /* ---------- 7. npm practice terminal ---------- */
  var termBody = document.getElementById('term-body');
  if (termBody) {
    var termInput = document.getElementById('term-input');
    var termForm = document.getElementById('term-form');
    var termSuggest = document.getElementById('term-suggest');
    var projTree = document.getElementById('proj-tree');
    var pkgView = document.getElementById('pkg-view');

    var state = {
      hasPkg: false,
      hasLock: false,
      deps: {},       // recorded in package.json
      devDeps: {},
      installed: {}   // actually present in node_modules
    };
    var PKG_SIZES = { express: 69, nodemon: 30 };

    function print(text, cls) {
      var div = document.createElement('div');
      div.className = 't-line' + (cls ? ' ' + cls : '');
      div.textContent = text;
      termBody.appendChild(div);
      termBody.scrollTop = termBody.scrollHeight;
    }

    function pkgObj() {
      var o = {
        name: 'my-first-server',
        version: '1.0.0',
        main: 'app.js',
        scripts: { start: 'node app.js' }
      };
      if (Object.keys(state.deps).length) o.dependencies = state.deps;
      if (Object.keys(state.devDeps).length) o.devDependencies = state.devDeps;
      return o;
    }

    function renderProject() {
      var items = [{ icon: '📄', name: 'app.js' }];
      if (state.hasPkg) items.push({ icon: '📄', name: 'package.json', cls: 'new' });
      if (state.hasLock) items.push({ icon: '📄', name: 'package-lock.json', cls: 'new' });
      var count = Object.keys(state.installed).reduce(function (n, k) { return n + (PKG_SIZES[k] || 1); }, 0);
      if (count) items.push({ icon: '📁', name: 'node_modules/  (' + count + ' packages)', cls: 'dim' });
      projTree.innerHTML = items.map(function (it) {
        return '<li class="' + (it.cls || '') + '"><span>' + it.icon + '</span> ' + esc(it.name) + '</li>';
      }).join('');

      pkgView.innerHTML = state.hasPkg
        ? '<pre>' + esc(JSON.stringify(pkgObj(), null, 2)) + '</pre>'
        : '<span class="pkg-empty">package.json will appear here after npm init -y</span>';
    }

    function installNamed(pkg, dev) {
      if (!state.hasPkg) {
        print('npm ERR! no package.json here yet.', 'err');
        print('tip: run  npm init -y  first, so the dependency gets recorded (step 1 of the recipe).', 'note');
        return;
      }
      var version = pkg === 'express' ? '^4.21.2' : '^3.1.9';
      if (dev) state.devDeps[pkg] = version; else state.deps[pkg] = version;
      state.installed[pkg] = true;
      state.hasLock = true;
      var n = PKG_SIZES[pkg] || 1;
      print('added ' + n + ' packages, and audited ' + (n + 1) + ' packages in 2s', '');
      print('found 0 vulnerabilities', 'ok');
      print('→ ' + (dev ? 'devDependencies' : 'dependencies') + ' updated · node_modules/ grew · package-lock.json written', 'note');
    }

    var COMMANDS = {
      help: function () {
        print('Commands this practice terminal understands:', 'note');
        print('  npm init -y                      create package.json');
        print('  npm install express              install + record a dependency');
        print('  npm install --save-dev nodemon   install a dev-only tool');
        print('  npm install -g nodemon           install globally (a command everywhere)');
        print('  npm install                      install everything in package.json');
        print('  node app.js                      run the app');
        print('  ls · cat package.json · rm -rf node_modules · clear');
      }
    };

    function exec(raw) {
      var cmd = raw.trim().replace(/\s+/g, ' ');
      if (!cmd) return;
      print('$ ' + cmd, 'cmd');

      if (cmd === 'help') return COMMANDS.help();
      if (cmd === 'clear') { termBody.innerHTML = ''; return; }

      if (cmd === 'ls') {
        var files = ['app.js'];
        if (state.hasPkg) files.push('package.json');
        if (state.hasLock) files.push('package-lock.json');
        if (Object.keys(state.installed).length) files.push('node_modules/');
        print(files.join('   '));
        return;
      }

      if (cmd === 'cat package.json') {
        if (!state.hasPkg) { print('cat: package.json: No such file or directory', 'err'); return; }
        JSON.stringify(pkgObj(), null, 2).split('\n').forEach(function (l) { print(l); });
        return;
      }

      if (/^npm init -y$/.test(cmd) || /^npm init --yes$/.test(cmd)) {
        state.hasPkg = true;
        print('Wrote to ~/my-first-server/package.json:', 'ok');
        JSON.stringify(pkgObj(), null, 2).split('\n').forEach(function (l) { print(l, 'dim'); });
        print('→ -y answered "yes" to every question. Your project now has a manifest!', 'note');
        return;
      }
      if (/^npm init$/.test(cmd)) {
        print('This utility will walk you through creating a package.json file… (10 questions)', '');
        print('tip: use  npm init -y  to accept all defaults instantly.', 'note');
        return;
      }

      if (/^npm (install|i)$/.test(cmd)) {
        if (!state.hasPkg) { print('npm ERR! nothing to install — there is no package.json. Run npm init -y first.', 'err'); return; }
        var all = Object.keys(state.deps).concat(Object.keys(state.devDeps));
        if (!all.length) { print('up to date, audited 1 package in 1s (package.json lists no dependencies yet)', ''); return; }
        all.forEach(function (p) { state.installed[p] = true; });
        state.hasLock = true;
        var total = all.reduce(function (n, k) { return n + (PKG_SIZES[k] || 1); }, 0);
        print('added ' + total + ' packages in 3s', '');
        print('→ read package-lock.json (it trumps package.json!) and rebuilt node_modules/ exactly.', 'note');
        return;
      }

      var mGlobal = cmd.match(/^npm (?:install|i) (?:-g|--global) nodemon$/) || cmd.match(/^npm (?:install|i) nodemon (?:-g|--global)$/);
      if (mGlobal) {
        print('added 30 packages in 2s', '');
        print('→ installed GLOBALLY: nodemon is now a command available in every project, not a line in this package.json.', 'note');
        return;
      }

      var mDev = cmd.match(/^npm (?:install|i) (?:--save-dev|-D) (\w+)$/) || cmd.match(/^npm (?:install|i) (\w+) (?:--save-dev|-D)$/);
      if (mDev) {
        if (mDev[1] === 'nodemon' || mDev[1] === 'express') return installNamed(mDev[1], true);
        print('npm ERR! this practice terminal only stocks express and nodemon 😅', 'err');
        return;
      }

      var mInst = cmd.match(/^npm (?:install|i) (\w+)(?: --save)?$/);
      if (mInst) {
        if (mInst[1] === 'express' || mInst[1] === 'nodemon') return installNamed(mInst[1], false);
        print('npm ERR! this practice terminal only stocks express and nodemon 😅', 'err');
        return;
      }

      if (cmd === 'node app.js') {
        if (state.installed.express) {
          print('Server running at http://localhost:3000 🚀', 'ok');
          print('(this terminal is for npm practice — visit a live server up in section 9!)', 'note');
        } else if (state.deps.express) {
          print("Error: Cannot find module 'express'", 'err');
          print('package.json lists it, but node_modules/ is missing → run  npm install', 'note');
        } else {
          print("Error: Cannot find module 'express'", 'err');
          print('the app needs express → run  npm install express', 'note');
        }
        return;
      }
      if (/^node /.test(cmd)) { print('Error: Cannot find module — only app.js exists in this project.', 'err'); return; }

      if (cmd === 'rm -rf node_modules') {
        state.installed = {};
        print('node_modules/ deleted. Scary? Not at all —  npm install  rebuilds it from package.json.', 'note');
        print("(that's exactly why node_modules is never committed to git)", 'note');
        return;
      }

      print('command not found: ' + cmd + '   — type help', 'err');
    }

    ['help', 'npm init -y', 'npm install express', 'cat package.json', 'node app.js',
      'npm install --save-dev nodemon', 'rm -rf node_modules', 'npm install'].forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = c;
      b.addEventListener('click', function () {
        termInput.value = c;
        exec(c);
        renderProject();
        termInput.value = '';
        termInput.focus();
      });
      termSuggest.appendChild(b);
    });

    termForm.addEventListener('submit', function (e) {
      e.preventDefault();
      exec(termInput.value);
      renderProject();
      termInput.value = '';
    });

    print('Welcome to the npm practice terminal! Type  help  — or click the chips below.', 'note');
    renderProject();
  }

  /* ---------- 8. Semver playground ---------- */
  var svChips = document.getElementById('sv-chips');
  if (svChips) {
    var svNote = document.getElementById('sv-note');
    var svCurrent = document.getElementById('sv-current');
    var CANDIDATES = ['4.21.2', '4.21.3', '4.21.9', '4.22.0', '4.30.1', '5.0.0'];
    var MODES = {
      exact: {
        label: '4.21.2',
        note: 'No prefix = frozen solid. Only exactly 4.21.2 — maximum safety, zero updates, even bug fixes wait for you.',
        ok: function (M, m, p) { return M === 4 && m === 21 && p === 2; }
      },
      tilde: {
        label: '~4.21.2',
        note: '~ (tilde) = patch updates only: ≥ 4.21.2 and < 4.22.0. Bug fixes flow in, new features wait.',
        ok: function (M, m, p) { return M === 4 && m === 21 && p >= 2; }
      },
      caret: {
        label: '^4.21.2',
        note: '^ (caret) = minor + patch updates: ≥ 4.21.2 and < 5.0.0. Anything that should not break the API. This is npm\'s default.',
        ok: function (M, m, p) { return M === 4 && (m > 21 || (m === 21 && p >= 2)); }
      }
    };

    function renderSemver(mode) {
      var rule = MODES[mode];
      svCurrent.textContent = rule.label;
      svNote.textContent = rule.note;
      svChips.innerHTML = CANDIDATES.map(function (v) {
        var parts = v.split('.').map(Number);
        var ok = rule.ok(parts[0], parts[1], parts[2]);
        return '<span class="sv-chip ' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓' : '✗') + ' ' + v + '</span>';
      }).join('');
      document.querySelectorAll('.sv-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
    }

    document.querySelectorAll('.sv-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { renderSemver(btn.dataset.mode); });
    });
    renderSemver('caret');
  }

  /* ---------- 9. URL anatomy ---------- */
  var uaInfo = document.getElementById('ua-info');
  if (uaInfo) {
    var segs = document.querySelectorAll('.ua-seg');
    segs.forEach(function (seg) {
      seg.addEventListener('click', function () {
        segs.forEach(function (s) { s.classList.toggle('active', s === seg); });
        uaInfo.innerHTML =
          '<b>' + esc(seg.dataset.name) + '</b> · <code>' + esc(seg.dataset.prop) + '</code> → <code>' +
          esc(seg.dataset.val) + '</code><br>' + seg.dataset.desc;
      });
    });
  }

  /* ---------- 10. MVC machine ---------- */
  var mvcPlay = document.getElementById('mvc-play');
  if (mvcPlay) {
    var mvcNarrate = document.getElementById('mvc-narrate');
    var mvcBoxes = {
      user: document.getElementById('mvc-user'),
      controller: document.getElementById('mvc-controller'),
      model: document.getElementById('mvc-model'),
      view: document.getElementById('mvc-view')
    };
    var mvcTimer = null;

    var MVC_STEPS = [
      { on: 'user', say: '1 · The user clicks "Show albums" — the browser sends GET /albums to the server.' },
      { on: 'controller', say: '2 · The CONTROLLER receives the request, validates & sanitizes it, and decides what has to happen.' },
      { on: 'model', say: '3 · The controller asks the MODEL: "give me all albums." The model runs the logic and fetches the data.' },
      { on: 'controller', say: '4 · The model hands back an array of albums. The controller picks which view should present it.' },
      { on: 'view', say: '5 · The VIEW renders the data into HTML — presentation only, zero business logic.' },
      { on: 'user', say: '6 · The controller sends the finished page back — the browser displays the albums. ✅' },
      { on: null, say: '✅ One request, three specialists: the Controller decided, the Model knew, the View showed.' }
    ];

    function mvcRender(step) {
      Object.keys(mvcBoxes).forEach(function (k) {
        mvcBoxes[k].classList.toggle('active', step && step.on === k);
      });
      mvcNarrate.textContent = step ? step.say : 'Press the button to send a request through the M-V-C machine.';
    }

    function mvcReset() {
      clearInterval(mvcTimer);
      mvcTimer = null;
      mvcPlay.disabled = false;
      mvcRender(null);
    }

    mvcPlay.addEventListener('click', function () {
      var i = 0;
      mvcPlay.disabled = true;
      clearInterval(mvcTimer);
      mvcRender(MVC_STEPS[i++]);
      mvcTimer = setInterval(function () {
        if (i >= MVC_STEPS.length) { clearInterval(mvcTimer); mvcTimer = null; mvcPlay.disabled = false; return; }
        mvcRender(MVC_STEPS[i++]);
      }, 2200);
    });

    document.getElementById('mvc-reset').addEventListener('click', mvcReset);
  }

  /* ---------- 11. Quiz ---------- */
  document.querySelectorAll('.quiz-q').forEach(function (q) {
    var answer = +q.dataset.answer;
    var opts = q.querySelectorAll('.quiz-opt');
    var feedback = q.querySelector('.quiz-feedback');
    opts.forEach(function (opt, i) {
      opt.addEventListener('click', function () {
        opts.forEach(function (o, j) {
          o.disabled = true;
          if (j === answer) o.classList.add('correct');
        });
        if (i !== answer) opt.classList.add('wrong');
        feedback.classList.add('show');
      });
    });
  });

  /* ---------- 12. Scroll-spy TOC + progress bar ---------- */
  var tocLinks = document.querySelectorAll('.doc-toc a');
  var sections = document.querySelectorAll('.doc-content > section');
  if ('IntersectionObserver' in window && tocLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          tocLinks.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
          });
        }
      });
    }, { rootMargin: '-15% 0px -75% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  var bar = document.getElementById('progress-bar');
  if (bar) {
    window.addEventListener('scroll', function () {
      var h = document.documentElement;
      var pct = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = pct + '%';
    }, { passive: true });
  }
})();
