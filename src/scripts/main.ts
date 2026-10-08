import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, ScrambleTextPlugin);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Smooth scrolling (Lenis, driven by GSAP's ticker) ---------- */
let lenis: Lenis | null = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

document.querySelectorAll<HTMLAnchorElement>('a[data-scroll]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href');
    if (!hash?.startsWith('#')) return;
    const target = document.querySelector<HTMLElement>(hash);
    if (!target) return;
    event.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView();
    history.replaceState(null, '', hash);
  });
});

/* ---------- ID card: tap to turn over (hover handled in CSS) ---------- */
const idCard = document.querySelector<HTMLButtonElement>('[data-idcard]');
idCard?.addEventListener('click', () => idCard.classList.toggle('is-flipped'));

/* ---------- Motion that only runs when the visitor allows it ---------- */
const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  // Hero: one orchestrated reveal on load.
  const lead = document.querySelector('.hero main p');
  const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
  // Split the lead into lines only after fonts load, so lines break correctly.
  const split = lead
    ? SplitText.create(lead, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, stagger: 0.08, ease: 'power4.out', delay: 0.7 }),
      })
    : null;
  intro
    .from('[data-hero-title] .line-mask > *', { yPercent: 110, duration: 1.3, stagger: 0.14 })
    .from('.hero .draft', { drawSVG: 0, duration: 2.2, ease: 'power2.inOut', stagger: 0.12 }, 0.2)
    .from('.hero-sub:not(p)', { opacity: 0, y: 18, duration: 0.9, stagger: 0.08 }, 0.65);

  // ID card floats gently.
  gsap.to('[data-float]', { y: -14, rotation: 0.6, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  // Practice line draws itself as the section scrolls past.
  gsap.from('.practice-line', {
    drawSVG: 0,
    ease: 'none',
    scrollTrigger: { trigger: '#practice', start: 'top 70%', end: 'center 45%', scrub: 0.6 },
  });

  // Years of experience count up once, when the Journey section arrives.
  gsap.from('.years-num', {
    textContent: 0,
    snap: { textContent: 1 },
    duration: 1.8,
    ease: 'power2.out',
    scrollTrigger: { trigger: '.years-mark', start: 'top 85%', once: true },
  });

  // Orbit ring rotates slowly, forever.
  gsap.to('.orbit-spin', { rotation: 360, svgOrigin: '270 270', duration: 120, ease: 'none', repeat: -1 });

  // Work cards reveal in a stagger as they enter.
  gsap.set('.work-card', { opacity: 0, y: 36 });
  ScrollTrigger.batch('.work-card', {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', overwrite: true }),
  });

  return () => split?.revert();
});

/* ---------- Domains: pinned on large screens, stacked elsewhere ---------- */
const nodes = gsap.utils.toArray<HTMLElement>('[data-node]');
const panels = gsap.utils.toArray<HTMLElement>('[data-panel]');
const ticks = gsap.utils.toArray<HTMLElement>('[data-tick]');
const spokes = gsap.utils.toArray<SVGLineElement>('.spoke');
let activeDomain = -1;

function setDomain(index: number) {
  if (index === activeDomain) return;
  activeDomain = index;
  nodes.forEach((n, i) => n.classList.toggle('is-active', i === index));
  panels.forEach((p, i) => p.classList.toggle('is-active', i === index));
  ticks.forEach((t, i) => {
    t.style.backgroundColor = i === index ? '#F2C230' : 'rgba(241,239,232,0.25)';
  });
  spokes.forEach((s, i) => s.setAttribute('stroke', i === index ? 'rgba(242,194,48,0.85)' : 'rgba(241,239,232,0.12)'));
  const panel = panels[index];
  if (panel && !reduceMotion) gsap.fromTo(panel, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
}

mm.add('(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
  setDomain(0);
  const pinEl = document.querySelector('.domains-pin');
  pinEl?.classList.add('is-pinned');
  ScrollTrigger.create({
    trigger: '.domains-pin',
    pin: true,
    start: 'top top',
    end: '+=220%',
    scrub: true,
    onUpdate: (self) => setDomain(Math.min(panels.length - 1, Math.floor(self.progress * panels.length))),
  });
  return () => pinEl?.classList.remove('is-pinned');
});

mm.add('(max-width: 899px), (max-height: 699px), (prefers-reduced-motion: reduce)', () => {
  const section = document.querySelector('#domains');
  section?.classList.add('domains-static');
  nodes.forEach((n) => n.classList.remove('is-active'));
  return () => section?.classList.remove('domains-static');
});


/* ---------- Achievements reel ---------- */
const ach = document.querySelector<HTMLElement>('.ach');
const track = document.querySelector<HTMLElement>('.ach-track');
const chapters = gsap.utils.toArray<HTMLElement>('.chapter');
const progressFill = document.querySelector<HTMLElement>('.ach-progress-fill');
const progressLabels = gsap.utils.toArray<HTMLElement>('.ach-progress-labels li');

