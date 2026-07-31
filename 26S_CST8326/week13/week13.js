/**
 * week13.js — interactivity for the Week 13 "Journey's End" island:
 * Sessions, Authentication (Basic / Session / Token), cookies vs sessions,
 * password hashing, JSON Web Tokens (JWT) and deployment.
 *
 * Ships a tiny browser-hosted emulator so real-looking code runs on a static
 * page: require('jsonwebtoken') (sign/verify/decode), require('bcryptjs')
 * (hashSync/compareSync), and no-op express / express-session so setup
 * snippets don't crash. Plus widgets: a stateless-server demo, an animated
 * session handshake, a live session lab (cookie + server store), a password-
 * hash visualizer, a JWT builder/verifier, a deploy checklist, a Render
 * deploy simulator, a quiz, scroll-spy TOC and progress bar.
 *
 * ⚠ The signer/hasher here are SIMPLIFIED teaching stand-ins (not real
 * HMAC-SHA256 / Blowfish). Structure and behaviour match the real modules so
 * students learn the shapes — never use these toy functions for real security.
 */
(function () {
  'use strict';

  /* ---------- syntax highlighter ---------- */
  var KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|new|async|await|try|catch|finally|throw|typeof|of|in|class|extends|this|true|false|null|undefined|require)\b/;
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

  /* ============================================================
     TINY CRYPTO STAND-INS  (teaching only — not real crypto)
     ============================================================ */

  function b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  function b64urlDecode(str) {
    str = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return decodeURIComponent(escape(atob(str)));
  }
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var B64URL = B64 + '-_';
  var HEX = '0123456789abcdef';

  // 32-bit safe deterministic generator (xmur3 seed + mulberry32 stream).
  // Uses Math.imul so multiplication never overflows JS's 53-bit safe range.
  function seededStream(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function digestChars(input, len, alphabet) {
    var next = seededStream(input), out = '';
    for (var i = 0; i < len; i++) out += alphabet.charAt(next() % alphabet.length);
    return out;
  }
  // deterministic "signature" over data+secret → base64url, fixed length
  function signature(data, secret) { return digestChars(data + '||' + secret, 43, B64URL); }
  // deterministic hex digest (SHA-style teaching hash) — same in → same out
  function hexDigest(input, len) { return digestChars(input, len || 64, HEX); }

  /* --- jsonwebtoken --- */
  function parseExpiry(v) {
    if (typeof v === 'number') return v;
    var m = String(v).match(/^(\d+)\s*([smhd])?$/);
    if (!m) return 0;
    var n = +m[1], u = m[2] || 's';
    return n * ({ s: 1, m: 60, h: 3600, d: 86400 }[u]);
  }
  var jwt = {
    sign: function (payload, secret, opts) {
      opts = opts || {};
      var header = { alg: opts.algorithm || 'HS256', typ: 'JWT' };
      var body = {}; for (var k in payload) body[k] = payload[k];
      body.iat = Math.floor(Date.now() / 1000);
      if (opts.expiresIn) body.exp = body.iat + parseExpiry(opts.expiresIn);
      var h = b64urlEncode(JSON.stringify(header));
      var p = b64urlEncode(JSON.stringify(body));
      return h + '.' + p + '.' + signature(h + '.' + p, secret);
    },
    verify: function (token, secret) {
      var parts = String(token).split('.');
      if (parts.length !== 3) throw new Error('jwt malformed');
      if (signature(parts[0] + '.' + parts[1], secret) !== parts[2]) { var e = new Error('invalid signature'); e.name = 'JsonWebTokenError'; throw e; }
      var body = JSON.parse(b64urlDecode(parts[1]));
      if (body.exp && Math.floor(Date.now() / 1000) > body.exp) { var e2 = new Error('jwt expired'); e2.name = 'TokenExpiredError'; throw e2; }
      return body;
    },
    decode: function (token) { try { return JSON.parse(b64urlDecode(String(token).split('.')[1])); } catch (e) { return null; } }
  };

  /* --- bcryptjs (salted, one-way; hash differs each call, compare still works) --- */
  var bcrypt = {
    genSaltSync: function (rounds) { return '$2a$' + String(rounds || 10) + '$' + hexDigest(Math.random() + '' + Date.now(), 22); },
    hashSync: function (pw, saltOrRounds) {
      var salt = typeof saltOrRounds === 'string' ? saltOrRounds : this.genSaltSync(saltOrRounds || 10);
      return salt.slice(0, 29) + hexDigest(salt.slice(0, 29) + '::' + pw, 31);
    },
    compareSync: function (pw, hash) {
      var salt = String(hash).slice(0, 29);
      return salt + hexDigest(salt + '::' + pw, 31) === String(hash);
    },
    hash: function (pw, rounds) { var self = this; return new Promise(function (r) { setTimeout(function () { r(self.hashSync(pw, rounds)); }, 20); }); },
    compare: function (pw, hash) { var self = this; return new Promise(function (r) { setTimeout(function () { r(self.compareSync(pw, hash)); }, 20); }); }
  };

  /* --- no-op express / express-session so setup snippets run without crashing --- */
  function makeExpress() {
    var express = function () {
      var app = { use: function () { return app; }, get: function () { return app; }, post: function () { return app; }, set: function () { return app; }, listen: function (p, cb) { if (typeof cb === 'function') cb(); return {}; } };
      return app;
    };
    express.static = function () { return function () {}; };
    express.urlencoded = function () { return function () {}; };
    express.json = function () { return function () {}; };
    express.Router = function () { var r = function () {}; r.get = function () { return r; }; r.post = function () { return r; }; r.use = function () { return r; }; return r; };
    return express;
  }
  function makeSession() { return function session() { return function (req, res, next) { if (typeof next === 'function') next(); }; }; }

  function makeRequire() {
    return function require(name) {
      if (name === 'jsonwebtoken') return jwt;
      if (name === 'bcryptjs' || name === 'bcrypt') return bcrypt;
      if (name === 'express') return makeExpress();
      if (name === 'express-session') return makeSession();
      throw new Error("Cannot find module '" + name + "'. This emulator ships jsonwebtoken, bcryptjs, express and express-session.");
    };
  }

  /* ---------- runnable demos ---------- */
  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return (v.name || 'Error') + ': ' + v.message;
    try { return JSON.stringify(v, null, 2); } catch (e) { return String(v); }
  }
  document.querySelectorAll('.runner').forEach(function (runner) {
    var pre = runner.querySelector('pre');
    var codeEl = runner.querySelector('pre > code');
    var out = runner.querySelector('.run-out');
    var runBtn = runner.querySelector('.run-btn');
    var clearBtn = runner.querySelector('.clear-btn');
    var head = runner.querySelector('.code-head');
    var runId = 0, liveTimer = null;

    var badge = document.createElement('span');
    badge.className = 'auth-badge'; badge.textContent = '🔐 auth emulator';
    head.appendChild(badge);

    codeEl.setAttribute('contenteditable', 'plaintext-only');
    if (codeEl.contentEditable !== 'plaintext-only') {
      codeEl.setAttribute('contenteditable', 'true');
      codeEl.addEventListener('paste', function (e) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
    }
    codeEl.spellcheck = false;

    var hint = document.createElement('span'); hint.className = 'edit-hint'; hint.textContent = '✏️ editable'; head.appendChild(hint);
    var toggle = document.createElement('label'); toggle.className = 'live-toggle'; toggle.title = 'Auto-run on change';
    toggle.innerHTML = '<input type="checkbox"><span class="lt-label">auto-run</span><span class="live-dot"></span>'; head.appendChild(toggle);
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
      return { log: push('log'), error: push('error'), warn: push('error'), info: push('log') };
    }
    function run() {
      runId++; out.textContent = ''; var myRun = runId;
      var sandboxConsole = makeConsole(myRun);
      try {
        var fn = new Function('console', 'require', '"use strict";\nreturn (async () => {\n' + pre.textContent + '\n})();');
        var r = fn(sandboxConsole, makeRequire());
        if (r && typeof r.catch === 'function') r.catch(function (err) { sandboxConsole.error(err); });
      } catch (err) { sandboxConsole.error(err); }
    }
    runBtn.addEventListener('click', function () { runBtn.disabled = true; setTimeout(function () { runBtn.disabled = false; }, 400); run(); });
    codeEl.addEventListener('input', function () { if (!liveBox.checked) return; clearTimeout(liveTimer); liveTimer = setTimeout(run, 700); });
    codeEl.addEventListener('blur', function () { codeEl.innerHTML = highlight(codeEl.textContent); });
    clearBtn.addEventListener('click', function () { runId++; out.textContent = ''; });
  });

  /* ============================================================
     WIDGET 1 — stateless "goldfish" server demo
     ============================================================ */
  (function () {
    var lab = document.getElementById('state-lab'); if (!lab) return;
    var modeBox = document.getElementById('state-mode');
    var mem = document.getElementById('state-mem');
    var log = document.getElementById('state-log');
    var visits = 0;
    function render() {
      if (modeBox.checked) {
        mem.innerHTML = '🍪 session <b>abc123</b> → { user: "Light", visits: ' + visits + ' }';
        mem.className = 'ss-mem on';
      } else {
        mem.innerHTML = '🕳️ nothing. Every request starts from scratch.';
        mem.className = 'ss-mem off';
      }
    }
    function line(html, cls) { var d = document.createElement('div'); d.className = 't-line' + (cls ? ' ' + cls : ''); d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; }
    document.getElementById('state-visit').addEventListener('click', function () {
      if (modeBox.checked) {
        visits++;
        line('→ GET /profile &nbsp; <span class="dim">(cookie: session=abc123)</span>', 'cmd');
        line('👋 Welcome back, <b>Light</b>! This is visit #' + visits + '. I looked you up in my session store.', 'ok');
      } else {
        line('→ GET /profile &nbsp; <span class="dim">(no memory of you)</span>', 'cmd');
        line('🤷 Who are you? I have no record of any past request. <b>Guest.</b>', 'err');
      }
      render();
    });
    document.getElementById('state-reset').addEventListener('click', function () { visits = 0; log.innerHTML = ''; render(); });
    modeBox.addEventListener('change', function () { visits = 0; log.innerHTML = ''; render(); line(modeBox.checked ? '🔁 Sessions ON — the server now keeps a store keyed by your cookie.' : '🔁 Sessions OFF — back to plain, forgetful HTTP.', 'note'); });
    render();
  })();

  /* ============================================================
     WIDGET 2 — animated session handshake
     ============================================================ */
  (function () {
    var box = document.getElementById('handshake'); if (!box) return;
    var steps = Array.prototype.slice.call(box.querySelectorAll('.hs-step'));
    var narrate = document.getElementById('hs-narrate');
    var playBtn = document.getElementById('hs-play');
    var timers = [];
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function play() {
      clearTimers();
      steps.forEach(function (s) { s.classList.remove('active', 'done'); });
      narrate.textContent = '🍪 Watch the session id travel between the browser and the server…';
      steps.forEach(function (s, i) {
        timers.push(setTimeout(function () {
          steps.forEach(function (x, j) { x.classList.toggle('active', j === i); if (j < i) x.classList.add('done'); });
          narrate.innerHTML = s.getAttribute('data-say');
          if (i === steps.length - 1) timers.push(setTimeout(function () { s.classList.add('done'); s.classList.remove('active'); narrate.innerHTML = '✅ From now on, the browser sends that cookie automatically with <b>every</b> request — so the server always knows it\'s you.'; }, 1100));
        }, i * 1250));
      });
    }
    playBtn.addEventListener('click', play);
  })();

  /* ============================================================
     WIDGET 3 — live session lab (cookie + server store)
     ============================================================ */
  (function () {
    var lab = document.getElementById('sess-lab'); if (!lab) return;
    var resp = document.getElementById('sess-resp');
    var cookieEl = document.getElementById('sess-cookie');
    var storeEl = document.getElementById('sess-store');
    var store = {};          // server-side: { sid: { username } }
    var cookie = null;       // browser-side: connect.sid value
    function sid() { var s = ''; for (var i = 0; i < 12; i++) s += HEX.charAt(Math.floor(Math.random() * 16)); return s; }
    function draw() {
      cookieEl.textContent = cookie ? 'connect.sid = ' + cookie : '(no cookie yet)';
      cookieEl.className = cookie ? 'sess-pre has' : 'sess-pre';
      var keys = Object.keys(store);
      storeEl.textContent = keys.length ? keys.map(function (k) { return '"' + k + '": ' + JSON.stringify(store[k]); }).join(',\n') : '{ }  (empty)';
      storeEl.className = keys.length ? 'sess-pre has' : 'sess-pre';
    }
    function say(html, cls) { resp.innerHTML = html; resp.className = 'sess-resp ' + (cls || ''); }
    function go(route) {
      if (route === '/login') {
        cookie = sid(); store[cookie] = { username: 'Light' };
        say('<span class="mb-method-tag">GET</span> /login → <b>200</b><br>req.session.username = "Light" · <span class="dim">Set-Cookie: connect.sid=' + cookie + '</span><br>🔓 <b>Logged in as Light.</b>', 'ok');
      } else if (route === '/profile') {
        if (cookie && store[cookie]) say('<span class="mb-method-tag">GET</span> /profile → <b>200</b><br>The browser sent cookie <span class="dim">' + cookie + '</span>; the server found the session.<br>👤 <b>Welcome, ' + store[cookie].username + '!</b>', 'ok');
        else say('<span class="mb-method-tag">GET</span> /profile → <b>200</b><br>No valid session cookie was sent.<br>🚫 <b>Welcome, Guest</b> — please log in first.', 'warn');
      } else if (route === '/logout') {
        if (cookie) { delete store[cookie]; }
        cookie = null;
        say('<span class="mb-method-tag">GET</span> /logout → <b>200</b><br>req.session.destroy() cleared the server store &amp; the cookie.<br>👋 <b>Logged out.</b>', '');
      }
      draw();
    }
    lab.querySelectorAll('.sess-nav button').forEach(function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-route')); }); });
    say('👉 Click <b>GET /profile</b> first (you\'re a guest), then <b>/login</b>, then <b>/profile</b> again. Watch the cookie and server store.', 'hint');
    draw();
  })();

  /* ============================================================
     WIDGET 4 — password hash visualizer
     ============================================================ */
  (function () {
    var lab = document.getElementById('hash-lab'); if (!lab) return;
    var input = document.getElementById('hash-in');
    var outEl = document.getElementById('hash-out');
    var notes = document.getElementById('hash-notes');
    var prev = null;
    function update() {
      var pw = input.value;
      var h = pw ? hexDigest(pw, 64) : '';
      outEl.textContent = h || '(type a password)';
      var changed = prev !== null && prev !== h;
      notes.innerHTML =
        '<span class="hchip">🔒 one-way — you can\'t turn the hash back into the password</span>' +
        '<span class="hchip">🎯 same input → <b>always</b> the same hash</span>' +
        (changed ? '<span class="hchip warn">💥 one character changed → a completely different hash (avalanche)</span>' : '');
      prev = h;
    }
    input.addEventListener('input', update);
    update();
  })();

  /* ============================================================
     WIDGET 5 — JWT builder / verifier
     ============================================================ */
  (function () {
    var lab = document.getElementById('jwt-lab'); if (!lab) return;
    var payloadEl = document.getElementById('jwt-payload');
    var secretEl = document.getElementById('jwt-secret');
    var tokenEl = document.getElementById('jwt-token');
    var headOut = document.getElementById('jwt-head');
    var bodyOut = document.getElementById('jwt-body');
    var signOut = document.getElementById('jwt-sign-out');
    var result = document.getElementById('jwt-result');
    var parts = ['', '', ''];

    function sign() {
      var payload;
      try { payload = JSON.parse(payloadEl.value); }
      catch (e) { result.textContent = '✗ payload must be valid JSON'; result.className = 'jwt-result bad'; return; }
      var token = jwt.sign(payload, secretEl.value || 'secret');
      parts = token.split('.');
      draw();
      result.innerHTML = '🔏 signed — this string is what the server sends back after login.';
      result.className = 'jwt-result';
    }
    function draw() {
      tokenEl.innerHTML =
        '<span class="jp head">' + esc(parts[0]) + '</span><span class="jdot">.</span>' +
        '<span class="jp payl">' + esc(parts[1]) + '</span><span class="jdot">.</span>' +
        '<span class="jp sign">' + esc(parts[2]) + '</span>';
      try { headOut.textContent = parts[0] ? JSON.stringify(JSON.parse(b64urlDecode(parts[0])), null, 2) : ''; } catch (e) { headOut.textContent = '—'; }
      try { bodyOut.textContent = parts[1] ? JSON.stringify(JSON.parse(b64urlDecode(parts[1])), null, 2) : ''; } catch (e2) { bodyOut.textContent = '⚠ not valid base64/JSON (tampered)'; }
      signOut.textContent = parts[2] ? 'HMACSHA256( header.payload, secret )' : '';
    }
    function verify() {
      try {
        var body = jwt.verify(parts.join('.'), secretEl.value || 'secret');
        result.innerHTML = '✅ <b>valid</b> — signature matches the secret. Trust the payload: ' + esc(JSON.stringify(body));
        result.className = 'jwt-result ok';
      } catch (e) {
        result.innerHTML = '⛔ <b>' + esc(e.message) + '</b> — the signature no longer matches. Request rejected!';
        result.className = 'jwt-result bad';
      }
    }
    function tamper() {
      if (!parts[1]) { sign(); }
      var p = parts[1].split('');
      var i = Math.max(0, p.length - 3);
      var cur = p[i]; var repl = B64URL.charAt((B64URL.indexOf(cur) + 7) % 64);
      p[i] = repl === cur ? 'X' : repl;
      parts[1] = p.join('');
      draw();
      result.innerHTML = '😈 payload byte flipped — but the signature is unchanged. Hit <b>Verify</b> and watch it fail.';
      result.className = 'jwt-result warn';
    }
    document.getElementById('jwt-do-sign').addEventListener('click', sign);
    document.getElementById('jwt-do-verify').addEventListener('click', verify);
    document.getElementById('jwt-do-tamper').addEventListener('click', tamper);
    sign();
  })();

  /* ============================================================
     WIDGET 6 — deploy pre-flight checklist
     ============================================================ */
  (function () {
    var list = document.getElementById('deploy-check'); if (!list) return;
    var status = document.getElementById('dc-status');
    var items = Array.prototype.slice.call(list.querySelectorAll('li'));
    function update() {
      var done = items.filter(function (li) { return li.classList.contains('checked'); }).length;
      if (done === items.length) { status.innerHTML = '🚀 <b>Pre-flight complete</b> — your app is ready to deploy to Render!'; status.className = 'dc-status ready'; }
      else { status.innerHTML = '📋 ' + done + ' / ' + items.length + ' ready — tick every box before you deploy.'; status.className = 'dc-status'; }
    }
    items.forEach(function (li) {
      li.addEventListener('click', function () {
        li.classList.toggle('checked');
        update();
      });
    });
    update();
  })();

  /* ============================================================
     WIDGET 7 — Render deploy simulator
     ============================================================ */
  (function () {
    var lab = document.getElementById('render-lab'); if (!lab) return;
    var body = document.getElementById('render-body');
    var btn = document.getElementById('render-deploy');
    var running = false, timers = [];
    var script = [
      { t: 'cmd', s: '==> Cloning from https://github.com/QasimTalkin/anime-collection' },
      { t: 'dim', s: '==> Checking out commit a1b2c3d in branch main' },
      { t: 'cmd', s: '==> Running build command: npm install' },
      { t: 'dim', s: 'added 57 packages in 4s' },
      { t: 'cmd', s: '==> Starting service: node app.js' },
      { t: 'ok', s: '✔ Connected to MongoDB Atlas' },
      { t: 'dim', s: 'Server listening on port 10000  (process.env.PORT)' },
      { t: 'ok', s: '==> Your service is live 🎉' },
      { t: 'link', s: 'https://anime-collection.onrender.com' }
    ];
    function line(item) {
      var d = document.createElement('div');
      d.className = 't-line ' + (item.t === 'link' ? 'ok' : item.t);
      d.innerHTML = item.t === 'link' ? '🌐 <b>' + item.s + '</b>' : esc(item.s);
      body.appendChild(d); body.scrollTop = body.scrollHeight;
    }
    btn.addEventListener('click', function () {
      if (running) return;
      running = true; btn.disabled = true; body.innerHTML = '';
      timers.forEach(clearTimeout); timers = [];
      script.forEach(function (item, i) { timers.push(setTimeout(function () { line(item); if (i === script.length - 1) { running = false; btn.disabled = false; } }, 550 * (i + 1))); });
    });
  })();

  /* ---------- quiz ---------- */
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

  /* ---------- scroll-spy TOC + progress bar ---------- */
  var tocLinks = document.querySelectorAll('.doc-toc a');
  var sections = document.querySelectorAll('.doc-content > section');
  if ('IntersectionObserver' in window && tocLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) tocLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); }); });
    }, { rootMargin: '-15% 0px -75% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }
  var bar = document.getElementById('progress-bar');
  if (bar) window.addEventListener('scroll', function () { var h = document.documentElement; bar.style.width = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100 + '%'; }, { passive: true });
})();
