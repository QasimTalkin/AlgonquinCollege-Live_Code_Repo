/**
 * week12.js — interactivity for the Week 12 "Databases with Express" island.
 * A browser-hosted MongoDB + Mongoose emulator (Schema, model, connect,
 * find/findOne/findById/create/save, updateOne/updateMany, deleteOne/
 * deleteMany, with $gte/$gt/$lte/$lt/$ne/$in/$regex + $set/$inc/$unset),
 * runnable examples, a relational-vs-document toggle, a MongoDB hierarchy
 * widget, a live query playground, quiz, scroll-spy TOC and progress bar.
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
     THE MONGOOSE / MONGODB EMULATOR
     A tiny in-memory document database + a Mongoose-like ODM.
     ============================================================ */

  var DB = {};   // { collectionName: [ documents ] }  — the "database"

  function hex(n) { var s = ''; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16); return s; }
  function objectId() { return hex(24); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function pluralize(name) {
    name = name.toLowerCase();
    if (/[^aeiou]y$/.test(name)) return name.slice(0, -1) + 'ies';
    if (/(s|x|z|ch|sh)$/.test(name)) return name + 'es';
    return name + 's';
  }

  /* --- match a document against a filter (supports operators) --- */
  function opMatch(val, cond) {
    if (cond && typeof cond === 'object' && !(cond instanceof RegExp)) {
      var keys = Object.keys(cond);
      var ops = keys.filter(function (k) { return k.charAt(0) === '$'; });
      if (ops.length) {
        return ops.every(function (op) {
          var c = cond[op];
          switch (op) {
            case '$gt': return val > c;
            case '$gte': return val >= c;
            case '$lt': return val < c;
            case '$lte': return val <= c;
            case '$ne': return val !== c;
            case '$in': return Array.isArray(c) && c.indexOf(val) !== -1;
            case '$nin': return Array.isArray(c) && c.indexOf(val) === -1;
            case '$regex': return new RegExp(c, cond.$options || '').test(String(val));
            case '$exists': return (val !== undefined) === !!c;
            case '$options': return true;
            default: return false;
          }
        });
      }
    }
    if (cond instanceof RegExp) return cond.test(String(val));
    return val === cond;
  }
  function matches(doc, filter) {
    return Object.keys(filter || {}).every(function (key) {
      if (key === '_id') return String(doc._id) === String(filter._id.$oid || filter._id);
      return opMatch(doc[key], filter[key]);
    });
  }

  /* --- apply an update document --- */
  function applyUpdate(doc, update) {
    var hasOp = Object.keys(update).some(function (k) { return k.charAt(0) === '$'; });
    if (!hasOp) { Object.keys(update).forEach(function (k) { doc[k] = update[k]; }); return; }
    Object.keys(update).forEach(function (op) {
      var fields = update[op];
      Object.keys(fields).forEach(function (f) {
        if (op === '$set') doc[f] = fields[f];
        else if (op === '$inc') doc[f] = (doc[f] || 0) + fields[f];
        else if (op === '$unset') delete doc[f];
        else if (op === '$push') { doc[f] = doc[f] || []; doc[f].push(fields[f]); }
      });
    });
  }

  /* --- Schema --- */
  function Schema(def, opts) { this.def = def || {}; this.opts = opts || {}; }
  function coerce(type, v) {
    if (type === Number || type === 'Number') return Number(v);
    if (type === String || type === 'String') return String(v);
    if (type === Boolean || type === 'Boolean') return !!v;
    return v;
  }
  function validateAndBuild(schema, obj) {
    var out = {};
    var def = schema.def;
    Object.keys(def).forEach(function (field) {
      var spec = def[field];
      var type = (spec && spec.type) ? spec.type : spec;
      var required = spec && spec.required;
      var hasDefault = spec && spec.default !== undefined;
      var v = obj[field];
      if (v === undefined || v === '') {
        if (hasDefault) { out[field] = (typeof spec.default === 'function') ? spec.default() : spec.default; return; }
        if (required) throw new Error('ValidationError: `' + field + '` is required.');
        return;
      }
      out[field] = coerce(type, v);
    });
    // keep any extra fields the schema didn't mention (Mongoose strips these, but keep for teaching clarity if strict:false)
    return out;
  }

  /* --- Model factory --- */
  function makeModel(name, schema) {
    var coll = pluralize(name);
    if (!DB[coll]) DB[coll] = [];

    function Model(obj) { // `new Model({...})`
      var built = validateAndBuild(schema, obj || {});
      for (var k in built) this[k] = built[k];
      this._pending = built;
    }
    Model.modelName = name;
    Model.collection = { name: coll };

    Model.prototype.save = function () {
      var self = this;
      return new Promise(function (resolve) {
        var doc = clone(self._pending); doc._id = objectId();
        DB[coll].push(doc); for (var k in doc) self[k] = doc[k]; self._id = doc._id;
        setTimeout(function () { resolve(clone(doc)); }, 20);
      });
    };

    Model.create = function (data) {
      return new Promise(function (resolve) {
        var arr = Array.isArray(data) ? data : [data];
        var made = arr.map(function (o) { var d = validateAndBuild(schema, o); d._id = objectId(); DB[coll].push(d); return clone(d); });
        setTimeout(function () { resolve(Array.isArray(data) ? made : made[0]); }, 20);
      });
    };
    Model.insertMany = function (arr) { return Model.create(arr); };

    Model.find = function (filter) {
      return new Promise(function (resolve) {
        var res = DB[coll].filter(function (d) { return matches(d, filter || {}); }).map(clone);
        setTimeout(function () { resolve(res); }, 20);
      });
    };
    Model.findOne = function (filter) {
      return new Promise(function (resolve) {
        var d = DB[coll].find(function (x) { return matches(x, filter || {}); });
        setTimeout(function () { resolve(d ? clone(d) : null); }, 20);
      });
    };
    Model.findById = function (id) {
      return new Promise(function (resolve) {
        var d = DB[coll].find(function (x) { return String(x._id) === String(id); });
        setTimeout(function () { resolve(d ? clone(d) : null); }, 20);
      });
    };
    Model.countDocuments = function (filter) {
      return new Promise(function (resolve) { resolve(DB[coll].filter(function (d) { return matches(d, filter || {}); }).length); });
    };
    Model.updateOne = function (filter, update) {
      return new Promise(function (resolve) {
        var d = DB[coll].find(function (x) { return matches(x, filter || {}); });
        var matched = d ? 1 : 0, modified = 0;
        if (d) { applyUpdate(d, update); modified = 1; }
        setTimeout(function () { resolve({ acknowledged: true, matchedCount: matched, modifiedCount: modified }); }, 20);
      });
    };
    Model.updateMany = function (filter, update) {
      return new Promise(function (resolve) {
        var hits = DB[coll].filter(function (x) { return matches(x, filter || {}); });
        hits.forEach(function (d) { applyUpdate(d, update); });
        setTimeout(function () { resolve({ acknowledged: true, matchedCount: hits.length, modifiedCount: hits.length }); }, 20);
      });
    };
    Model.deleteOne = function (filter) {
      return new Promise(function (resolve) {
        var i = DB[coll].findIndex(function (x) { return matches(x, filter || {}); });
        var n = 0; if (i !== -1) { DB[coll].splice(i, 1); n = 1; }
        setTimeout(function () { resolve({ acknowledged: true, deletedCount: n }); }, 20);
      });
    };
    Model.deleteMany = function (filter) {
      return new Promise(function (resolve) {
        var before = DB[coll].length;
        DB[coll] = DB[coll].filter(function (x) { return !matches(x, filter || {}); });
        setTimeout(function () { resolve({ acknowledged: true, deletedCount: before - DB[coll].length }); }, 20);
      });
    };
    return Model;
  }

  /* --- the mongoose object --- */
  var models = {};
  var mongoose = {
    Schema: Schema,
    connect: function (uri) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (!uri || typeof uri !== 'string' || uri.indexOf('mongodb') === -1) {
            reject(new Error('MongooseError: invalid connection string (expected a mongodb:// or mongodb+srv:// URI)'));
          } else { resolve({ connection: { host: 'emulator' } }); }
        }, 150);
      });
    },
    model: function (name, schema) {
      if (schema) { models[name] = makeModel(name, schema); }
      return models[name];
    },
    Types: { ObjectId: objectId }
  };
  mongoose.Schema.Types = { String: 'String', Number: 'Number', Boolean: 'Boolean', Date: 'Date', ObjectId: 'ObjectId' };

  function makeRequire() {
    return function require(name) {
      if (name === 'mongoose') return mongoose;
      if (name === 'express') return function () { return { use: function () {}, get: function () {}, listen: function () {} }; };
      throw new Error("Cannot find module '" + name + "'. This emulator ships mongoose.");
    };
  }

  /* ---- seed the shared demo collection (used by examples + playground) ---- */
  function seedAnime() {
    DB.animes = [
      { _id: objectId(), title: "Death Note", studio: "Madhouse", rating: 9, year: 2006, episodes: 37 },
      { _id: objectId(), title: "Fullmetal Alchemist: Brotherhood", studio: "Bones", rating: 10, year: 2009, episodes: 64 },
      { _id: objectId(), title: "Demon Slayer", studio: "Ufotable", rating: 9, year: 2019, episodes: 26 },
      { _id: objectId(), title: "Attack on Titan", studio: "Wit Studio", rating: 9, year: 2013, episodes: 25 },
      { _id: objectId(), title: "One Punch Man", studio: "Madhouse", rating: 8, year: 2015, episodes: 12 }
    ];
  }
  seedAnime();

  /* ---------- runnable demos ---------- */
  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.name + ': ' + v.message;
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
    badge.className = 'mongoose-badge'; badge.textContent = '🍃 mongoose emulator';
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
      seedAnime();   // every example starts from the same 5 anime → deterministic
      var sandboxConsole = makeConsole(myRun);
      try {
        var fn = new Function('console', 'require', 'mongoose', '"use strict";\nreturn (async () => {\n' + pre.textContent + '\n})();');
        var r = fn(sandboxConsole, makeRequire(), mongoose);
        if (r && typeof r.catch === 'function') r.catch(function (err) { sandboxConsole.error(err); });
      } catch (err) { sandboxConsole.error(err); }
    }

    runBtn.addEventListener('click', function () { runBtn.disabled = true; setTimeout(function () { runBtn.disabled = false; }, 400); run(); });
    codeEl.addEventListener('input', function () { if (!liveBox.checked) return; clearTimeout(liveTimer); liveTimer = setTimeout(run, 700); });
    codeEl.addEventListener('blur', function () { codeEl.innerHTML = highlight(codeEl.textContent); });
    clearBtn.addEventListener('click', function () { runId++; out.textContent = ''; });
  });

  /* ---------- relational vs document toggle ---------- */
  document.querySelectorAll('.rvd').forEach(function (rvd) {
    var tabs = rvd.querySelectorAll('.rvd-tab');
    var panes = rvd.querySelectorAll('.rvd-pane');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        panes.forEach(function (p) { p.classList.toggle('hidden', p.dataset.pane !== tab.dataset.pane); });
      });
    });
  });

  /* ---------- MongoDB hierarchy widget ---------- */
  var mhInfo = document.getElementById('mh-info');
  if (mhInfo) {
    var layers = document.querySelectorAll('.mh-layer');
    layers.forEach(function (l) {
      l.addEventListener('click', function (e) {
        e.stopPropagation();
        layers.forEach(function (x) { x.classList.toggle('active', x === l); });
        mhInfo.innerHTML = '<b>' + l.dataset.name + '</b> — ' + l.dataset.desc;
      });
    });
  }

  /* ---------- pretty JSON for documents ---------- */
  function jsonHtml(obj) {
    var json = JSON.stringify(obj, null, 2);
    return json
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?/g, function (match, p1, p2, p3) {
        if (p3) { // key
          var cls = /"_id"/.test(p1) ? 'jid' : 'jk';
          return '<span class="' + cls + '">' + p1 + '</span>' + p3;
        }
        return '<span class="js">' + p1 + '</span>';
      })
      .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="jn">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="jb">$1</span>');
  }

  /* ---------- query playground ---------- */
  var qResults = document.getElementById('q-results');
  if (qResults) {
    var qMethod = document.getElementById('q-method');
    var qInput = document.getElementById('q-input');
    var qCount = document.getElementById('q-count');
    // The playground has its OWN frozen catalog so example runs never disturb it.
    var CATALOG = [
      { _id: objectId(), title: "Death Note", studio: "Madhouse", rating: 9, year: 2006, episodes: 37 },
      { _id: objectId(), title: "Fullmetal Alchemist: Brotherhood", studio: "Bones", rating: 10, year: 2009, episodes: 64 },
      { _id: objectId(), title: "Demon Slayer", studio: "Ufotable", rating: 9, year: 2019, episodes: 26 },
      { _id: objectId(), title: "Attack on Titan", studio: "Wit Studio", rating: 9, year: 2013, episodes: 25 },
      { _id: objectId(), title: "One Punch Man", studio: "Madhouse", rating: 8, year: 2015, episodes: 12 }
    ];

    function runQuery() {
      var raw = qInput.value.trim() || '{}';
      var filter;
      try { filter = eval('(' + raw + ')'); }   // allow /regex/ + operator objects in the demo
      catch (e) { qCount.innerHTML = ''; qResults.innerHTML = '<div class="q-error">✗ Not a valid filter: ' + esc(e.message) + '</div>'; return; }
      var method = qMethod.value;
      var hits;
      try { hits = CATALOG.filter(function (d) { return matches(d, filter); }); }
      catch (e2) { qCount.innerHTML = ''; qResults.innerHTML = '<div class="q-error">✗ ' + esc(e2.message) + '</div>'; return; }
      if (method === 'countDocuments') { qCount.innerHTML = 'Anime.countDocuments(' + esc(raw) + ') → <b>' + hits.length + '</b>'; qResults.innerHTML = ''; return; }
      var docs = method === 'findOne' ? hits.slice(0, 1) : hits;
      qCount.innerHTML = 'Anime.' + method + '(' + esc(raw) + ') → matched <b>' + docs.length + '</b> document' + (docs.length === 1 ? '' : 's');
      qResults.innerHTML = docs.length
        ? docs.map(function (d) { return '<pre class="doc-json">' + jsonHtml(d) + '</pre>'; }).join('')
        : '<div class="q-count" style="opacity:.7">no documents matched — try another filter</div>';
    }
    qInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runQuery(); } });
    document.getElementById('q-run').addEventListener('click', runQuery);
    qMethod.addEventListener('change', runQuery);
    document.querySelectorAll('.q-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (chip.dataset.method) qMethod.value = chip.dataset.method;
        qInput.value = chip.dataset.filter;
        runQuery();
      });
    });
    runQuery();
  }

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
