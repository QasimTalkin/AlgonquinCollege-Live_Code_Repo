/**
 * mascot.js — "Algo the Otter" 🦦
 * The interactive mascot for Qasim.dev course portal & the CST8326 Web Archipelago.
 * Self-contained: injects its own CSS + SVG. Just add:
 *   <script src=".../assets/js/mascot.js" defer></script>
 * Optional: define window.ALGO_TIPS = ['...'] before loading to customize speech.
 */
(function () {
  'use strict';

  var DEFAULT_TIPS = [
    "Hi! I'm Algo the Otter 🦦 — click me for study tips!",
    "Code a little every day. Consistency beats cramming!",
    "Stuck for 20 minutes? Take a break, then read the error message out loud.",
    "The console is your best friend. console.log() everything!",
    "Read other people's code — it's like traveling for programmers.",
    "Break big problems into tiny islands and hop between them.",
    "Save your work. Commit often. Future-you says thanks!",
    "There are no silly questions in class. Ask away!"
  ];

  var TIPS = (window.ALGO_TIPS && window.ALGO_TIPS.length) ? window.ALGO_TIPS : DEFAULT_TIPS;
  var STORAGE_KEY = 'algo-mascot-hidden';

  var CSS = [
    '#algo-mascot{position:fixed;right:22px;bottom:18px;z-index:9000;display:flex;flex-direction:column;align-items:flex-end;font-family:"Outfit","Inter",sans-serif;-webkit-user-select:none;user-select:none;}',
    '#algo-mascot.algo-hidden{display:none;}',
    '#algo-bubble{position:relative;max-width:240px;margin-bottom:10px;padding:12px 16px;background:rgba(10,17,34,.92);border:1px solid rgba(0,229,255,.35);border-radius:16px 16px 4px 16px;color:#e2e8f0;font-size:.85rem;line-height:1.45;box-shadow:0 8px 32px rgba(0,229,255,.15);opacity:0;transform:translateY(8px) scale(.96);transition:opacity .3s ease,transform .3s ease;pointer-events:none;backdrop-filter:blur(8px);}',
    '#algo-bubble.algo-show{opacity:1;transform:translateY(0) scale(1);}',
    '#algo-bubble::after{content:"";position:absolute;bottom:-7px;right:24px;width:12px;height:12px;background:inherit;border-right:1px solid rgba(0,229,255,.35);border-bottom:1px solid rgba(0,229,255,.35);transform:rotate(45deg);}',
    '#algo-body{width:96px;height:96px;cursor:pointer;border:none;background:transparent;padding:0;animation:algo-bob 3.2s ease-in-out infinite;transition:transform .25s ease;position:relative;}',
    '#algo-body:hover{transform:scale(1.08);}',
    '#algo-body:active{transform:scale(.95);}',
    '#algo-body:focus-visible{outline:2px solid #00e5ff;outline-offset:4px;border-radius:50%;}',
    '#algo-body svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 6px 18px rgba(0,229,255,.25));}',
    '#algo-close{position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(10,17,34,.9);color:#94a3b8;font-size:11px;line-height:1;cursor:pointer;display:none;align-items:center;justify-content:center;z-index:2;}',
    '#algo-mascot:hover #algo-close{display:flex;}',
    '#algo-close:hover{color:#fff;border-color:#00e5ff;}',
    '@keyframes algo-bob{0%,100%{transform:translateY(0) rotate(-2deg);}50%{transform:translateY(-8px) rotate(2deg);}}',
    '#algo-body:hover .algo-arm-r{animation:algo-wave .6s ease-in-out infinite;transform-origin:78px 62px;}',
    '@keyframes algo-wave{0%,100%{transform:rotate(0deg);}50%{transform:rotate(-35deg);}}',
    '.algo-eye{animation:algo-blink 4.5s infinite;transform-origin:center;transform-box:fill-box;}',
    '@keyframes algo-blink{0%,92%,100%{transform:scaleY(1);}95%{transform:scaleY(.08);}}',
    '.algo-sparkle{opacity:0;}',
    '#algo-body.algo-party .algo-sparkle{animation:algo-spark .8s ease-out;}',
    '@keyframes algo-spark{0%{opacity:1;transform:scale(.4);}100%{opacity:0;transform:scale(1.6);}}',
    '@media (max-width:640px){#algo-body{width:72px;height:72px;}#algo-bubble{max-width:190px;font-size:.78rem;}}',
    '@media (prefers-reduced-motion:reduce){#algo-body,.algo-eye,#algo-body:hover .algo-arm-r{animation:none !important;}}'
  ].join('\n');

  // A friendly sea otter with a sailor scarf, floating on its back.
  var SVG =
    '<svg viewBox="0 0 100 100" role="img" aria-label="Algo the Otter, course mascot">' +
    '<g class="algo-sparkle"><circle cx="14" cy="20" r="2.2" fill="#00e5ff"/><circle cx="88" cy="16" r="1.8" fill="#b400ff"/><circle cx="90" cy="44" r="1.5" fill="#00e5ff"/><circle cx="10" cy="52" r="1.6" fill="#b400ff"/></g>' +
    // tail
    '<path d="M22 78 Q8 84 12 70 Q16 62 26 68 Z" fill="#8a5a3b"/>' +
    // body
    '<ellipse cx="50" cy="70" rx="30" ry="22" fill="#a06a45"/>' +
    '<ellipse cx="50" cy="74" rx="21" ry="15" fill="#d9b08c"/>' +
    // left arm
    '<ellipse cx="26" cy="62" rx="7" ry="10" fill="#8a5a3b" transform="rotate(18 26 62)"/>' +
    // right arm (waves on hover)
    '<g class="algo-arm-r"><ellipse cx="76" cy="60" rx="7" ry="11" fill="#8a5a3b" transform="rotate(-24 76 60)"/><circle cx="80" cy="50" r="4.6" fill="#d9b08c"/></g>' +
    // head
    '<circle cx="50" cy="34" r="21" fill="#a06a45"/>' +
    '<circle cx="33" cy="19" r="6" fill="#a06a45"/><circle cx="67" cy="19" r="6" fill="#a06a45"/>' +
    '<circle cx="33" cy="19" r="2.7" fill="#6f4429"/><circle cx="67" cy="19" r="2.7" fill="#6f4429"/>' +
    // face patch
    '<ellipse cx="50" cy="39" rx="14" ry="11" fill="#e8c9a8"/>' +
    // eyes (blink)
    '<g class="algo-eye"><circle cx="42" cy="31" r="3.1" fill="#1a1208"/><circle cx="43.2" cy="29.8" r="1" fill="#fff"/></g>' +
    '<g class="algo-eye"><circle cx="58" cy="31" r="3.1" fill="#1a1208"/><circle cx="59.2" cy="29.8" r="1" fill="#fff"/></g>' +
    // nose + mouth + whiskers
    '<ellipse cx="50" cy="38" rx="4" ry="3" fill="#3d2314"/>' +
    '<path d="M50 41 Q50 45 46 45 M50 41 Q50 45 54 45" stroke="#3d2314" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<g stroke="#7a563b" stroke-width="1" stroke-linecap="round"><path d="M34 37 L24 35"/><path d="M34 40 L24 41"/><path d="M66 37 L76 35"/><path d="M66 40 L76 41"/></g>' +
    // sailor scarf
    '<path d="M32 50 Q50 60 68 50 L66 57 Q50 66 34 57 Z" fill="#00b8d4"/>' +
    '<path d="M47 58 L50 66 L53 58 Z" fill="#0090aa"/>' +
    // laptop on belly
    '<g><rect x="38" y="66" width="24" height="14" rx="2" fill="#0a1122" stroke="#00e5ff" stroke-width="1"/><path d="M42 71 L46 73.5 L42 76" stroke="#00e5ff" stroke-width="1.4" fill="none" stroke-linecap="round"/><rect x="48" y="74.5" width="8" height="1.6" rx=".8" fill="#b400ff"/></g>' +
    '</svg>';

  function init() {
    if (document.getElementById('algo-mascot')) return;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.id = 'algo-mascot';
    if (localStorage.getItem(STORAGE_KEY) === '1') root.className = 'algo-hidden';

    var bubble = document.createElement('div');
    bubble.id = 'algo-bubble';
    bubble.setAttribute('role', 'status');

    var body = document.createElement('button');
    body.id = 'algo-body';
    body.type = 'button';
    body.setAttribute('aria-label', 'Algo the Otter — click for a study tip');
    body.innerHTML = SVG;

    var close = document.createElement('button');
    close.id = 'algo-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Hide mascot');
    close.textContent = '×';

    var wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.appendChild(body);
    wrap.appendChild(close);

    root.appendChild(bubble);
    root.appendChild(wrap);
    document.body.appendChild(root);

    var tipIndex = -1;
    var hideTimer = null;

    function say(text, ms) {
      bubble.textContent = text;
      bubble.classList.add('algo-show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { bubble.classList.remove('algo-show'); }, ms || 6000);
    }

    body.addEventListener('click', function () {
      tipIndex = (tipIndex + 1) % TIPS.length;
      say(TIPS[tipIndex]);
      body.classList.remove('algo-party');
      void body.offsetWidth; // restart sparkle animation
      body.classList.add('algo-party');
    });

    close.addEventListener('click', function (e) {
      e.stopPropagation();
      root.classList.add('algo-hidden');
      localStorage.setItem(STORAGE_KEY, '1');
    });

    // Friendly hello shortly after load (only once per page view).
    setTimeout(function () {
      if (!root.classList.contains('algo-hidden')) say(TIPS[0], 5000);
    }, 1600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
