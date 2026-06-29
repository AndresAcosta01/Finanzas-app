"use strict";

/* ----------------------------------------------------------------
 * 18) MÓDULO: DASHBOARD
 * ---------------------------------------------------------------- */
const Dashboard = {
  tab: 'principal',

  render() {
    const tabs = [
      { id: 'principal', label: 'Principal', icon: 'fa-gauge-high' },
      { id: 'credito', label: 'Tarjetas crédito', icon: 'fa-credit-card' },
      { id: 'debito', label: 'Tarjetas débito', icon: 'fa-money-check' },
      { id: 'efectivo', label: 'Efectivo', icon: 'fa-money-bill-wave' },
    ];
    const tabBar = `<div class="flex flex-wrap gap-2 surface rounded-2xl p-1.5">
      ${tabs.map(t => `<button onclick="Dashboard.setTab('${t.id}')" data-tab="${t.id}"
        class="dash-tab flex-1 min-w-[120px] flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${this.tab === t.id ? 'bg-brand-600 text-white shadow-soft' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}">
        <i class="fa-solid ${t.icon}"></i> ${t.label}</button>`).join('')}
    </div>`;
    return `<div class="view space-y-6">${tabBar}<div id="dash-body">${this.body()}</div></div>`;
  },

  setTab(t) {
    this.tab = t;
    Charts.destroyAll();
    $$('.dash-tab').forEach(b => {
      const active = b.dataset.tab === t;
      b.className = 'dash-tab flex-1 min-w-[120px] flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ' +
        (active ? 'bg-brand-600 text-white shadow-soft' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800');
    });
    $('#dash-body').innerHTML = this.body();
    this.mount();
  },

  body() {
    if (this.tab === 'credito') return this.creditBody();
    if (this.tab === 'debito') return this.debitBody();
    if (this.tab === 'efectivo') return this.cashBody();
    return this.principalBody();
  },

  /* ---------------- PRINCIPAL ---------------- */
  principalBody() {
    const mk = Utils.monthKey(Utils.todayStr());
    const flow = Engine.monthFlow(mk);
    const debt = Engine.totalDebt();
    const debitAvail = Engine.methodNet('debito');
    const cashAvail = Engine.methodNet('efectivo');
    const nextPay = Engine.nextPayment();
    const budgets = Repos.budgets.all();
    const budgetLimit = Utils.sum(budgets, b => b.limit);
    const budgetSpent = Utils.sum(budgets.map(b => Engine.budgetStatus(b, mk).spent));

    return `
      <div class="space-y-6">
        <div class="grid md:grid-cols-2 gap-5">
          <div class="rounded-3xl bg-gradient-to-br from-rose-600 to-rose-800 text-white p-6 shadow-card relative overflow-hidden">
            <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <p class="text-white/80 text-sm flex items-center gap-2"><i class="fa-solid fa-hand-holding-dollar"></i> Deuda total a la fecha</p>
            <p class="text-4xl font-extrabold mt-1">${Utils.money(debt)}</p>
            <p class="text-white/70 text-sm mt-2">${nextPay ? 'Próximo pago: ' + Utils.money(nextPay.amount) + ' · ' + Utils.fmtDate(nextPay.date) : 'Sin pagos pendientes'}</p>
          </div>
          <div class="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 shadow-card relative overflow-hidden">
            <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <p class="text-white/80 text-sm flex items-center gap-2"><i class="fa-solid fa-money-check"></i> Dinero disponible en débito</p>
            <p class="text-4xl font-extrabold mt-1">${Utils.money(debitAvail)}</p>
            <p class="text-white/70 text-sm mt-2">Efectivo disponible: ${Utils.money(cashAvail)}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${UI.kpi({ label: 'Ingresos del mes', value: Utils.money(flow.income), icon: 'fa-arrow-trend-up', color: 'emerald' })}
          ${UI.kpi({ label: 'Gastos del mes', value: Utils.money(flow.outflow), icon: 'fa-arrow-trend-down', color: 'rose' })}
          ${UI.kpi({ label: 'Flujo de caja', value: Utils.money(flow.net), icon: 'fa-scale-balanced', color: flow.net >= 0 ? 'emerald' : 'amber' })}
          ${UI.kpi({ label: 'Presupuesto', value: budgetLimit ? Utils.pct(budgetSpent/budgetLimit*100) : '—', icon: 'fa-wallet', color: 'brand', sub: budgetLimit ? Utils.money(budgetSpent) + ' / ' + Utils.money(budgetLimit) : 'Sin presupuestos' })}
        </div>

        <div class="grid lg:grid-cols-3 gap-5">
          <div class="surface rounded-2xl p-5 shadow-soft lg:col-span-2">
            <h3 class="font-semibold mb-4">Ingresos vs Gastos (6 meses)</h3>
            <canvas id="chart-flow" height="120"></canvas>
          </div>
          <div class="surface rounded-2xl p-5 shadow-soft">
            <h3 class="font-semibold mb-4">Gastos por categoría</h3>
            <canvas id="chart-cat" height="200"></canvas>
          </div>
          <div class="surface rounded-2xl p-5 shadow-soft lg:col-span-2">
            <h3 class="font-semibold mb-4">Evolución de la deuda (cuotas por mes)</h3>
            <canvas id="chart-debt" height="120"></canvas>
          </div>
          <div class="surface rounded-2xl p-5 shadow-soft">
            <h3 class="font-semibold mb-4">Uso de tarjetas</h3>
            <canvas id="chart-cards" height="200"></canvas>
          </div>
        </div>

        <div class="surface rounded-2xl p-5 shadow-soft">
          <h3 class="font-semibold mb-3 flex items-center gap-2"><i class="fa-solid fa-robot text-brand-500"></i> Asistente financiero</h3>
          ${Insights.cardHTML(Insights.generate())}
        </div>
      </div>`;
  },

  /* ---------------- CRÉDITO (individual por tarjeta) ---------------- */
  creditBody() {
    const cards = Repos.cards.where(c => c.type === 'credito');
    if (!cards.length) return UI.empty('No tienes tarjetas de crédito.', 'fa-credit-card', `<button onclick="Router.go('cards')" class="rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-semibold">Agregar tarjeta</button>`);
    const totalCupo = Utils.sum(cards, c => Number(c.cupoTotal) || 0);
    const used = Utils.sum(cards.map(c => Engine.cardUsage(c).used));
    const debt = Utils.sum(cards.map(c => Engine.cardDebt(c)));
    const today = Utils.todayStr();

    return `
      <div class="space-y-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${UI.kpi({ label: 'Deuda total crédito', value: Utils.money(debt), icon: 'fa-hand-holding-dollar', color: 'rose' })}
          ${UI.kpi({ label: 'Cupo total', value: Utils.money(totalCupo), icon: 'fa-gauge-high', color: 'brand' })}
          ${UI.kpi({ label: 'Cupo utilizado', value: Utils.money(used), icon: 'fa-fire', color: 'amber', sub: totalCupo ? Utils.pct(used/totalCupo*100) : '' })}
          ${UI.kpi({ label: 'Disponible', value: Utils.money(totalCupo - used), icon: 'fa-circle-check', color: 'emerald' })}
        </div>
        ${cards.map(c => {
          const u = Engine.cardUsage(c);
          const d = Engine.cardDebt(c);
          const np = Engine.cardNextPayment(c);
          const cut = c.cutDay ? Engine.billingDates(c, today).cut : null;
          return `<div class="surface rounded-2xl p-5 shadow-soft">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl grid place-items-center bg-brand-100 text-brand-600 dark:bg-brand-500/15"><i class="fa-solid fa-credit-card"></i></div>
                <div><h3 class="font-bold">${Utils.escape(c.name)}</h3><p class="text-xs text-slate-500">${Utils.escape(c.bank)} ····${c.last4||''}</p></div>
              </div>
              <button onclick="Cards.openDetail('${c.id}')" class="text-xs font-semibold text-brand-600 hover:underline">Ver más</button>
            </div>
            <div class="grid sm:grid-cols-2 gap-5 items-center">
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div><p class="text-slate-500 text-xs">Deuda</p><p class="font-bold text-rose-500">${Utils.money(d)}</p></div>
                <div><p class="text-slate-500 text-xs">Uso del cupo</p><p class="font-bold">${Utils.pct(u.pct)}</p></div>
                <div><p class="text-slate-500 text-xs"><i class="fa-solid fa-scissors"></i> Fecha de corte</p><p class="font-bold">${cut ? Utils.fmtDate(cut) : '—'}</p></div>
                <div><p class="text-slate-500 text-xs"><i class="fa-regular fa-calendar-check"></i> Próximo pago</p><p class="font-bold text-amber-600">${np ? Utils.fmtDate(np.date) : '—'}</p></div>
                <div class="col-span-2">${UI.progress(u.pct, u.pct > 80 ? 'rose' : 'brand')}</div>
              </div>
              <div><canvas id="dash-credit-${c.id}" height="120"></canvas></div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  },

  /* ---------------- DÉBITO (individual por tarjeta) ---------------- */
  debitBody() {
    const cards = Repos.cards.where(c => c.type === 'debito');
    if (!cards.length) return UI.empty('No tienes tarjetas de débito.', 'fa-money-check', `<button onclick="Router.go('cards')" class="rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-semibold">Agregar tarjeta</button>`);
    const totalNet = Engine.methodNet('debito');

    return `
      <div class="space-y-6">
        <div class="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 shadow-card">
          <p class="text-white/80 text-sm">Dinero disponible total en débito</p>
          <p class="text-4xl font-extrabold mt-1">${Utils.money(totalNet)}</p>
        </div>
        ${cards.map(c => {
          const t = Engine.cardTotals(c);
          return `<div class="surface rounded-2xl p-5 shadow-soft">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl grid place-items-center bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"><i class="fa-solid fa-money-check"></i></div>
                <div><h3 class="font-bold">${Utils.escape(c.name)}</h3><p class="text-xs text-slate-500">${Utils.escape(c.bank)} ····${c.last4||''}</p></div>
              </div>
              <button onclick="Cards.openDetail('${c.id}')" class="text-xs font-semibold text-brand-600 hover:underline">Ver más</button>
            </div>
            <div class="grid sm:grid-cols-2 gap-5 items-center">
              <div class="grid grid-cols-3 gap-3 text-sm">
                <div><p class="text-slate-500 text-xs">Ingresos</p><p class="font-bold text-emerald-500">${Utils.money(t.income)}</p></div>
                <div><p class="text-slate-500 text-xs">Egresos</p><p class="font-bold text-rose-500">${Utils.money(t.outflow)}</p></div>
                <div><p class="text-slate-500 text-xs">Disponible</p><p class="font-bold">${Utils.money(t.income - t.outflow)}</p></div>
              </div>
              <div><canvas id="dash-debit-${c.id}" height="120"></canvas></div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  },

  /* ---------------- EFECTIVO ---------------- */
  cashBody() {
    const exps = Repos.expenses.where(e => e.method === 'efectivo');
    const income = Utils.sum(exps.filter(e => e.type === 'ingreso'), e => e.amount);
    const outflow = Utils.sum(exps.filter(e => e.type !== 'ingreso'), e => e.amount);
    return `
      <div class="space-y-6">
        <div class="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 text-white p-6 shadow-card">
          <p class="text-white/80 text-sm flex items-center gap-2"><i class="fa-solid fa-money-bill-wave"></i> Efectivo disponible</p>
          <p class="text-4xl font-extrabold mt-1">${Utils.money(income - outflow)}</p>
        </div>
        <div class="grid grid-cols-3 gap-4">
          ${UI.kpi({ label: 'Ingresos en efectivo', value: Utils.money(income), icon: 'fa-arrow-trend-up', color: 'emerald' })}
          ${UI.kpi({ label: 'Egresos en efectivo', value: Utils.money(outflow), icon: 'fa-arrow-trend-down', color: 'rose' })}
          ${UI.kpi({ label: 'Movimientos', value: exps.length, icon: 'fa-receipt', color: 'brand' })}
        </div>
        <div class="surface rounded-2xl p-5 shadow-soft">
          <h3 class="font-semibold mb-4">Ingresos vs egresos en efectivo (6 meses)</h3>
          <canvas id="dash-cash" height="110"></canvas>
        </div>
      </div>`;
  },

  /* ---------------- CHARTS ---------------- */
  mount() {
    if (!window.Chart) return;
    const months = Charts.lastMonths(6);
    const labels = months.map(Charts.monthLabel);

    if (this.tab === 'principal') {
      Charts.make('chart-flow', {
        type: 'bar',
        data: { labels, datasets: [
          { label: 'Ingresos', data: months.map(m => Engine.monthFlow(m).income), backgroundColor: '#10b981', borderRadius: 6 },
          { label: 'Gastos', data: months.map(m => Engine.monthFlow(m).outflow), backgroundColor: '#2563eb', borderRadius: 6 },
        ]},
        options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: Charts.gridColor() }, ticks: { callback: v => Utils.number(v) } } } },
      });
      const mk = Utils.monthKey(Utils.todayStr());
      const catMap = {};
      Repos.expenses.where(e => e.type !== 'ingreso' && Utils.monthKey(e.date) === mk).forEach(e => catMap[e.category] = (catMap[e.category]||0) + e.amount);
      Charts.make('chart-cat', {
        type: 'doughnut',
        data: { labels: Object.keys(catMap).length ? Object.keys(catMap) : ['Sin datos'], datasets: [{ data: Object.values(catMap).length ? Object.values(catMap) : [1], backgroundColor: Charts.palette, borderWidth: 0 }] },
        options: { cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } },
      });
      const debtData = months.map(m => { let total = 0; Repos.expenses.where(e => e.method === 'credito' && e.installments).forEach(e => (e.installments||[]).forEach(c => { if (c.dueDate.slice(0,7) === m) total += c.value; })); return total; });
      Charts.make('chart-debt', {
        type: 'line',
        data: { labels, datasets: [{ label: 'Cuotas', data: debtData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.15)', fill: true, tension: .35 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: Charts.gridColor() }, ticks: { callback: v => Utils.number(v) } } } },
      });
      const cc = Repos.cards.where(c => c.type === 'credito');
      Charts.make('chart-cards', {
        type: 'bar',
        data: { labels: cc.length ? cc.map(c => c.name) : ['Sin tarjetas'], datasets: [{ label: '% uso', data: cc.length ? cc.map(c => Engine.cardUsage(c).pct.toFixed(1)) : [0], backgroundColor: cc.map((_,i)=>Charts.palette[i%Charts.palette.length]), borderRadius: 6 }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100, grid: { color: Charts.gridColor() } }, y: { grid: { display: false } } } },
      });
    } else if (this.tab === 'credito') {
      Repos.cards.where(c => c.type === 'credito').forEach(c => {
        Charts.make(`dash-credit-${c.id}`, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Cuotas a pagar', data: Engine.cardMonthlyInstallments(c, months), backgroundColor: '#2563eb', borderRadius: 6 }] },
          options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: Charts.gridColor() }, ticks: { callback: v => Utils.number(v) } } } },
        });
      });
    } else if (this.tab === 'debito') {
      Repos.cards.where(c => c.type === 'debito').forEach(c => {
        const fl = Engine.cardFlow(c, months);
        Charts.make(`dash-debit-${c.id}`, {
          type: 'bar',
          data: { labels, datasets: [
            { label: 'Ingresos', data: fl.map(x => x.income), backgroundColor: '#10b981', borderRadius: 6 },
            { label: 'Egresos', data: fl.map(x => x.outflow), backgroundColor: '#2563eb', borderRadius: 6 },
          ]},
          options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: Charts.gridColor() }, ticks: { callback: v => Utils.number(v) } } } },
        });
      });
    } else if (this.tab === 'efectivo') {
      const fl = Engine.methodFlow('efectivo', months);
      Charts.make('dash-cash', {
        type: 'bar',
        data: { labels, datasets: [
          { label: 'Ingresos', data: fl.map(x => x.income), backgroundColor: '#10b981', borderRadius: 6 },
          { label: 'Egresos', data: fl.map(x => x.outflow), backgroundColor: '#f59e0b', borderRadius: 6 },
        ]},
        options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: Charts.gridColor() }, ticks: { callback: v => Utils.number(v) } } } },
      });
    }
  },
};
