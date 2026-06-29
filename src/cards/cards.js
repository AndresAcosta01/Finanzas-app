"use strict";

/* ----------------------------------------------------------------
 * 9) MÓDULO: TARJETAS (crédito / débito) con diseño visual
 * ---------------------------------------------------------------- */
const CARD_THEMES = {
  indigo:  ['#4f46e5', '#7c3aed'],
  ocean:   ['#0ea5e9', '#0370d4'],
  emerald: ['#059669', '#0d9488'],
  sunset:  ['#f97316', '#db2777'],
  rose:    ['#e11d48', '#9f1239'],
  graphite:['#334155', '#0f172a'],
  gold:    ['#b45309', '#92400e'],
  purple:  ['#7e22ce', '#4338ca'],
};
const BRAND_ICON = { visa: 'fa-cc-visa', mastercard: 'fa-cc-mastercard', amex: 'fa-cc-amex' };

const Cards = {
  bankCardHTML(card, { big = true } = {}) {
    const [c1, c2] = CARD_THEMES[card.color] || CARD_THEMES.indigo;
    const usage = Engine.cardUsage(card);
    const brandIcon = BRAND_ICON[card.brand] || 'fa-credit-card';
    const isCredit = card.type === 'credito';
    return `
      <div class="bank-card card-stripe ${big ? '' : 'text-sm'}" style="background:linear-gradient(135deg,${c1},${c2})" data-card="${card.id}">
        <div class="relative z-10 h-full p-5 flex flex-col justify-between">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs/none uppercase tracking-widest opacity-80">${Utils.escape(card.bank)}</p>
              <p class="font-semibold mt-1">${Utils.escape(card.name || '')}</p>
            </div>
            <i class="fa-brands ${brandIcon} text-3xl opacity-90"></i>
          </div>
          <div class="chip"></div>
          <div>
            <p class="font-mono tracking-[0.25em] text-lg">•••• •••• •••• ${Utils.escape(card.last4 || '0000')}</p>
            <div class="flex items-end justify-between mt-3 text-xs">
              <div>
                <p class="opacity-70">${isCredit ? 'Corte' : 'Tipo'}</p>
                <p class="font-semibold">${isCredit ? 'día ' + (card.cutDay || '—') : 'Débito'}</p>
              </div>
              <div>
                <p class="opacity-70">${isCredit ? 'Pago' : 'Estado'}</p>
                <p class="font-semibold">${isCredit ? 'día ' + (card.payDay || '—') : (card.status || 'activa')}</p>
              </div>
              <div class="text-right">
                <p class="opacity-70">${isCredit ? 'Cupo usado' : 'Banco'}</p>
                <p class="font-semibold">${isCredit ? Utils.pct(usage.pct) : ''}</p>
              </div>
            </div>
            ${isCredit ? `<div class="mt-2 h-1.5 w-full rounded-full bg-white/25 overflow-hidden"><div class="h-full rounded-full bg-white" style="width:${Utils.clamp(usage.pct,0,100)}%"></div></div>` : ''}
          </div>
        </div>
      </div>`;
  },

  render() {
    const cards = Repos.cards.all();
    const credit = cards.filter(c => c.type === 'credito');
    const debit = cards.filter(c => c.type === 'debito');
    const totalCupo = Utils.sum(credit, c => Number(c.cupoTotal) || 0);
    const used = Utils.sum(credit.map(c => Engine.cardUsage(c).used));
    const totalDebt = Utils.sum(credit.map(c => Engine.cardDebt(c)));
    const today = Utils.todayStr();

    const actions = (c) => `<div class="flex gap-1">
        <button onclick="event.stopPropagation();Cards.openForm('${c.id}')" class="w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><i class="fa-solid fa-pen text-xs"></i></button>
        <button onclick="event.stopPropagation();Cards.remove('${c.id}')" class="w-8 h-8 grid place-items-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500"><i class="fa-solid fa-trash text-xs"></i></button>
      </div>`;

    const creditTile = (c) => {
      const debt = Engine.cardDebt(c);
      const np = Engine.cardNextPayment(c);
      const cut = c.cutDay ? Engine.billingDates(c, today).cut : null;
      return `<div class="space-y-3">
        <div class="cursor-pointer" onclick="Cards.openDetail('${c.id}')">${this.bankCardHTML(c)}</div>
        <div class="grid grid-cols-3 gap-2 text-center text-xs surface rounded-xl p-2.5">
          <div><p class="text-slate-500">Deuda</p><p class="font-bold ${debt>0?'text-rose-500':''}">${Utils.money(debt)}</p></div>
          <div><p class="text-slate-500">Próx. pago</p><p class="font-bold">${np ? Utils.fmtDateShort(np.date) : '—'}</p></div>
          <div><p class="text-slate-500">Corte</p><p class="font-bold">${cut ? Utils.fmtDateShort(cut) : '—'}</p></div>
        </div>
        <div class="flex items-center justify-between px-1">
          <button onclick="Cards.openDetail('${c.id}')" class="text-xs font-semibold text-brand-600 hover:underline"><i class="fa-solid fa-chart-line"></i> Ver detalles y gráficas</button>
          ${actions(c)}
        </div>
      </div>`;
    };

    const debitTile = (c) => {
      const t = Engine.cardTotals(c);
      return `<div class="space-y-3">
        <div class="cursor-pointer" onclick="Cards.openDetail('${c.id}')">${this.bankCardHTML(c)}</div>
        <div class="grid grid-cols-3 gap-2 text-center text-xs surface rounded-xl p-2.5">
          <div><p class="text-slate-500">Ingresos</p><p class="font-bold text-emerald-500">${Utils.money(t.income)}</p></div>
          <div><p class="text-slate-500">Egresos</p><p class="font-bold text-rose-500">${Utils.money(t.outflow)}</p></div>
          <div><p class="text-slate-500">Movs.</p><p class="font-bold">${t.count}</p></div>
        </div>
        <div class="flex items-center justify-between px-1">
          <button onclick="Cards.openDetail('${c.id}')" class="text-xs font-semibold text-brand-600 hover:underline"><i class="fa-solid fa-chart-line"></i> Ver detalles y gráficas</button>
          ${actions(c)}
        </div>
      </div>`;
    };

    return `
      <div class="view space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold">Mis tarjetas</h2>
            <p class="text-sm text-slate-500">Cada tarjeta tiene sus propias fechas, deuda y gráficas. Haz clic en una para ver el detalle.</p>
          </div>
          <button onclick="Cards.openForm()" class="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 shadow-soft"><i class="fa-solid fa-plus"></i> Agregar tarjeta</button>
        </div>

        ${cards.length === 0
          ? UI.empty('Aún no tienes tarjetas registradas.', 'fa-credit-card', `<button onclick="Cards.openForm()" class="rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-semibold">Agregar mi primera tarjeta</button>`)
          : `
          <!-- ===== TARJETAS DE CRÉDITO ===== -->
          <section class="space-y-4">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold flex items-center gap-2"><i class="fa-solid fa-credit-card text-brand-500"></i> Tarjetas de crédito</h3>
              ${UI.badge(credit.length + (credit.length === 1 ? ' tarjeta' : ' tarjetas'), 'brand')}
            </div>
            ${credit.length ? `
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                ${UI.kpi({ label: 'Cupo total', value: Utils.money(totalCupo), icon: 'fa-gauge-high', color: 'brand' })}
                ${UI.kpi({ label: 'Cupo utilizado', value: Utils.money(used), icon: 'fa-fire', color: 'amber', sub: totalCupo ? Utils.pct(used/totalCupo*100) + ' del total' : '' })}
                ${UI.kpi({ label: 'Deuda total (crédito)', value: Utils.money(totalDebt), icon: 'fa-hand-holding-dollar', color: 'rose' })}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">${credit.map(creditTile).join('')}</div>
            ` : `<p class="text-sm text-slate-400">No tienes tarjetas de crédito. <button onclick="Cards.openForm()" class="text-brand-600 font-semibold hover:underline">Agregar una</button></p>`}
          </section>

          <!-- ===== TARJETAS DE DÉBITO ===== -->
          <section class="space-y-4 pt-2">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold flex items-center gap-2"><i class="fa-solid fa-money-check text-emerald-500"></i> Tarjetas de débito</h3>
              ${UI.badge(debit.length + (debit.length === 1 ? ' tarjeta' : ' tarjetas'), 'emerald')}
            </div>
            ${debit.length ? `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">${debit.map(debitTile).join('')}</div>`
              : `<p class="text-sm text-slate-400">No tienes tarjetas de débito. <button onclick="Cards.openForm()" class="text-brand-600 font-semibold hover:underline">Agregar una</button></p>`}
          </section>`}
      </div>`;
  },

  openForm(id = null) {
    const card = id ? Repos.cards.find(id) : {};
    const isEdit = !!id;
    const colorOpts = Object.keys(CARD_THEMES).map(k => `<button type="button" data-color="${k}" class="color-swatch w-9 h-9 rounded-lg border-2 ${card.color === k ? 'border-brand-500 scale-110' : 'border-transparent'}" style="background:linear-gradient(135deg,${CARD_THEMES[k][0]},${CARD_THEMES[k][1]})"></button>`).join('');
    UI.modal({
      title: isEdit ? 'Editar tarjeta' : 'Nueva tarjeta',
      size: 'max-w-2xl',
      body: `
        <form id="card-form" class="space-y-4">
          <div class="grid sm:grid-cols-2 gap-4">
            ${UI.field('Banco', UI.select('bank', CONFIG.banks, card.bank || 'Bancolombia'))}
            ${UI.field('Nombre / alias', UI.input('name', { value: card.name || '', placeholder: 'Ej: Visa Personal', required: true }))}
            ${UI.field('Tipo', UI.select('type', [{value:'credito',label:'Crédito'},{value:'debito',label:'Débito'}], card.type || 'credito', 'onchange="Cards.toggleCreditFields(this.form)"'))}
            ${UI.field('Franquicia', UI.select('brand', [{value:'visa',label:'Visa'},{value:'mastercard',label:'Mastercard'},{value:'amex',label:'Amex'}], card.brand || 'visa'))}
            ${UI.field('Últimos 4 dígitos', UI.input('last4', { value: card.last4 || '', placeholder: '1234', extra: 'maxlength=4 inputmode=numeric' }))}
            ${UI.field('Estado', UI.select('status', ['activa','bloqueada','vencida'], card.status || 'activa'))}
          </div>
          <div class="credit-fields grid sm:grid-cols-3 gap-4 ${card.type === 'debito' ? 'hidden' : ''}">
            ${UI.field('Cupo total', UI.input('cupoTotal', { type: 'number', value: card.cupoTotal || '', placeholder: '0', min: 0 }))}
            ${UI.field('Día de corte', UI.input('cutDay', { type: 'number', value: card.cutDay || '', placeholder: '1-31', min: 1, extra: 'max=31' }))}
            ${UI.field('Día de pago', UI.input('payDay', { type: 'number', value: card.payDay || '', placeholder: '1-31', min: 1, extra: 'max=31' }))}
          </div>
          <div>
            <span class="text-sm font-medium">Color de la tarjeta</span>
            <div class="mt-2 flex flex-wrap gap-2" id="color-picker">${colorOpts}</div>
            <input type="hidden" name="color" value="${card.color || 'indigo'}" />
          </div>
          ${UI.field('Notas', UI.textarea('notes', card.notes || '', 'Notas opcionales...'))}
        </form>`,
      footer: `
        <button data-close class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
        <button onclick="Cards.save('${id || ''}')" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold">${isEdit ? 'Guardar cambios' : 'Crear tarjeta'}</button>`,
      onMount(wrap) {
        $('#color-picker', wrap).addEventListener('click', (e) => {
          const b = e.target.closest('[data-color]'); if (!b) return;
          $$('.color-swatch', wrap).forEach(s => s.classList.remove('border-brand-500', 'scale-110'));
          b.classList.add('border-brand-500', 'scale-110');
          $('input[name=color]', wrap).value = b.dataset.color;
        });
      },
    });
  },

  toggleCreditFields(form) {
    const isCredit = form.type.value === 'credito';
    form.closest('form').querySelector('.credit-fields')?.classList.toggle('hidden', !isCredit);
  },

  save(id) {
    const f = $('#card-form');
    const data = {
      bank: f.bank.value, name: f.name.value.trim(), type: f.type.value, brand: f.brand.value,
      last4: f.last4.value.replace(/\D/g, '').slice(-4), status: f.status.value,
      cupoTotal: Number(f.cupoTotal.value) || 0, cutDay: Number(f.cutDay.value) || null,
      payDay: Number(f.payDay.value) || null, color: f.color.value, notes: f.notes.value.trim(),
    };
    if (!data.name) return Utils.toast('El nombre es obligatorio', 'error');
    if (id) { Repos.cards.update(id, data); Utils.toast('Tarjeta actualizada'); }
    else { Repos.cards.insert(data); Utils.toast('Tarjeta creada'); }
    UI.closeModal(); Router.go('cards');
  },

  async remove(id) {
    const c = Repos.cards.find(id);
    if (await Utils.confirm('¿Eliminar tarjeta?', `Se eliminará "${c?.name}". Los gastos asociados se conservarán.`, 'Eliminar')) {
      Repos.cards.remove(id); Utils.toast('Tarjeta eliminada'); Router.go('cards');
    }
  },

  openDetail(id) {
    const c = Repos.cards.find(id); if (!c) return;
    const usage = Engine.cardUsage(c);
    const movements = Repos.expenses.where(e => e.cardId === id).sort((a, b) => b.date.localeCompare(a.date));
    const isCredit = c.type === 'credito';
    const dates = isCredit ? Engine.billingDates(c, Utils.todayStr()) : null;
    const debt = isCredit ? Engine.cardDebt(c) : 0;
    const np = isCredit ? Engine.cardNextPayment(c) : null;
    const totals = Engine.cardTotals(c);

    const creditStats = `
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="surface rounded-xl p-3"><p class="text-slate-500 text-xs">Cupo total</p><p class="font-bold">${Utils.money(usage.total)}</p></div>
        <div class="surface rounded-xl p-3"><p class="text-slate-500 text-xs">Disponible</p><p class="font-bold text-emerald-500">${Utils.money(usage.available)}</p></div>
        <div class="surface rounded-xl p-3"><p class="text-slate-500 text-xs">Deuda actual</p><p class="font-bold text-rose-500">${Utils.money(debt)}</p></div>
        <div class="surface rounded-xl p-3"><p class="text-slate-500 text-xs">Uso del cupo</p><p class="font-bold">${Utils.pct(usage.pct)}</p></div>
        <div class="surface rounded-xl p-3"><p class="text-slate-500 text-xs"><i class="fa-solid fa-scissors"></i> Próximo corte</p><p class="font-bold">${Utils.fmtDate(dates.cut)} <span class="text-xs text-slate-400">(día ${c.cutDay||'—'})</span></p></div>
        <div class="surface rounded-xl p-3"><p class="text-slate-500 text-xs"><i class="fa-regular fa-calendar-check"></i> Próximo pago</p><p class="font-bold text-amber-600">${np ? Utils.fmtDate(np.date) + ' · ' + Utils.money(np.amount) : Utils.fmtDate(dates.firstPay)}</p></div>
      </div>
      <div class="mt-3">${UI.progress(usage.pct, usage.pct > 80 ? 'rose' : 'brand')}</div>`;

    const debitStats = `
      <div class="grid grid-cols-3 gap-3 text-sm">
        <div class="surface rounded-xl p-3"><p class="text-slate-500 text-xs">Ingresos</p><p class="font-bold text-emerald-500">${Utils.money(totals.income)}</p></div>
        <div class="surface rounded-xl p-3"><p class="text-slate-500 text-xs">Egresos</p><p class="font-bold text-rose-500">${Utils.money(totals.outflow)}</p></div>
        <div class="surface rounded-xl p-3"><p class="text-slate-500 text-xs">Neto</p><p class="font-bold">${Utils.money(totals.income - totals.outflow)}</p></div>
      </div>`;

    UI.modal({
      title: `${c.name} · ${c.bank}`,
      size: 'max-w-3xl',
      body: `
        <div class="grid sm:grid-cols-2 gap-5 items-start">
          <div>${this.bankCardHTML(c)}</div>
          <div>${isCredit ? creditStats : debitStats}
            ${c.notes ? `<p class="text-slate-500 text-sm mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">${Utils.escape(c.notes)}</p>` : ''}
          </div>
        </div>

        <h4 class="font-semibold mt-6 mb-2">${isCredit ? 'Cuotas a pagar por mes' : 'Ingresos vs egresos por mes'}</h4>
        <div class="surface rounded-2xl p-4"><canvas id="card-detail-chart" height="120"></canvas></div>

        <h4 class="font-semibold mt-6 mb-2">Movimientos (${movements.length})</h4>
        <div class="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          ${movements.length ? movements.map(e => `
            <div class="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onclick="Expenses.openDetail('${e.id}')">
              <div><p class="font-medium">${Utils.escape(e.entity)}</p><p class="text-xs text-slate-500">${Utils.fmtDate(e.date)} · ${e.method}${e.installmentsCount > 1 ? ' · ' + e.installmentsCount + ' cuotas' : ''}</p></div>
              <b class="${e.type === 'ingreso' ? 'text-emerald-500' : ''}">${e.type === 'ingreso' ? '+' : ''}${Utils.money(e.amount)}</b>
            </div>`).join('') : `<p class="px-4 py-6 text-center text-slate-400 text-sm">Sin movimientos en esta tarjeta</p>`}
        </div>`,
      footer: `<button onclick="Cards.openForm('${id}')" class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Editar</button>
               <button data-close class="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">Cerrar</button>`,
      onMount: () => this.drawDetailChart(c),
    });
  },

  drawDetailChart(c) {
    if (!window.Chart) return;
    const months = Charts.lastMonths(6);
    const labels = months.map(Charts.monthLabel);
    if (c.type === 'credito') {
      Charts.make('card-detail-chart', {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Cuotas a pagar', data: Engine.cardMonthlyInstallments(c, months), backgroundColor: '#0370d4', borderRadius: 6 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: Charts.gridColor() }, ticks: { callback: v => Utils.number(v) } } } },
      });
    } else {
      const fl = Engine.cardFlow(c, months);
      Charts.make('card-detail-chart', {
        type: 'bar',
        data: { labels, datasets: [
          { label: 'Ingresos', data: fl.map(x => x.income), backgroundColor: '#10b981', borderRadius: 6 },
          { label: 'Egresos', data: fl.map(x => x.outflow), backgroundColor: '#0370d4', borderRadius: 6 },
        ] },
        options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: Charts.gridColor() }, ticks: { callback: v => Utils.number(v) } } } },
      });
    }
  },
};