// Counters count up; word stats (XMO, O365) scramble into place.
function animateStats(scope: HTMLElement, trigger: ScrollTrigger.Vars) {
  scope.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix ?? '';
    const counter = { v: 0 };
    el.textContent = `0${suffix}`;
    gsap.to(counter, {
      v: end,
      duration: 2.2,
      ease: 'power3.out',
      onUpdate: () => { el.textContent = `${Math.round(counter.v).toLocaleString('en-GB')}${suffix}`; },
      scrollTrigger: trigger,
    });
  });
  scope.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    const text = el.dataset.scramble ?? '';
    el.textContent = '';
    gsap.to(el, { duration: 1.6, scrambleText: { text, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', revealDelay: 0.4, speed: 0.5 }, scrollTrigger: trigger });
  });
}

mm.add('(min-width: 1024px) and (min-height: 720px) and (prefers-reduced-motion: no-preference)', () => {
  if (!ach || !track) return;
  ach.classList.add('is-reel');
  // Travel until the last chapter sits in the centre of the screen.
  const distance = () => {
    const last = chapters[chapters.length - 1];
    return Math.max(0, last.offsetLeft + last.offsetWidth / 2 - window.innerWidth / 2);
  };

  const reel = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: ach,
      pin: true,
      start: 'top top',
      end: () => `+=${distance()}`,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (progressFill) progressFill.style.transform = `scaleX(${self.progress})`;
        const at = Math.min(progressLabels.length - 1, Math.floor(self.progress * progressLabels.length * 0.999));
        progressLabels.forEach((l, i) => l.classList.toggle('is-on', i <= at));
      },
    },
  });

  chapters.forEach((chapter, index) => {
    // The first chapter is already on screen when the reel pins, so it plays as the section arrives.
    const inView = (index === 0
      ? { trigger: ach, start: 'top 45%', toggleActions: 'play none none none' }
      : { containerAnimation: reel, trigger: chapter, start: 'left 78%', toggleActions: 'play none none none' }) as ScrollTrigger.Vars;
    // Chapter grows into focus as it slides in.
    if (index > 0) gsap.fromTo(chapter, { scale: 0.9, opacity: 0.35 }, {
      scale: 1, opacity: 1, ease: 'none',
      scrollTrigger: { containerAnimation: reel, trigger: chapter, start: 'left right', end: 'left 35%', scrub: true },
    });
    // Giant outlined name drifts slower than the card: parallax.
    const mark = chapter.querySelector('.chapter-mark');
    if (mark) {
      gsap.fromTo(mark, { xPercent: 25 }, {
        xPercent: -25, ease: 'none',
        scrollTrigger: { containerAnimation: reel, trigger: chapter, start: 'left right', end: 'right left', scrub: true },
      });
    }
    gsap.from(chapter.querySelectorAll('.chapter-items li'), { x: 70, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', scrollTrigger: inView });
    gsap.from(chapter.querySelectorAll('.chapter-years, .chapter-org, .chapter-role'), { y: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', scrollTrigger: inView });
    const award = chapter.querySelector('.award');
    if (award) gsap.from(award, { scale: 0.85, rotation: -3, opacity: 0, duration: 0.9, delay: 0.5, ease: 'back.out(2)', scrollTrigger: inView });
    animateStats(chapter, inView);
  });

  return () => ach.classList.remove('is-reel');
});

mm.add('(max-width: 1023px), (max-height: 719px)', () => {
  if (reduceMotion) return;
  chapters.forEach((chapter) => {
    const inView = { trigger: chapter, start: 'top 80%', toggleActions: 'play none none none' } as ScrollTrigger.Vars;
    gsap.from(chapter, { y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: inView });
    gsap.from(chapter.querySelectorAll('.chapter-items li'), { x: 30, opacity: 0, duration: 0.7, stagger: 0.06, delay: 0.2, ease: 'power3.out', scrollTrigger: inView });
    animateStats(chapter, inView);
  });
});

/* ---------- Work filters ---------- */
const filters = document.querySelectorAll<HTMLButtonElement>('[data-filter]');
filters.forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll<HTMLElement>('.work-card').forEach((card) => {
      const show = value === 'all' || card.dataset.domain === value;
      card.hidden = !show;
      if (show) gsap.set(card, { opacity: 1, y: 0 });
    });
    ScrollTrigger.refresh();
  });
});

/* ---------- Heavier visuals load only when needed ---------- */
const heroCanvas = document.querySelector<HTMLCanvasElement>('#hero-light');
if (heroCanvas && !reduceMotion) {
  import('./heroLight').then(({ initHeroLight }) => initHeroLight(heroCanvas)).catch(() => {});
}

const mapSvg = document.querySelector<SVGSVGElement>('#cap-map');
if (mapSvg) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      import('./capabilityMap').then(({ initCapabilityMap }) => initCapabilityMap(mapSvg, reduceMotion));
    }
  }, { rootMargin: '400px 0px' });
  io.observe(mapSvg);
}

window.addEventListener('load', () => ScrollTrigger.refresh());
