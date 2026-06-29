"use strict";

/* ----------------------------------------------------------------
 * 11) MÓDULO: GASTOS / COMPRAS (con motor de cuotas)
 * ---------------------------------------------------------------- */
const Expenses = {
  statusColor: { pagado: 'emerald', pendiente: 'amber', vencido: 'rose', activo: 'brand' },

  render() {
    let list = Repos.expenses.all().map(e => Engine.refreshInstallmentStatus(e));
    list.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')));
    const totalEgreso = Utils.sum(list.filter(e => e.type !== 'ingreso'), e => e.amount);
    const totalIngreso = Utils.sum(list.filter(e => e.type === 'ingreso'), e => e.amount);

    return `
      <div class="view space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold">Ingresos y egresos</h2>
            <p class="text-sm text-slate-500">Registra tus movimientos: egresos (con tarjeta, cuotas e intereses) e ingresos.</p>
          </div>
          <button onclick="Expenses.openForm()" class="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 shadow-soft"><i class="fa-solid fa-plus"></i> Agregar nuevo registro</button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          ${UI.kpi({ label: 'Movimientos', value: list.length, icon: 'fa-receipt', color: 'brand' })}
          ${UI.kpi({ label: 'Total egresos', value: Utils.money(totalEgreso), icon: 'fa-arrow-trend-down', color: 'rose' })}
          ${UI.kpi({ label: 'Total ingresos', value: Utils.money(totalIngreso), icon: 'fa-arrow-trend-up', color: 'emerald' })}
          ${UI.kpi({ label: 'Deuda en curso', value: Utils.money(Engine.totalDebt()), icon: 'fa-hand-holding-dollar', color: 'amber' })}
        </div>

        <!-- Filtros -->
        <div class="surface rounded-2xl p-4 flex flex-wrap gap-3 items-center">
          <input id="exp-filter-text" oninput="Expenses.applyFilters()" placeholder="Buscar entidad, descripción..." class="flex-1 min-w-[180px] rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          <select id="exp-filter-type" onchange="Expenses.applyFilters()" class="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none">
            <option value="">Ingresos y egresos</option><option value="egreso">Solo egresos</option><option value="ingreso">Solo ingresos</option>
          </select>
          <select id="exp-filter-method" onchange="Expenses.applyFilters()" class="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none">
            <option value="">Todos los métodos</option><option value="credito">Crédito</option><option value="debito">Débito</option><option value="efectivo">Efectivo</option>
          </select>
          <select id="exp-filter-cat" onchange="Expenses.applyFilters()" class="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none">
            <option value="">Todas las categorías</option>${[...new Set([...CONFIG.categories, ...CONFIG.incomeCategories])].map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>

        <div id="exp-list" class="space-y-3"></div>
      </div>`;
  },

  applyFilters() {
    const text = ($('#exp-filter-text')?.value || '').toLowerCase();
    const type = $('#exp-filter-type')?.value || '';
    const method = $('#exp-filter-method')?.value || '';
    const cat = $('#exp-filter-cat')?.value || '';
    let list = Repos.expenses.all().map(e => Engine.refreshInstallmentStatus(e));
    list = list.filter(e =>
      (!type || (type === 'ingreso' ? e.type === 'ingreso' : e.type !== 'ingreso')) &&
      (!method || e.method === method) &&
      (!cat || e.category === cat) &&
      (!text || (e.entity + ' ' + (e.description||'') + ' ' + (e.tags||'') + ' ' + (e.category||'')).toLowerCase().includes(text))
    ).sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')));

    const wrap = $('#exp-list'); if (!wrap) return;
    if (!list.length) { wrap.innerHTML = UI.empty('No hay movimientos que coincidan.', 'fa-receipt'); return; }
    wrap.innerHTML = list.map(e => this.rowHTML(e)).join('');
  },

  rowHTML(e) {
    const card = e.cardId ? Repos.cards.find(e.cardId) : null;
    const t = Engine.expenseTotals(e);
    const isCredit = e.method === 'credito';
    const income = e.type === 'ingreso';
    const stColor = income ? 'emerald' : (isCredit ? (t.pending <= 0 ? 'emerald' : (e.installments?.some(c=>c.status==='vencida') ? 'rose' : 'amber')) : (e.status === 'pagado' ? 'emerald' : 'amber'));
    const stText = income ? 'Ingreso' : (isCredit ? `${t.paidCount}/${t.totalCount} cuotas` : (e.status === 'pagado' ? 'Pagado' : 'Pendiente'));
    const methodIcon = { credito: 'fa-credit-card', debito: 'fa-money-check', efectivo: 'fa-money-bill-wave' }[e.method] || 'fa-receipt';
    return `
      <div class="surface rounded-2xl p-4 shadow-soft hover:shadow-card transition cursor-pointer" onclick="Expenses.openDetail('${e.id}')">
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl grid place-items-center ${income ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}"><i class="fa-solid ${income ? 'fa-arrow-down' : methodIcon}"></i></div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-semibold truncate">${Utils.escape(e.entity)}</p>
              ${UI.badge(stText, stColor)}
              ${e.category ? UI.badge(e.category, 'slate') : ''}
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              ${Utils.fmtDate(e.date)}${e.time ? ' · ' + e.time : ''}
              ${card ? ' · ' + Utils.escape(card.name) : ''}
              ${isCredit && e.installmentsCount > 1 ? ` · ${e.installmentsCount} cuotas @ ${Number(e.interestRate||0).toFixed(2)}%` : ''}
              ${e.receipt ? ' · <i class="fa-solid fa-paperclip"></i>' : ''}
            </p>
            ${isCredit && t.totalCount > 1 ? `<div class="mt-2 max-w-xs">${UI.progress(t.paidCount/t.totalCount*100, 'brand')}</div>` : ''}
          </div>
          <div class="text-right">
            <p class="font-extrabold ${income ? 'text-emerald-500' : ''}">${income ? '+' : ''}${Utils.money(e.amount)}</p>
            ${isCredit && t.pending > 0 ? `<p class="text-xs text-amber-500">Falta ${Utils.money(t.pending)}</p>` : ''}
          </div>
        </div>
      </div>`;
  },

  /* ---------- FORMULARIO (Ingreso / Egreso dinámico) ---------- */
  openForm(id = null) {
    const e = id ? { ...Repos.expenses.find(id) } : {
      date: Utils.todayStr(), time: new Date().toTimeString().slice(0,5), status: 'pendiente', isNew: true,
    };
    const hasType = e.type === 'ingreso' || e.type === 'egreso';
    UI.modal({
      title: id ? 'Editar registro' : 'Agregar nuevo registro',
      size: 'max-w-3xl',
      body: `
        <form id="exp-form" class="space-y-4" oninput="Expenses.recalc()">
          <div>
            <span class="text-sm font-medium">Tipo de registro</span>
            <div class="mt-1 grid grid-cols-2 gap-2" id="type-toggle">
              ${this.typeBtn('egreso', e.type)}
              ${this.typeBtn('ingreso', e.type)}
            </div>
            <input type="hidden" name="type" value="${e.type || ''}" />
          </div>
          <div id="exp-fields">${hasType ? this.formFields(e) : this.typeHint()}</div>
        </form>`,
      footer: `<button data-close class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Cancelar</button>
               <button onclick="Expenses.save('${id || ''}')" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold">${id ? 'Guardar cambios' : 'Guardar registro'}</button>`,
      onMount: (wrap) => {
        $('#type-toggle', wrap).addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-type]'); if (!b) return;
          this.onTypeChange(b.dataset.type);
        });
        this.recalc();
      },
    });
  },

  typeHint() {
    return `<div class="text-center text-slate-400 py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
      <i class="fa-solid fa-hand-pointer text-3xl mb-3"></i>
      <p class="font-medium">Selecciona <span class="text-rose-500 font-semibold">Egreso</span> o <span class="text-emerald-500 font-semibold">Ingreso</span> para continuar.</p>
    </div>`;
  },
  typeBtn(kind, current) {
    const active = current === kind;
    const base = 'type-btn flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold transition ';
    const cls = active
      ? (kind === 'ingreso' ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-500/10')
      : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:border-slate-400';
    const icon = kind === 'ingreso' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
    return `<button type="button" data-type="${kind}" class="${base}${cls}"><i class="fa-solid ${icon}"></i> ${kind === 'ingreso' ? 'Ingreso' : 'Egreso'}</button>`;
  },

  /* Listas guardadas para autocompletado (se registran al guardar) */
  getEntities() { return Storage.read(`u:${State.userId}:entities`, []); },
  getCities() { return Storage.read(`u:${State.userId}:cities`, []); },
  addEntity(name) { const n = (name||'').trim(); if (!n) return; const l = this.getEntities(); if (!l.some(x => x.toLowerCase() === n.toLowerCase())) { l.push(n); Storage.write(`u:${State.userId}:entities`, l.sort()); } },
  addCity(name) { const n = (name||'').trim(); if (!n) return; const l = this.getCities(); if (!l.some(x => x.toLowerCase() === n.toLowerCase())) { l.push(n); Storage.write(`u:${State.userId}:cities`, l.sort()); } },

  // Campos según el tipo (ingreso vs egreso)
  formFields(e) {
    const isIncome = e.type === 'ingreso';
    const categories = isIncome ? CONFIG.incomeCategories : CONFIG.categories;
    const methodOptions = isIncome
      ? [{ value: 'debito', label: 'Tarjeta de débito' }, { value: 'efectivo', label: 'Efectivo' }]
      : [{ value: 'credito', label: 'Tarjeta de crédito' }, { value: 'debito', label: 'Tarjeta de débito' }, { value: 'efectivo', label: 'Efectivo' }];
    let method = e.method || (isIncome ? 'debito' : 'credito');
    if (isIncome && method === 'credito') method = 'debito';
    const entityList = this.getEntities().map(x => `<option value="${Utils.escape(x)}"></option>`).join('');
    const cityList = this.getCities().map(x => `<option value="${Utils.escape(x)}"></option>`).join('');
    const receipts = e.receipts || (e.receipt ? [e.receipt] : []);
    const hasReceipt = receipts.length > 0;
    const hasWarranty = !!e.warranty;
    const inputCls = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none';

    return `
      <datalist id="entity-list">${entityList}</datalist>
      <datalist id="city-list">${cityList}</datalist>
      <div class="grid sm:grid-cols-2 gap-4">
        ${UI.field(isIncome ? 'Fuente / Origen' : 'Entidad / Comercio',
          `<input name="entity" list="entity-list" value="${Utils.escape(e.entity || '')}" placeholder="${isIncome ? 'Ej: Salario, Cliente X...' : 'Ej: Éxito, Netflix...'}" required autocomplete="off" class="${inputCls}" />`,
          'Escribe y elige una guardada, o crea una nueva')}
        ${UI.field(isIncome ? 'Valor del ingreso' : 'Valor de la compra', UI.input('amount', { type: 'number', value: e.amount || '', placeholder: '0', min: 0, required: true, step: '0.01' }))}
        ${UI.field('Categoría', UI.select('category', categories, e.category || categories[0]))}
        ${UI.field('Subcategoría', UI.input('subcategory', { value: e.subcategory || '', placeholder: 'Opcional' }))}
        ${UI.field('Fecha', UI.input('date', { type: 'date', value: e.date || Utils.todayStr(), required: true }))}
        ${UI.field('Hora', UI.input('time', { type: 'time', value: e.time || '' }))}
        ${UI.field('Ciudad', `<input name="city" list="city-list" value="${Utils.escape(e.city || '')}" placeholder="Escribe o elige" autocomplete="off" class="${inputCls}" />`, 'Se guardan para la próxima vez')}
        ${UI.field(isIncome ? 'Medio de recepción' : 'Método de pago', UI.select('method', methodOptions, method, 'onchange="Expenses.onMethodChange(this.form)"'))}
      </div>

      <div id="method-dependent">${this.methodFields({ ...e, method })}</div>

      <div class="grid sm:grid-cols-2 gap-4 items-start">
        ${isIncome ? '' : `<div>
          ${UI.field('¿Aplica garantía?', UI.select('warrantyApplies', [{value:'no',label:'No'},{value:'si',label:'Sí'}], hasWarranty ? 'si' : 'no', 'onchange="Expenses.toggleWarranty(this.form)"'))}
          <div id="warranty-area" class="${hasWarranty ? '' : 'hidden'} mt-2">${UI.field('Garantía válida hasta', UI.input('warranty', { type: 'date', value: e.warranty || '' }))}</div>
        </div>`}
        <div>
          ${UI.field('¿Agregar comprobante?', UI.select('receiptApplies', [{value:'no',label:'No'},{value:'si',label:'Sí'}], hasReceipt ? 'si' : 'no', 'onchange="Expenses.toggleReceipt(this.form)"'))}
          <div id="receipt-area" class="${hasReceipt ? '' : 'hidden'} mt-2">
            <input type="file" name="receiptFile" accept="image/*" multiple onchange="Expenses.onReceiptAdd(this)" class="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:text-white file:px-3 file:py-2 file:font-medium"/>
            <input type="hidden" name="receipts" value="${Utils.escape(JSON.stringify(receipts))}" />
            <div id="receipt-carousel" class="relative mt-2 ${receipts.length ? '' : 'hidden'}">
              <button type="button" onclick="Expenses.scrollReceipts(-1)" class="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow grid place-items-center"><i class="fa-solid fa-chevron-left text-xs"></i></button>
              <div id="receipt-preview" class="flex gap-2 overflow-x-auto scroll-smooth px-9 py-1">${this.receiptThumbs(receipts)}</div>
              <button type="button" onclick="Expenses.scrollReceipts(1)" class="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow grid place-items-center"><i class="fa-solid fa-chevron-right text-xs"></i></button>
            </div>
          </div>
        </div>
      </div>

      ${UI.field('Descripción / Notas', UI.textarea('description', e.description || '', isIncome ? 'Detalle del ingreso...' : 'Detalle del gasto...'))}`;
  },

  // Campos que dependen del método de pago (tarjeta / cuotas)
  methodFields(e) {
    const isIncome = e.type === 'ingreso';
    const method = e.method;
    let html = '';
    if (method !== 'efectivo') {
      const isCredit = method === 'credito';
      const cards = Repos.cards.where(c => isCredit ? c.type === 'credito' : c.type === 'debito');
      const cardOptions = [{ value: '', label: cards.length ? '— Selecciona tarjeta —' : `— No hay tarjetas ${isCredit ? 'de crédito' : 'de débito'} —` }, ...cards.map(c => ({ value: c.id, label: `${c.name} · ${c.bank}` }))];
      html += `<div class="grid sm:grid-cols-2 gap-4">
        ${UI.field(isCredit ? 'Tarjeta de crédito' : 'Tarjeta de débito', UI.select('cardId', cardOptions, e.cardId || '', 'onchange="Expenses.recalc()"'))}
        ${isCredit ? UI.field('Número de cuotas (1 a 100)', UI.input('installmentsCount', { type: 'number', value: e.installmentsCount || 1, min: 1, extra: 'max=100' })) : ''}
      </div>`;
      if (isCredit) html += `<div id="calc-panel" class="mt-4 rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 p-4"></div>`;
    }
    if (!isIncome && method !== 'credito') {
      html += `<label class="flex items-center gap-2 text-sm mt-2"><input type="checkbox" name="paidNow" ${e.status === 'pagado' ? 'checked' : ''} class="rounded"/> Marcar como pagado</label>`;
    }
    return html;
  },

  receiptThumbs(arr) {
    return (arr || []).map((u, i) => `<div class="relative flex-shrink-0">
      <img src="${u}" class="h-20 w-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"/>
      <button type="button" onclick="Expenses.removeReceipt(${i})" class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white text-xs grid place-items-center shadow">&times;</button>
    </div>`).join('');
  },
  scrollReceipts(dir) { const el = $('#receipt-preview'); if (el) el.scrollBy({ left: dir * 180, behavior: 'smooth' }); },
  toggleWarranty(form) {
    const yes = form.warrantyApplies.value === 'si';
    $('#warranty-area').classList.toggle('hidden', !yes);
    if (!yes && form.warranty) form.warranty.value = '';
  },
  toggleReceipt(form) {
    const yes = form.receiptApplies.value === 'si';
    $('#receipt-area').classList.toggle('hidden', !yes);
    if (!yes && form.receipts) { form.receipts.value = '[]'; this.renderReceipts(form); }
  },
  onReceiptAdd(input) {
    const f = input.form;
    let arr = []; try { arr = JSON.parse(f.receipts.value || '[]'); } catch {}
    const files = [...input.files]; let pending = files.length; if (!pending) return;
    files.forEach(file => {
      const r = new FileReader();
      r.onload = ev => { arr.push(ev.target.result); if (--pending === 0) { f.receipts.value = JSON.stringify(arr); this.renderReceipts(f); } };
      r.readAsDataURL(file);
    });
    input.value = '';
  },
  renderReceipts(f) {
    let arr = []; try { arr = JSON.parse(f.receipts.value || '[]'); } catch {}
    const prev = $('#receipt-preview'); if (prev) prev.innerHTML = this.receiptThumbs(arr);
    const car = $('#receipt-carousel'); if (car) car.classList.toggle('hidden', arr.length === 0);
  },
  removeReceipt(i) {
    const f = $('#exp-form'); let arr = []; try { arr = JSON.parse(f.receipts.value || '[]'); } catch {}
    arr.splice(i, 1); f.receipts.value = JSON.stringify(arr); this.renderReceipts(f);
  },

  // Lee de forma segura los valores actuales del formulario
  readForm(f) {
    const g = n => (f.elements[n] ? f.elements[n].value : '');
    let receipts = []; try { receipts = JSON.parse(g('receipts') || '[]'); } catch {}
    return {
      type: g('type'), entity: g('entity'), amount: g('amount'), category: g('category'),
      subcategory: g('subcategory'), date: g('date'), time: g('time'), city: g('city'),
      method: g('method'), cardId: g('cardId'), installmentsCount: g('installmentsCount') || 1,
      warranty: g('warranty'), receipts, description: g('description'),
      status: (f.elements['paidNow'] && f.elements['paidNow'].checked) ? 'pagado' : 'pendiente',
    };
  },

  // Cambia entre Ingreso/Egreso: reconstruye los campos
  onTypeChange(type) {
    const f = $('#exp-form'); if (!f) return;
    const cur = this.readForm(f);
    cur.type = type;
    cur.method = type === 'ingreso' ? 'debito' : 'credito';
    cur.cardId = '';
    cur.category = type === 'ingreso' ? CONFIG.incomeCategories[0] : 'Otros';
    f.elements['type'].value = type;
    $('#type-toggle').innerHTML = this.typeBtn('egreso', type) + this.typeBtn('ingreso', type);
    $('#exp-fields').innerHTML = this.formFields(cur);
    this.recalc();
    this.creditWarning();
  },

  // Aviso si se quiere crédito pero no hay tarjetas de crédito
  creditWarning() {
    const f = $('#exp-form'); if (!f) return;
    const p = $('#calc-panel');
    if (p && f.method && f.method.value === 'credito' && !Repos.cards.where(c => c.type === 'credito').length) {
      p.innerHTML = `<p class="text-sm text-amber-600"><i class="fa-solid fa-triangle-exclamation"></i> No tienes tarjetas de crédito. <button type="button" class="underline" onclick="UI.closeModal();Router.go('cards')">Agrega una</button> para calcular cuotas y fechas.</p>`;
    }
  },

  // Al cambiar el método: reconstruye tarjeta/cuotas y recalcula
  onMethodChange(form) {
    const cur = this.readForm(form);
    $('#method-dependent').innerHTML = this.methodFields(cur);
    this.recalc();
    this.creditWarning();
  },

  // Recalcula y muestra el panel de cuotas/intereses en vivo
  recalc() {
    const f = $('#exp-form'); if (!f) return;
    const panel = $('#calc-panel'); if (!panel) return;
    if (!f.method || f.method.value !== 'credito' || !f.installmentsCount) { return; }

    const amount = Number(f.amount.value) || 0;
    const n = Utils.clamp(parseInt(f.installmentsCount.value) || 1, 1, 100);
    const date = f.date.value || Utils.todayStr();
    const card = (f.cardId && f.cardId.value) ? Repos.cards.find(f.cardId.value) : null;
    const rate = Engine.rateForDate(date);
    const rows = Engine.amortize(amount, rate, n);
    const totalInterest = Utils.sum(rows, r => r.interest);
    const totalToPay = amount + totalInterest;
    const cuotaConInteres = rows[0]?.value || 0;
    const cuotaSinInteres = n ? Math.round(amount / n) : 0;
    const dates = card ? Engine.billingDates(card, date) : null;

    panel.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <p class="font-semibold text-brand-700 dark:text-brand-300"><i class="fa-solid fa-calculator"></i> Cálculo automático</p>
        <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-600 text-white">Tasa ${Utils.monthName(Utils.parseDate(date).getMonth()+1)}: ${rate.toFixed(2)}%</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><p class="text-slate-500 text-xs">Cuota sin interés</p><p class="font-bold">${Utils.money(cuotaSinInteres)}</p></div>
        <div><p class="text-slate-500 text-xs">Cuota con interés</p><p class="font-bold text-brand-600">${Utils.money(cuotaConInteres)}</p></div>
        <div><p class="text-slate-500 text-xs">Interés total</p><p class="font-bold text-rose-500">${Utils.money(totalInterest)}</p></div>
        <div><p class="text-slate-500 text-xs">Total a pagar</p><p class="font-bold">${Utils.money(totalToPay)}</p></div>
      </div>
      ${dates ? `<div class="mt-3 pt-3 border-t border-brand-200 dark:border-brand-500/30 grid grid-cols-2 gap-3 text-sm">
        <div><p class="text-slate-500 text-xs"><i class="fa-solid fa-scissors"></i> Fecha de corte</p><p class="font-bold">${Utils.fmtDate(dates.cut)}</p></div>
        <div><p class="text-slate-500 text-xs"><i class="fa-regular fa-calendar-check"></i> 1ª fecha límite de pago</p><p class="font-bold text-emerald-600">${Utils.fmtDate(dates.firstPay)}</p></div>
      </div>` : `<p class="mt-2 text-xs text-slate-500">Selecciona una tarjeta para calcular fecha de corte y de pago automáticamente.</p>`}`;
  },

  save(id) {
    const f = $('#exp-form');
    if (!f.type.value) return Utils.toast('Selecciona si es Egreso o Ingreso', 'error');
    const isIncome = f.type.value === 'ingreso';
    const amount = Number(f.amount.value) || 0;
    if (!f.entity.value.trim() || amount <= 0) return Utils.toast('Origen/entidad y valor son obligatorios', 'error');

    let method = f.method.value;
    if (isIncome && method === 'credito') method = 'debito';
    let receipts = []; try { receipts = JSON.parse((f.receipts && f.receipts.value) || '[]'); } catch {}
    const warranty = (!isIncome && f.warrantyApplies && f.warrantyApplies.value === 'si' && f.warranty) ? (f.warranty.value || null) : null;

    const data = {
      type: f.type.value, entity: f.entity.value.trim(), amount,
      category: f.category.value, subcategory: f.subcategory.value.trim(), tags: '',
      date: f.date.value, time: f.time.value, city: f.city.value.trim(),
      method, cardId: (method !== 'efectivo' && f.cardId) ? (f.cardId.value || null) : null,
      installmentsCount: (!isIncome && method === 'credito') ? Utils.clamp(parseInt(f.installmentsCount.value) || 1, 1, 100) : 1,
      warranty, receipts, receipt: receipts[0] || null,
      description: f.description.value.trim(),
    };

    if (isIncome) {
      data.status = 'recibido'; data.interestRate = 0; data.installments = null;
    } else if (method === 'credito') {
      data.status = 'pendiente';
      data.interestRate = Engine.rateForDate(data.date);
      const card = data.cardId ? Repos.cards.find(data.cardId) : null;
      const prev = id ? Repos.expenses.find(id) : null;
      data.installments = Engine.buildInstallments(data, card);
      if (prev?.installments) {
        prev.installments.forEach((c, i) => {
          if (c.status === 'pagada' && data.installments[i]) {
            data.installments[i].status = 'pagada';
            data.installments[i].paymentDate = c.paymentDate;
            data.installments[i].receipt = c.receipt;
          }
        });
      }
    } else {
      data.status = (f.paidNow && f.paidNow.checked) ? 'pagado' : 'pendiente';
      data.interestRate = 0; data.installments = null;
    }

    this.addEntity(data.entity); this.addCity(data.city);
    const saved = id ? Repos.expenses.update(id, data) : Repos.expenses.insert(data);
    // refrescar la vista de fondo para que el registro quede consultable de inmediato
    Router.go(State.view);
    // pantalla de confirmación dentro del modal
    this.showSuccess(saved);
  },

  // Pantalla de éxito tras guardar
  showSuccess(e) {
    const box = $('#modal-root .modal-box'); if (!box) { Utils.toast('Registro guardado'); return; }
    const isIncome = e.type === 'ingreso';
    const card = e.cardId ? Repos.cards.find(e.cardId) : null;
    const t = Engine.expenseTotals(Engine.refreshInstallmentStatus(e));
    box.innerHTML = `
      <div class="p-8 text-center animate__animated animate__fadeIn animate__faster">
        <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 grid place-items-center text-3xl mx-auto mb-4 animate__animated animate__bounceIn"><i class="fa-solid fa-check"></i></div>
        <h3 class="text-xl font-bold">¡Registro guardado correctamente!</h3>
        <p class="text-slate-500 mt-1">Tu ${isIncome ? 'ingreso' : 'egreso'} quedó guardado y ya puedes consultarlo.</p>
        <div class="mt-5 text-left rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-sm max-w-md mx-auto">
          <div class="flex justify-between items-center"><span class="text-slate-500">Tipo</span>${UI.badge(isIncome ? 'Ingreso' : 'Egreso', isIncome ? 'emerald' : 'rose')}</div>
          <div class="flex justify-between"><span class="text-slate-500">${isIncome ? 'Fuente' : 'Entidad'}</span><b>${Utils.escape(e.entity)}</b></div>
          <div class="flex justify-between"><span class="text-slate-500">Valor</span><b>${Utils.money(e.amount)}</b></div>
          <div class="flex justify-between"><span class="text-slate-500">Fecha</span><b>${Utils.fmtDate(e.date)}</b></div>
          <div class="flex justify-between"><span class="text-slate-500">Método</span><b class="capitalize">${e.method}</b></div>
          ${card ? `<div class="flex justify-between"><span class="text-slate-500">Tarjeta</span><b>${Utils.escape(card.name)}</b></div>` : ''}
          ${(e.method === 'credito' && e.installments) ? `<div class="flex justify-between"><span class="text-slate-500">Cuotas</span><b>${e.installments.length} × ${Utils.money(e.installments[0].value)}</b></div>
          <div class="flex justify-between"><span class="text-slate-500">Total con interés</span><b>${Utils.money(t.total)}</b></div>` : ''}
        </div>
        <div class="mt-6 flex flex-wrap gap-3 justify-center">
          <button onclick="UI.closeModal()" class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Cerrar</button>
          <button onclick="Expenses.openDetail('${e.id}')" class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium"><i class="fa-solid fa-eye"></i> Ver detalle</button>
          <button onclick="Expenses.openForm()" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold"><i class="fa-solid fa-plus"></i> Agregar nuevo registro</button>
        </div>
      </div>`;
  },

  /* ---------- DETALLE + CUOTAS ---------- */
  openDetail(id) {
    const e = Engine.refreshInstallmentStatus(Repos.expenses.find(id)); if (!e) return;
    const card = e.cardId ? Repos.cards.find(e.cardId) : null;
    const t = Engine.expenseTotals(e);
    const isCredit = e.method === 'credito' && e.installments;

    const info = `
      <div class="grid sm:grid-cols-2 gap-3 text-sm">
        <div class="flex justify-between"><span class="text-slate-500">Valor</span><b>${Utils.money(e.amount)}</b></div>
        <div class="flex justify-between"><span class="text-slate-500">Fecha</span><b>${Utils.fmtDate(e.date)} ${e.time||''}</b></div>
        <div class="flex justify-between"><span class="text-slate-500">Método</span><b class="capitalize">${e.method}</b></div>
        <div class="flex justify-between"><span class="text-slate-500">Tarjeta</span><b>${card ? Utils.escape(card.name) : '—'}</b></div>
        <div class="flex justify-between"><span class="text-slate-500">Categoría</span><b>${Utils.escape(e.category||'—')}</b></div>
        <div class="flex justify-between"><span class="text-slate-500">Ciudad</span><b>${Utils.escape(e.city||'—')}</b></div>
        ${isCredit ? `<div class="flex justify-between"><span class="text-slate-500">Tasa aplicada</span><b>${Number(e.interestRate).toFixed(2)}%</b></div>
        <div class="flex justify-between"><span class="text-slate-500">Total con interés</span><b>${Utils.money(t.total)}</b></div>
        <div class="flex justify-between"><span class="text-slate-500">Pagado</span><b class="text-emerald-500">${Utils.money(t.paid)}</b></div>
        <div class="flex justify-between"><span class="text-slate-500">Pendiente</span><b class="text-amber-500">${Utils.money(t.pending)}</b></div>` : ''}
      </div>
      ${e.description ? `<p class="mt-3 text-sm text-slate-500">${Utils.escape(e.description)}</p>` : ''}
      ${e.warranty ? `<p class="mt-2 text-sm">${UI.badge('Garantía hasta ' + Utils.fmtDate(e.warranty), 'sky')}</p>` : ''}
      ${(() => { const r = e.receipts || (e.receipt ? [e.receipt] : []); return r.length ? `<div class="mt-3 flex flex-wrap gap-2">${r.map(u => `<a href="${u}" target="_blank"><img src="${u}" class="h-28 w-28 object-cover rounded-xl border border-slate-200 dark:border-slate-800"/></a>`).join('')}</div>` : ''; })()}`;

    const cuotas = isCredit ? `
      <h4 class="font-semibold mt-5 mb-2">Plan de cuotas <span class="text-slate-400 text-sm font-normal">(${t.paidCount}/${t.totalCount} pagadas)</span></h4>
      <div class="mb-3">${UI.progress(t.totalCount ? t.paidCount/t.totalCount*100 : 0, 'brand')}</div>
      <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
        ${e.installments.map(c => {
          const col = c.status === 'pagada' ? 'emerald' : (c.status === 'vencida' ? 'rose' : 'amber');
          return `<div class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div class="w-9 h-9 rounded-full grid place-items-center bg-${col}-100 text-${col}-600 dark:bg-${col}-500/15 text-sm font-bold">${c.number}</div>
            <div class="flex-1">
              <p class="text-sm font-medium">${Utils.money(c.value)} <span class="text-xs text-slate-400">(cap ${Utils.money(c.capital)} + int ${Utils.money(c.interest)})</span></p>
              <p class="text-xs text-slate-500">Vence ${Utils.fmtDate(c.dueDate)} ${UI.badge(c.status, col)}</p>
            </div>
            ${c.status === 'pagada'
              ? `<button onclick="Expenses.toggleCuota('${e.id}',${c.number},false)" class="text-xs text-slate-400 hover:text-slate-600">Deshacer</button>`
              : `<button onclick="Expenses.toggleCuota('${e.id}',${c.number},true)" class="text-xs font-semibold text-emerald-600 hover:underline"><i class="fa-solid fa-check"></i> Pagar</button>`}
          </div>`;
        }).join('')}
      </div>` : '';

    UI.modal({
      title: e.entity,
      size: 'max-w-2xl',
      body: info + cuotas,
      footer: `<button onclick="Expenses.remove('${id}')" class="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium"><i class="fa-solid fa-trash"></i> Eliminar</button>
               <button onclick="Expenses.openForm('${id}')" class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-medium">Editar</button>
               <button data-close class="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold">Cerrar</button>`,
    });
  },

  toggleCuota(expId, number, paid) {
    const e = Repos.expenses.find(expId); if (!e || !e.installments) return;
    const c = e.installments.find(x => x.number === number); if (!c) return;
    c.status = paid ? 'pagada' : 'pendiente';
    c.paymentDate = paid ? Utils.todayStr() : null;
    Repos.expenses.update(expId, { installments: e.installments });
    Utils.toast(paid ? `Cuota ${number} pagada` : `Cuota ${number} marcada pendiente`);
    this.openDetail(expId);
  },

  async remove(id) {
    if (await Utils.confirm('¿Eliminar movimiento?', 'Esta acción no se puede deshacer.', 'Eliminar')) {
      Repos.expenses.remove(id); UI.closeModal(); Utils.toast('Movimiento eliminado'); Router.go(State.view);
    }
  },
};
