/**
 * week9.js — interactivity for the Week 9 "Asynchronous JavaScript" island.
 * Syntax highlighting, runnable code demos, event-loop simulator,
 * promise state machine, quiz, scroll-spy TOC and progress bar.
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

  /* ---------- 2. Runnable demos ---------- */
  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.name + ': ' + v.message;
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }

  document.querySelectorAll('.runner').forEach(function (runner) {
    var pre = runner.querySelector('pre');
    var out = runner.querySelector('.run-out');
    var runBtn = runner.querySelector('.run-btn');
    var clearBtn = runner.querySelector('.clear-btn');
    var runId = 0;

    function makeConsole(myRun, kindDefault) {
      function push(kind) {
        return function () {
          if (runId !== myRun) return; // drop logs from stale runs
          var line = document.createElement('span');
          line.className = 'log-line' + (kind === 'error' ? ' err' : '');
          line.textContent = Array.prototype.map.call(arguments, fmt).join(' ');
          out.appendChild(line);
        };
      }
      return { log: push('log'), error: push('error'), warn: push('error'), info: push('log') };
    }

    runBtn.addEventListener('click', function () {
      runId++;
      out.textContent = '';
      var myRun = runId;
      var sandboxConsole = makeConsole(myRun);
      runBtn.disabled = true;
      setTimeout(function () { runBtn.disabled = false; }, 400);
      try {
        var fn = new Function('console', '"use strict";\n' + pre.textContent);
        fn(sandboxConsole);
      } catch (err) {
        sandboxConsole.error(err);
      }
    });

    clearBtn.addEventListener('click', function () {
      runId++; // also invalidates pending timers' logs
      out.textContent = '';
    });
  });

  /* ---------- 3. Event loop simulator ---------- */
  var elPlay = document.getElementById('el-play');
  if (elPlay) {
    var boxes = {
      stack: document.querySelector('#el-stack .el-chips'),
      api: document.querySelector('#el-api .el-chips'),
      queue: document.querySelector('#el-queue .el-chips'),
      consoleBox: document.getElementById('el-console')
    };
    var narrate = document.getElementById('el-narrate');
    var codeLines = document.querySelectorAll('#el-code .code-line');
    var timer = null;

    var STEPS = [
      {
        line: 1, stack: ['console.log("Start")'], api: [], queue: [], out: ['Start'],
        say: '1 · console.log("Start") is pushed onto the call stack, runs, and prints immediately.'
      },
      {
        line: 2, stack: ['setTimeout(...)'], api: [], queue: [], out: ['Start'],
        say: '2 · setTimeout is called. It does NOT wait — it just registers the callback with the browser.'
      },
      {
        line: 2, stack: [], api: ['⏱ timer: 2000 ms'], queue: [], out: ['Start'],
        say: '3 · The browser\'s Web API takes over the countdown. The JS thread is already free.'
      },
      {
        line: 5, stack: ['console.log("End")'], api: ['⏱ timer: 2000 ms'], queue: [], out: ['Start', 'End'],
        say: '4 · JS moves straight to the next line — "End" prints while the timer is still ticking!'
      },
      {
        line: 5, stack: [], api: [], queue: ['callback ()'], out: ['Start', 'End'],
        say: '5 · 2 seconds pass… the timer finishes, and its callback is placed in the callback queue.'
      },
      {
        line: 3, stack: ['callback → console.log(...)'], api: [], queue: [], out: ['Start', 'End', 'Processing...'],
        say: '6 · The call stack is empty, so the event loop moves the callback onto it. "Processing..." prints.'
      },
      {
        line: 0, stack: [], api: [], queue: [], out: ['Start', 'End', 'Processing...'],
        say: '✅ Done! Final order: Start → End → Processing... — even though the code was written in a different order.'
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
      codeLines.forEach(function (l) { l.classList.toggle('hl', +l.dataset.l === s.line || (+l.dataset.l === 4 && s.line === 2)); });
      renderChips(boxes.stack, s.stack);
      renderChips(boxes.api, s.api, 'timer');
      renderChips(boxes.queue, s.queue, 'timer');
      boxes.consoleBox.innerHTML = s.out.map(function (o) { return '<div>▸ ' + o + '</div>'; }).join('');
      narrate.textContent = s.say;
      document.getElementById('el-stack').classList.toggle('active-box', s.stack.length > 0);
      document.getElementById('el-api').classList.toggle('active-box', s.api.length > 0);
      document.getElementById('el-queue').classList.toggle('active-box', s.queue.length > 0);
    }

    function reset() {
      clearInterval(timer);
      timer = null;
      elPlay.disabled = false;
      renderStep({ line: 0, stack: [], api: [], queue: [], out: [], say: 'Press Play to start the simulation.' });
    }

    elPlay.addEventListener('click', function () {
      var i = 0;
      elPlay.disabled = true;
      clearInterval(timer);
      renderStep(STEPS[i++]);
      timer = setInterval(function () {
        if (i >= STEPS.length) { clearInterval(timer); timer = null; elPlay.disabled = false; return; }
        renderStep(STEPS[i++]);
      }, 1900);
    });

    document.getElementById('el-reset').addEventListener('click', reset);
  }

  /* ---------- 4. Promise state machine ---------- */
  var pmState = document.getElementById('pm-state');
  if (pmState) {
    var pmLog = document.getElementById('pm-log');
    var btnRes = document.getElementById('pm-resolve');
    var btnRej = document.getElementById('pm-reject');
    var btnAgain = document.getElementById('pm-again');

    function settle(kind) {
      var fulfilled = kind === 'resolve';
      pmState.className = 'pm-state ' + (fulfilled ? 'fulfilled' : 'rejected');
      pmState.textContent = fulfilled ? '✅ fulfilled' : '❌ rejected';
      pmLog.innerHTML = fulfilled
        ? '<span class="fired">.then((value) → …) fired with "Data loaded!"</span><br>.catch was skipped<br><span class="fired">.finally() fired — it always runs</span>'
        : '.then was skipped<br><span class="fired">.catch((reason) → …) fired with "Network error"</span><br><span class="fired">.finally() fired — it always runs</span>';
      btnRes.disabled = true;
      btnRej.disabled = true;
      btnAgain.style.display = 'inline-block';
    }

    btnRes.addEventListener('click', function () { settle('resolve'); });
    btnRej.addEventListener('click', function () { settle('reject'); });
    btnAgain.addEventListener('click', function () {
      pmState.className = 'pm-state pending';
      pmState.textContent = '⏳ pending';
      pmLog.innerHTML = 'The promise is pending — its <span style="font-family:var(--font-mono)">.then()</span> and <span style="font-family:var(--font-mono)">.catch()</span> handlers are waiting…';
      btnRes.disabled = false;
      btnRej.disabled = false;
      btnAgain.style.display = 'none';
    });
  }

  /* ---------- 5. Quiz ---------- */
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

  /* ---------- 6. Scroll-spy TOC + progress bar ---------- */
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
