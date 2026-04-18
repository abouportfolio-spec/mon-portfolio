/* ============================================================================
   contact.js — External Script
   - Handles: theme toggle, autosave, draft restore, validation, Formspree submit,
              honeypot, copy to clipboard, notifications, modal, mini chat widget,
              keyboard shortcuts, accessibility helpers.
   ============================================================================ */

(function(){
    'use strict';

    /* -------------------------
       Configuration
       ------------------------- */
    const CONFIG = {
      FORMSPREE_ENDPOINT: 'https://formspree.io/f/xvgwelbg',
      DRAFT_KEY: 'touredev_contact_draft_v1',
      STATS_KEY: 'touredev_contact_stats_v1',
      THEME_KEY: 'touredev_theme_v1',
      AUTOSAVE_INTERVAL_MS: 10000,
      AUTO_CLEAR_AFTER_SEND: true,
      MAX_MESSAGE_LENGTH: 3000,
      WARNING_THRESHOLD: 2800,
      CHAT_ENABLED: true,
      REDUCED_MOTION: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
    

    /* -------------------------
       Utilities
       ------------------------- */
    const $ = (sel, ctx = document) => (ctx || document).querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
    const el = (tag, props = {}, children = []) => {
      const e = document.createElement(tag);
      for (const k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        const v = props[k];
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'text') e.textContent = v;
        else e.setAttribute(k, String(v));
      }
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (c == null) return;
        if (typeof c === 'string') e.appendChild(document.createTextNode(c));
        else e.appendChild(c);
      });
      return e;
    };
    const nowISO = () => new Date().toISOString();

    /* -------------------------
       Element references
       ------------------------- */
    const form = $('#contact-form');
    const submitBtn = $('#submitBtn');
    const spinner = $('#spinner');
    const feedback = $('#feedback');
    const saveDraftBtn = $('#saveDraftBtn');
    const clearDraftBtn = $('#clearDraftBtn');
    const sampleBtn = $('#sampleBtn');
    const charCountEl = $('#charCount');
    const messageEl = $('#message');
    const honeypot = $('#fax');
    const currencySelect = $('#currencySelect');
    const themeToggle = $('#themeToggle');
    const themeIcon = $('#themeIcon');
    const modal = $('#modal');
    const modalContent = $('#modalContent');
    const modalClose = $('#modalClose');
    const copyButtons = $$('.copy-btn');
    const homeBtn = $('#homeBtn');
    const yearEl = $('#year');
    const notifsRoot = $('#td-notifs');

    /* Defensive logs */
    if (!form) console.warn('contact.js: form (id=contact-form) not found — script will degrade gracefully.');

    /* -------------------------
       Local stats (storage)
       ------------------------- */
    const stats = (function(){
      try{
        const raw = localStorage.getItem(CONFIG.STATS_KEY);
        if (!raw) {
          const initial = { sends:0, draftsSaved:0, draftsCleared:0, visits:1, lastVisit: nowISO() };
          localStorage.setItem(CONFIG.STATS_KEY, JSON.stringify(initial));
          return initial;
        }
        const parsed = JSON.parse(raw);
        parsed.visits = (parsed.visits || 0) + 1;
        parsed.lastVisit = nowISO();
        localStorage.setItem(CONFIG.STATS_KEY, JSON.stringify(parsed));
        return parsed;
      } catch(e) {
        return { sends:0, draftsSaved:0, draftsCleared:0, visits:1 };
      }
    })();

    function incrStat(key, delta=1){
      try{
        const raw = localStorage.getItem(CONFIG.STATS_KEY) || '{}';
        const s = JSON.parse(raw);
        s[key] = (s[key] || 0) + delta;
        localStorage.setItem(CONFIG.STATS_KEY, JSON.stringify(s));
      }catch(e){}
    }

    /* -------------------------
       Notifications (ephemeral)
       ------------------------- */
    function notify(message, { type='info', timeout=4200 } = {}){
      if (!notifsRoot) return;
      const id = 'n-' + Date.now() + '-' + Math.floor(Math.random()*9999);
      const node = el('div',{id, class: 'td-notif td-notif-' + type, role:'status', 'aria-atomic': 'true'}, message);
      notifsRoot.appendChild(node);
      if (!CONFIG.REDUCED_MOTION && node.animate) {
        node.animate([{opacity:0, transform:'translateY(6px)'},{opacity:1, transform:'translateY(0)'}], {duration:220, easing:'cubic-bezier(.2,.8,.2,1)'});
      }
      if (timeout) setTimeout(()=> {
        if (!CONFIG.REDUCED_MOTION && node.animate) node.animate([{opacity:1},{opacity:0, transform:'translateY(-6px)'}],{duration:180}).onfinish = ()=> node.remove();
        else node.remove();
      }, timeout);
      return id;
    }

    /* -------------------------
       Modal helpers (accessible)
       ------------------------- */
    let releaseTrap = null;
    function trapFocus(container){
      const focusable = Array.from(container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return ()=>{};
      const first = focusable[0], last = focusable[focusable.length-1];
      function onKey(e){
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        } else if (e.key === 'Escape') {
          closeModal();
        }
      }
      container.addEventListener('keydown', onKey);
      return ()=> container.removeEventListener('keydown', onKey);
    }
    function openModal(content, { focusFirst=true } = {}){
      if (!modal) { notify(typeof content === 'string' ? content : 'Action', {type:'info'}); return; }
      modalContent.innerHTML = typeof content === 'string' ? content : '';
      if (typeof content !== 'string' && content) modalContent.appendChild(content);
      modal.setAttribute('aria-hidden','false');
      modal.style.display = 'grid';
      document.documentElement.style.overflow = 'hidden';
      releaseTrap = trapFocus(modal);
      if (focusFirst) setTimeout(()=> {
        const f = modal.querySelector('button, a, input, textarea, select');
        if (f) f.focus(); else modalClose && modalClose.focus();
      },40);
    }
    function closeModal(){
      if (!modal) return;
      modal.setAttribute('aria-hidden','true');
      modal.style.display = 'none';
      if (releaseTrap) releaseTrap();
      document.documentElement.style.overflow = '';
      modalContent.innerHTML = '';
    }
    if (modalClose) modalClose.addEventListener('click', closeModal);

    /* -------------------------
       Theme management
       ------------------------- */
    function applyTheme(theme){
      try{
        if (theme === 'light') document.documentElement.classList.add('light');
        else document.documentElement.classList.remove('light');
        localStorage.setItem(CONFIG.THEME_KEY, theme);
        if (themeIcon) themeIcon.className = theme === 'light' ? 'bx bx-sun' : 'bx bx-moon';
      }catch(e){}
    }
    function toggleTheme(){
      const current = localStorage.getItem(CONFIG.THEME_KEY) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      notify('Thème : ' + next, { type:'info', timeout:1200 });
    }
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    (function initTheme(){
      const saved = localStorage.getItem(CONFIG.THEME_KEY);
      if (saved) applyTheme(saved);
      else {
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        applyTheme(prefersLight ? 'light' : 'dark');
      }
    })();

    /* -------------------------
       Form helpers: validation, charcount
       ------------------------- */
    function updateCharCount(){
      if (!messageEl || !charCountEl) return;
      const len = messageEl.value.length;
      charCountEl.textContent = `${len} / ${CONFIG.MAX_MESSAGE_LENGTH}`;
      if (len >= CONFIG.WARNING_THRESHOLD) charCountEl.style.color = getComputedStyle(document.documentElement).getPropertyValue('--danger') || '#ff5c57';
      else charCountEl.style.color = getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#98a6a6';
    }
    if (messageEl) { messageEl.addEventListener('input', updateCharCount); updateCharCount(); }

    function isHoneypotFilled(){ try{ return honeypot && honeypot.value.trim() !== ''; }catch(e){ return false; } }
    function isValidEmail(email){ if (!email) return false; const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return re.test(String(email).toLowerCase()); }

    function validateForm(){
      const errors = [];
      if (!form) return { ok:false, errors:['Formulaire introuvable.'] };
      const name = (form.elements['name'] && form.elements['name'].value || '').trim();
      const email = (form.elements['email'] && form.elements['email'].value || '').trim();
      const service = (form.elements['service'] && form.elements['service'].value || '').trim();
      const message = (form.elements['message'] && form.elements['message'].value || '').trim();

      if (!name) errors.push('Le nom est requis.');
      if (!email) errors.push('L\'email est requis.');
      else if (!isValidEmail(email)) errors.push('L\'email semble invalide.');
      if (!service) errors.push('Choisissez le type de projet.');
      if (!message) errors.push('Le message est requis.');
      if (message.length > CONFIG.MAX_MESSAGE_LENGTH) errors.push(`Le message dépasse ${CONFIG.MAX_MESSAGE_LENGTH} caractères.`);
      return { ok: errors.length === 0, errors };
    }

    /* -------------------------
       Draft: save / load / clear
       ------------------------- */
    function saveDraft(showNotif=true){
      if (!form) return false;
      const data = {
        name: (form.elements['name'] && form.elements['name'].value) || '',
        email: (form.elements['email'] && form.elements['email'].value) || '',
        service: (form.elements['service'] && form.elements['service'].value) || '',
        budget: (form.elements['budget'] && form.elements['budget'].value) || '',
        currency: (currencySelect && currencySelect.value) || '',
        message: (form.elements['message'] && form.elements['message'].value) || '',
        savedAt: nowISO()
      };
      try{
        localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(data));
        incrStat('draftsSaved',1);
        if (showNotif) notify('📝 Brouillon enregistré localement.', {type:'success'});
        return true;
      }catch(e){
        notify('Impossible d\'enregistrer le brouillon.', {type:'error'});
        return false;
      }
    }

    function loadDraft(showNotif=true){
      try{
        const raw = localStorage.getItem(CONFIG.DRAFT_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (form){
          if (data.name) form.elements['name'].value = data.name;
          if (data.email) form.elements['email'].value = data.email;
          if (data.service) form.elements['service'].value = data.service;
          if (data.budget) form.elements['budget'].value = data.budget;
          if (data.message) form.elements['message'].value = data.message;
          if (data.currency && currencySelect) currencySelect.value = data.currency;
          updateCharCount();
        }
        if (showNotif) notify('🧾 Brouillon restauré.', {type:'info'});
        return true;
      }catch(e){ return false; }
    }

    function clearDraft(showNotif=true){
      try{
        localStorage.removeItem(CONFIG.DRAFT_KEY);
        incrStat('draftsCleared',1);
        if (showNotif) notify('Brouillon supprimé.', {type:'success'});
        return true;
      }catch(e){
        notify('Erreur lors de la suppression du brouillon.', {type:'error'});
        return false;
      }
    }

    if (saveDraftBtn) saveDraftBtn.addEventListener('click', ()=> saveDraft(true));
    if (clearDraftBtn) clearDraftBtn.addEventListener('click', ()=> { clearDraft(true); if (form){ try{ form.reset(); updateCharCount(); }catch(e){} } });

    /* autosave */
    let autosaveTimer = null;
    function startAutoSave(){
      if (autosaveTimer) return;
      autosaveTimer = setInterval(()=>{
        if (!form) return;
        const name = (form.elements['name'] && form.elements['name'].value) || '';
        const email = (form.elements['email'] && form.elements['email'].value) || '';
        const message = (form.elements['message'] && form.elements['message'].value) || '';
        if (name || email || message) saveDraft(false);
      }, CONFIG.AUTOSAVE_INTERVAL_MS);
    }
    function stopAutoSave(){ if (autosaveTimer) { clearInterval(autosaveTimer); autosaveTimer = null; } }
    startAutoSave();

    document.addEventListener('DOMContentLoaded', ()=> {
      try{
        const restored = loadDraft(false);
        if (restored) notify('Brouillon restauré depuis votre navigateur.', {type:'info', timeout:2200});
      }catch(e){}
    });

    /* Ctrl/Cmd+S shortcut to save draft */
    window.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's'){ ev.preventDefault(); saveDraft(true); }
    });

    /* -------------------------
       Copy to clipboard (buttons)
       ------------------------- */
    copyButtons.forEach(btn=>{
      btn.addEventListener('click', async (ev)=>{
        const text = btn.getAttribute('data-copy') || '';
        if (!text) return;
        try{
          await navigator.clipboard.writeText(text);
          const original = btn.textContent;
          btn.textContent = 'Copié ✓';
          setTimeout(()=> btn.textContent = original, 1400);
          notify('Copié dans le presse-papiers', {type:'success', timeout:1400});
        }catch(err){
          // fallback
          const tmp = document.createElement('textarea');
          tmp.value = text; tmp.style.position = 'fixed'; tmp.style.left = '-9999px';
          document.body.appendChild(tmp); tmp.select();
          try{ document.execCommand('copy'); notify('Copié (fallback)', {type:'success', timeout:1200}); } catch(e2) { notify('Impossible de copier automatiquement.', {type:'warn', timeout:3000}); }
          tmp.remove();
        }
      });
    });

    /* -------------------------
       Form submission (Formspree)
       ------------------------- */
    async function submitForm(e){
      e && e.preventDefault && e.preventDefault();
      if (!form) return;
      if (isHoneypotFilled()){ showFeedbackInline('Spam détecté — envoi annulé.', 'error'); return; }
      const validation = validateForm();
      if (!validation.ok){ showFeedbackInline(validation.errors.join(' '), 'error'); return; }

      if (spinner) spinner.hidden = false;
      if (submitBtn) submitBtn.disabled = true;
      showFeedbackInline('Envoi en cours…', 'info');

      const fd = new FormData(form);
      fd.append('_subject', `Nouvelle demande — ToureDev (${new Date().toLocaleString()})`);
      fd.append('sent_at', nowISO());
      fd.append('site', window.location.hostname);

      try{
        const resp = await fetch(CONFIG.FORMSPREE_ENDPOINT, { method:'POST', body: fd, headers: { Accept: 'application/json' } });
        if (resp.ok){
          // success
          showSubmissionSuccess();
          incrStat('sends',1);
          if (CONFIG.AUTO_CLEAR_AFTER_SEND) clearDraft(false);
          openModal(`<div style="display:flex;gap:12px;align-items:center;"><div class="check" aria-hidden="true"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="${getComputedStyle(document.documentElement).getPropertyValue('--success') || '#4caf50'}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><strong>Message envoyé</strong><div class="small muted">Merci — Je vous contacte sous 24h.</div></div></div>`);
          form.reset(); updateCharCount();
        } else {
          let txt = 'Erreur lors de l\'envoi. Réessayez.';
          try{ const json = await resp.json(); if (json && json.error) txt = json.error; }catch(e){}
          showFeedbackInline(txt, 'error');
        }
      }catch(err){
        showFeedbackInline('Erreur réseau — vérifiez votre connexion.', 'error');
      }finally{
        if (spinner) spinner.hidden = true;
        if (submitBtn) submitBtn.disabled = false;
      }
    }
    if (form) form.addEventListener('submit', submitForm);

    function showFeedbackInline(message, type='success'){
      if (!feedback){ notify(message, {type: type==='error' ? 'error' : 'info'}); return; }
      feedback.innerHTML = '';
      const box = el('div', { class: 'alert ' + (type === 'error' ? 'alert-error' : 'alert-success') }, message);
      feedback.appendChild(box);
      box.setAttribute('tabindex','-1');
      box.focus();
    }

    function showSubmissionSuccess(){
      showFeedbackInline('Message envoyé — merci !', 'success');
      if (!CONFIG.REDUCED_MOTION){
        const conf = el('div',{class:'td-confetti'}, '🎉');
        document.body.appendChild(conf);
        setTimeout(()=> conf.remove(), 900);
      }     
    }
    
    /* -------------------------
       Small UI helpers
       ------------------------- */
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    function updateHomeVisibility(){ if (!homeBtn) return; homeBtn.hidden = window.innerWidth > 992; }
    updateHomeVisibility(); window.addEventListener('resize', updateHomeVisibility);
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href='index.html';
        });
    }

    /* accessible details keyboard handling */
    $$('details summary').forEach(s => {
      s.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); s.parentElement.open = !s.parentElement.open; }
      });
    });

    /* startup: sample button, theme icon */
    (function startup(){
      if (sampleBtn) sampleBtn.addEventListener('click', ()=>{
        if (!form) return;
        form.elements['name'].value = 'Client Exemple';
        form.elements['email'].value = 'client@exemple.com';
        form.elements['service'].value = 'Créer un site professionnel complet';
        if (form.elements['budget']) form.elements['budget'].value = '5000';
        if (currencySelect) currencySelect.value = 'EUR';
        if (form.elements['message']) form.elements['message'].value = 'Bonjour, je souhaite un site avec prise de RDV et espace client.';
        updateCharCount();
        notify('Exemple pré-rempli — modifiez avant envoi.', {type:'info'});
      });

      const currentTheme = localStorage.getItem(CONFIG.THEME_KEY) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      if (themeIcon) themeIcon.className = currentTheme === 'light' ? 'bx bx-sun' : 'bx bx-moon';
    })();

    /* expose small API for debugging in console */
    window.touredevContact = { saveDraft, loadDraft, clearDraft, submitForm, notify, openModal, closeModal, stats: ()=> JSON.parse(localStorage.getItem(CONFIG.STATS_KEY) || '{}') };

    /* inject minimal styles for notifications and basic alerts */
    (function injectStyles(){
      if ($('#td-notifs-style')) return;
      const s = el('style', { id: 'td-notifs-style' }, `
        #td-notifs { position: fixed; right: 18px; top: 18px; z-index: 1400; display:flex; flex-direction:column; gap:8px; }
        .td-notif { min-width: 160px; max-width: 320px; padding:10px 12px; border-radius:10px; color:#021212; font-weight:700; box-shadow:0 6px 22px rgba(0,0,0,0.4); }
        .td-notif-info { background: rgba(255,255,255,0.02); color: var(--text); }
        .td-notif-success { background: linear-gradient(90deg,var(--accent-400),var(--accent)); color:#051012; }
        .td-notif-error { background: rgba(255,82,82,0.92); color:#fff; }
        .td-confetti { position:fixed; left:50%; top:20%; transform:translateX(-50%); pointer-events:none; z-index:1500; font-size:26px; }
        .alert { padding: 0.6rem 0.9rem; border-radius:8px; }
        .alert-info { background: rgba(255,255,255,0.02); color: var(--text); border:1px solid rgba(255,255,255,0.02); }
        .alert-success { background: rgba(76,175,80,0.06); color: var(--success); border:1px solid rgba(76,175,80,0.04); }
        .alert-error { background: rgba(255,82,82,0.06); color: var(--danger); border:1px solid rgba(255,82,82,0.05); }
      `);
      document.head.appendChild(s);
    })();

})();