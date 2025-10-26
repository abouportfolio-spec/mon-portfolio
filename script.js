/* ===============================
   UTILITAIRES
================================= */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ===============================
   ELEMENTS
================================= */
const navLinks = $$('.nav-link');
const menuBtn = $('#menuBtn');
const navLinksContainer = $('#navLinks');
const siteHeader = $('#siteHeader');
const revealEls = $$('.reveal');
const themeToggle = $('#themeToggle');
const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;
const homeBtn = $('#homeBtn');
const contactForm = $('#contactForm');
const formStatus = $('#formStatus');
const heroImage = $('#heroImage');
const yearEl = $('#year');

/* ===============================
   UTILITÉS DE BASE
================================= */
const setYear = () => { if(yearEl) yearEl.textContent = new Date().getFullYear(); };
const setActiveNav = () => {
  const sections = $$('main section[id]');
  const scrollPos = window.scrollY + window.innerHeight * 0.15 + 70;
  let currentId = '';
  sections.forEach(sec => { if(scrollPos >= sec.offsetTop) currentId = sec.id; });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.target === currentId);
  });
};

/* ===============================
   NAVBAR & SCROLL
================================= */
const navbarBehavior = () => {
  if(!siteHeader) return;
  const onScroll = () => {
    siteHeader.classList.toggle('scrolled', window.scrollY > 28);
    setActiveNav();
  };
  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('load', onScroll);
};

/* ===============================
   MOBILE MENU
================================= */
const mobileMenu = () => {
  if(!menuBtn || !navLinksContainer) return;
  menuBtn.addEventListener('click', () => {
    const open = navLinksContainer.classList.toggle('show');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      navLinksContainer.classList.remove('show');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && navLinksContainer.classList.contains('show')){
      navLinksContainer.classList.remove('show');
      menuBtn.setAttribute('aria-expanded','false');
    }
  });
};

/* ===============================
   THEME TOGGLE
================================= */
const initTheme = () => {
  try {
    const saved = localStorage.getItem('td_theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    if(saved === 'light' || (!saved && prefersLight)) {
      document.body.classList.add('light-mode');
      if(themeIcon) themeIcon.className = 'bx bx-moon';
    } else {
      document.body.classList.remove('light-mode');
      if(themeIcon) themeIcon.className = 'bx bx-sun';
    }
  } catch { document.body.classList.remove('light-mode'); if(themeIcon) themeIcon.className='bx bx-sun'; }

  if(themeToggle){
    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-mode');
      if(themeIcon) themeIcon.className = isLight ? 'bx bx-moon' : 'bx bx-sun';
      try { localStorage.setItem('td_theme', isLight?'light':'dark'); } catch{}
    });
  }
};

/* ===============================
   SCROLL REVEAL
================================= */
const scrollReveal = () => {
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    revealEls.forEach(el => el.classList.add('visible'));
    return;
  }
  if(!('IntersectionObserver' in window)){
    revealEls.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries, observer)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el=>io.observe(el));
};

/* ===============================
   HERO TYPEWRITER
================================= */
const typeWriterLoop = () => {
  const el = document.getElementById('typeWrap');
  if(!el) return;

  const phrases = [
    'Développeur Web freelance ',
    'Créateur de sites rapides ',
    'Design & performance ',
    'Interface claire & accessible '
  ];

  let pi = 0;      // phrase index
  let ci = 0;      // character index
  let forward = true;
  let waiting = false;
  const delay = 90; // vitesse légèrement plus lente pour lisibilité

  const tick = () => {
    if(waiting) return;

    const str = phrases[pi];
    el.textContent = str.slice(0, ci); // affiche les caractères
    // ajoute le curseur
    if (!el.querySelector('.cursor')) {
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      cursor.textContent = '|';
      el.appendChild(cursor);
    }

    if(forward){
      ci++;
      if(ci >= str.length){
        waiting = true;
        setTimeout(() => {
          forward = false;
          waiting = false;
        }, 900);
      }
    } else {
      ci--;
      if(ci <= 0){
        waiting = true;
        setTimeout(() => {
          forward = true;
          pi = (pi + 1) % phrases.length;
          waiting = false;
        }, 380);
      }
    }
  };

  setInterval(tick, delay);
};

// Démarre le typewriter quand le DOM est prêt
document.addEventListener('DOMContentLoaded', typeWriterLoop);
/* ===============================
   HERO IMAGE FALLBACK
================================= */
const heroImageHandler = () => {
  if(!heroImage) return;
  heroImage.addEventListener('load', function(){
    const rect=this.getBoundingClientRect();
    if(rect.width<20||rect.height<20){
      const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800'><rect width='100%' height='100%' fill='${getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#0b0c10'}'/><text x='50%' y='50%' fill='${getComputedStyle(document.documentElement).getPropertyValue('--text').trim()||'#ffffff'}' font-family='Poppins,Arial' font-size='22' text-anchor='middle' dominant-baseline='middle'>Portrait indisponible</text></svg>`);
      this.src=`data:image/svg+xml;utf8,${svg}`;
    }
  });
};

/* ===============================
   CONTACT FORM
================================= */
const contactFormHandler = () => {
  if(!contactForm) return;
  contactForm.addEventListener('submit', e=>{
    e.preventDefault();
    const name=contactForm.name.value.trim();
    const email=contactForm.email.value.trim();
    const message=contactForm.message.value.trim();

    if(!name||!email||!message){
      if(formStatus){ formStatus.textContent='Veuillez remplir tous les champs requis.'; formStatus.style.color='orange'; }
      return;
    }

    if(formStatus){ formStatus.textContent='Envoi en cours…'; formStatus.style.color=''; }
    setTimeout(()=>{
      if(formStatus) formStatus.textContent='✅ Message envoyé avec succès ! Je vous répondrai sous 48h.';
      contactForm.reset();
    }, 900);
  });
};

/* ===============================
   HOME BUTTON
================================= */
const homeButtonHandler = () => {
  if(!homeBtn) return;
  homeBtn.addEventListener('click', () => $('#hero')?.scrollIntoView({behavior:'smooth'}));
  homeBtn.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); homeBtn.click(); } });
};

/* ===============================
   INIT ALL
================================= */
document.addEventListener('DOMContentLoaded', ()=>{
  setYear();
  navbarBehavior();
  mobileMenu();
  initTheme();
  scrollReveal();
  typeWriterLoop();
  heroImageHandler();
  contactFormHandler();
  homeButtonHandler();
});