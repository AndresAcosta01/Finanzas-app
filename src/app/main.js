"use strict";

/* ----------------------------------------------------------------
 * 26) APP — inicialización, sesión y eventos globales
 * ---------------------------------------------------------------- */
const App = {
  buildNav() {
    $('#nav-menu').innerHTML = NAV.map(n => `
      <a href="#" data-view="${n.id}" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
        <i class="fa-solid ${n.icon} w-5 text-center text-slate-400"></i> ${n.label}
      </a>`).join('');
    $$('#nav-menu .nav-link').forEach(a => a.addEventListener('click', e => { e.preventDefault(); Router.go(a.dataset.view); }));

    const u = State.user;
    $('#sidebar-user').innerHTML = `
      <div class="w-10 h-10 rounded-xl bg-brand-600 text-white grid place-items-center font-bold">${(u.name||u.email)[0].toUpperCase()}</div>
      <div class="flex-1 min-w-0"><p class="font-semibold text-sm truncate">${Utils.escape(u.name)}</p><p class="text-xs text-slate-500 truncate">${Utils.escape(u.email)}</p></div>
      <button id="btn-logout" class="w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500" title="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i></button>`;
    $('#btn-logout').addEventListener('click', async () => { if (await Utils.confirm('¿Cerrar sesión?', '', 'Salir')) Auth.logout(); });
  },

  openSidebar() { $('#sidebar').classList.remove('-translate-x-full'); $('#sidebar-overlay').classList.remove('hidden'); },
  closeSidebar() { $('#sidebar').classList.add('-translate-x-full'); $('#sidebar-overlay').classList.add('hidden'); },

  enter() {
    $('#auth-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    this.buildNav();
    Recurring.autoGenerate();      // genera recurrentes del mes si faltan
    Router.go('dashboard');
    Notifications.refresh();
  },

  wireAuth() {
    // toggles login/registro
    $('#link-to-register').addEventListener('click', () => { $('#form-login').classList.add('hidden'); $('#form-register').classList.remove('hidden'); });
    $('#link-to-login').addEventListener('click', () => { $('#form-register').classList.add('hidden'); $('#form-login').classList.remove('hidden'); });

    // mostrar/ocultar contraseña
    $$('[data-toggle-pass]').forEach(b => b.addEventListener('click', () => { const inp = b.previousElementSibling; inp.type = inp.type === 'password' ? 'text' : 'password'; b.querySelector('i').className = inp.type === 'password' ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash'; }));

    // login
    $('#form-login').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      try { await Auth.login(f.email.value, f.password.value); App.enter(); Utils.toast('Bienvenido ' + (State.user.name||'')); }
      catch (err) { Utils.toast(err.message, 'error'); }
    });

    // registro
    $('#form-register').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      try { const u = await Auth.register({ name: f.name.value, email: f.email.value, password: f.password.value }); await Auth.login(u.email, f.password.value); App.enter(); Utils.toast('Cuenta creada'); }
      catch (err) { Utils.toast(err.message, 'error'); }
    });

    // recuperación simulada
    $('#link-forgot').addEventListener('click', async () => {
      if (!window.Swal) return alert('Recuperación simulada: contacta al admin.');
      const { value: email } = await Swal.fire({ title: 'Recuperar contraseña', input: 'email', inputPlaceholder: 'Tu correo', showCancelButton: true, confirmButtonColor: '#0370d4', background: UI.isDark()?'#0f172a':'#fff', color: UI.isDark()?'#e2e8f0':'#0f172a' });
      if (!email) return;
      const exists = await Auth.forgot(email);
      if (!exists) return Utils.toast('Correo no registrado', 'error');
      const { value: pass } = await Swal.fire({ title: 'Nueva contraseña', input: 'password', inputPlaceholder: 'Define una nueva', showCancelButton: true, confirmButtonColor: '#0370d4', background: UI.isDark()?'#0f172a':'#fff', color: UI.isDark()?'#e2e8f0':'#0f172a' });
      if (!pass) return;
      await Auth.resetPassword(email, pass);
      Utils.toast('Contraseña actualizada, ya puedes ingresar');
    });
  },

  wireTopbar() {
    $('#btn-theme').addEventListener('click', () => UI.toggleTheme());
    $('#btn-menu').addEventListener('click', () => App.openSidebar());
    $('#sidebar-overlay').addEventListener('click', () => App.closeSidebar());
    $('#btn-quick-add').addEventListener('click', () => Expenses.openForm());
    $('#btn-notifications').addEventListener('click', (e) => { e.stopPropagation(); Notifications.toggle(); });
    document.addEventListener('click', (e) => { const p = $('#notif-panel'); if (p && !p.classList.contains('hidden') && !p.contains(e.target) && !e.target.closest('#btn-notifications')) p.classList.add('hidden'); });
    $('#global-search-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { State.searchQuery = e.target.value; Router.go('search'); } });
  },

  async init() {
    $('#footer-year').textContent = new Date().getFullYear();
    UI.initTheme();
    this.wireAuth();
    this.wireTopbar();
    await Auth.seedAdmin();
    if (Auth.restore()) this.enter();
  },
};

/* Exponer módulos al ámbito global para los manejadores inline (onclick, etc.) */
Object.assign(window, {
  CONFIG, Utils, Storage, Repository, Repos, Audit, State, UI, Auth, Engine,
  Cards, Rates, Expenses, Payments, Budgets, Goals, Recurring,
  Charts, Insights, Dashboard, Reports, Calendar, Search, Backup, Settings,
  Notifications, NAV, Router, App,
});

/* Arranque */
document.addEventListener('DOMContentLoaded', () => App.init());
