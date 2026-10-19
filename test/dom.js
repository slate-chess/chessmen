// Copyright 2026 Linu Alex. SPDX-License-Identifier: Apache-2.0
// Just enough DOM to mount a real board in `node --test`: the elements, attributes, events,
// localStorage, matchMedia, IntersectionObserver and animation frames that src/board.js and
// src/stage.js touch. No jsdom, so the test suite stays dependency-free (the built-file tests
// in core.test.js use the same hand-rolled approach with `vm`).
//
//   const dom = installDOM();            // installs the globals
//   const host = dom.document.createElement('div');
//   const board = create(host, { games });
//   dom.click(dom.query(host, '.cm-next'));
//   dom.restore();

class DomEvent {
  constructor(type, props = {}) {
    this.type = type;
    this.defaultPrevented = false;
    this.propagationStopped = false;
    Object.assign(this, props);
  }
  preventDefault() { this.defaultPrevented = true; }
  /** Both forms stop the remaining phases here; the board relies on a capture listener
   *  on an ancestor cutting the event off before the stage's own handler at the target. */
  stopPropagation() { this.propagationStopped = true; }
  stopImmediatePropagation() { this.propagationStopped = true; }
}

class Elem {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.attrs = {};
    this.listeners = [];
    this.tabIndex = -1;
    this.className = '';
    this.id = '';
    this.value = '';
    this.title = '';
    this.type = '';
    this.style = {};
    this._text = '';
    this._html = null;
    const self = this;
    this.classList = {
      add(...cs) { const have = self.classes(); for (const c of cs) if (!have.includes(c)) have.push(c); self.className = have.join(' '); },
      remove(...cs) { self.className = self.classes().filter((c) => !cs.includes(c)).join(' '); },
      contains(c) { return self.classes().includes(c); },
    };
  }

  classes() { return this.className ? this.className.split(/\s+/).filter(Boolean) : []; }

  get innerHTML() {
    if (this.childNodes.length) return this.childNodes.map((c) => c.outerHTML).join('');
    return this._html ?? this._text;
  }
  set innerHTML(v) { this._html = String(v); this._text = ''; this.childNodes.forEach((c) => { c.parentNode = null; }); this.childNodes = []; }

  get textContent() {
    if (this.childNodes.length) return this.childNodes.map((c) => c.textContent).join('');
    return this._text || (this._html ?? '').replace(/<[^>]*>/g, '');
  }
  set textContent(v) { this._text = String(v); this._html = null; this.childNodes = []; }

  get outerHTML() {
    const attrs = Object.entries(this.attrs).map(([k, v]) => ` ${k}="${v}"`).join('');
    return `<${this.tagName.toLowerCase()}${attrs}>${this.innerHTML}</${this.tagName.toLowerCase()}>`;
  }

  get dataset() {
    const out = {};
    for (const [k, v] of Object.entries(this.attrs)) {
      if (k.startsWith('data-')) out[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v;
    }
    return out;
  }

  appendChild(child) { child.parentNode = this; this.childNodes.push(child); return child; }
  append(...nodes) { for (const n of nodes) this.appendChild(n); }
  insertBefore(node, before) {
    const i = this.childNodes.indexOf(before);
    node.parentNode = this;
    this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, node);
    return node;
  }
  get firstChild() { return this.childNodes[0] || null; }

  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }

  /** `select.add(option)`; the first option becomes the value, as in a browser. */
  add(option) { this.appendChild(option); if (this.childNodes.length === 1) this.value = option.value; }

  addEventListener(type, fn, opts) {
    this.listeners.push({ type, fn, capture: opts === true || !!(opts && opts.capture) });
  }
  removeEventListener(type, fn) {
    this.listeners = this.listeners.filter((l) => !(l.type === type && l.fn === fn));
  }
  /** Capture down the ancestors, then this node's listeners in the order they were added, then bubble up. */
  dispatchEvent(ev) {
    ev.target = this;
    const path = [];
    for (let p = this.parentNode; p; p = p.parentNode) path.unshift(p);
    for (const node of path) for (const l of [...node.listeners]) if (l.type === ev.type && l.capture && !ev.propagationStopped) l.fn.call(node, ev);
    if (!ev.propagationStopped) for (const l of [...this.listeners]) if (l.type === ev.type) l.fn.call(this, ev);
    for (const node of [...path].reverse()) for (const l of [...node.listeners]) if (l.type === ev.type && !l.capture && !ev.propagationStopped) l.fn.call(node, ev);
    return !ev.defaultPrevented;
  }

  cloneNode(deep) {
    const c = new Elem(this.tagName);
    c.attrs = { ...this.attrs };
    c.className = this.className;
    c._html = this._html;
    c._text = this._text;
    c.value = this.value;
    if (deep) for (const k of this.childNodes) c.appendChild(k.cloneNode(true));
    return c;
  }

  /** Only what the library asks for: `script[type="..."]`. */
  querySelector(sel) {
    const m = /^(\w+)\[type="([^"]+)"\]$/.exec(sel);
    if (!m) throw new Error(`test DOM: querySelector(${sel}) not supported`);
    return descendants(this).find((e) => e.tagName === m[1].toUpperCase() && e.getAttribute('type') === m[2]) || null;
  }
}

function descendants(root) {
  const out = [];
  for (const c of root.childNodes) { out.push(c, ...descendants(c)); }
  return out;
}

/** `.class` or `tag` selectors, over an element's descendants. */
function matches(e, sel) {
  return sel.startsWith('.') ? e.classList.contains(sel.slice(1)) : e.tagName === sel.toUpperCase();
}

export function installDOM({ reducedMotion = false, hidden = false, storage = {} } = {}) {
  const document = new Elem('#document');
  document.head = document.appendChild(new Elem('head'));
  document.body = document.appendChild(new Elem('body'));
  document.hidden = hidden;
  document.createElement = (tag) => new Elem(tag);
  document.createElementNS = (_ns, tag) => new Elem(tag);
  document.getElementById = (id) => descendants(document).find((e) => e.id === id) || null;

  const store = new Map(Object.entries(storage));
  const localStorage = {
    blocked: false,
    getItem(k) { if (localStorage.blocked) throw new Error('blocked'); return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { if (localStorage.blocked) throw new Error('blocked'); store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    get size() { return store.size; },
    entries() { return Object.fromEntries(store); },
  };

  const observers = [];
  class IntersectionObserver {
    constructor(cb) { this.cb = cb; this.targets = []; observers.push(this); }
    observe(el) { this.targets.push(el); }
    disconnect() { this.targets = []; observers.splice(observers.indexOf(this), 1); }
  }

  class Option extends Elem {
    constructor(text, value) { super('option'); this.text = String(text); this.textContent = String(text); this.value = String(value); }
  }

  // Autoplay runs on setInterval and times its end pause with Date.now(); both are faked so a
  // test can step the clock instead of waiting for it. Only setInterval is replaced, so the test
  // runner's own setTimeout keeps working.
  let frames = [];
  let clock = Date.now();
  const timers = new Map();
  let nextTimer = 1;
  const saved = {};
  const savedDateNow = Date.now;
  const globals = {
    document,
    window: globalThis,
    localStorage,
    IntersectionObserver,
    Option,
    matchMedia: (q) => ({ media: q, matches: /reduced-motion/.test(q) ? reducedMotion : false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
    cancelAnimationFrame: () => {},
    setInterval: (fn, ms) => { const id = nextTimer++; timers.set(id, { fn, ms: ms || 0 }); return id; },
    clearInterval: (id) => { timers.delete(id); },
  };
  for (const [k, v] of Object.entries(globals)) { saved[k] = globalThis[k]; globalThis[k] = v; }
  Date.now = () => clock;

  return {
    document,
    localStorage,
    /** Run queued animation frames, up to `rounds` generations. */
    frames(rounds = 4) {
      for (let i = 0; i < rounds && frames.length; i++) { const q = frames; frames = []; for (const fn of q) fn(); }
      return frames.length;
    },
    /** Fire every running interval `n` times, advancing the fake clock by its period. */
    tick(n = 1) {
      for (let i = 0; i < n; i++) for (const t of [...timers.values()]) { clock += t.ms; t.fn(); }
    },
    /** Move the fake clock on without firing anything (to let an end pause elapse). */
    wait(ms) { clock += ms; },
    get timers() { return timers.size; },
    /** The period of each running interval, to check the documented default. */
    periods() { return [...timers.values()].map((t) => t.ms); },
    query(root, sel) { return descendants(root).find((e) => matches(e, sel)) || null; },
    queryAll(root, sel) { return descendants(root).filter((e) => matches(e, sel)); },
    click(el) { el.dispatchEvent(new DomEvent('click')); },
    change(el, value) { if (value !== undefined) el.value = String(value); el.dispatchEvent(new DomEvent('change')); },
    key(el, key) { el.dispatchEvent(new DomEvent('keydown', { key })); },
    /** Report the board on or off screen, as the IntersectionObserver would. */
    intersect(isIntersecting) { for (const o of observers) o.cb(o.targets.map(() => ({ isIntersecting })), o); },
    /** Hide or show the tab, firing visibilitychange. */
    visibility(isHidden) { document.hidden = isHidden; document.dispatchEvent(new DomEvent('visibilitychange')); },
    Event: DomEvent,
    restore() {
      Date.now = savedDateNow;
      for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; }
    },
  };
}
