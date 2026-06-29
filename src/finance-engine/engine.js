"use strict";

/* ----------------------------------------------------------------
 * 8) MOTOR FINANCIERO (servicio central de cálculo)
 *    - Tasas por mes  - Amortización  - Fechas de pago/corte
 *    - Cuotas  - Deuda  - Uso de cupo  - Flujo de caja
 * ---------------------------------------------------------------- */
const Engine = {
  /* --- TASAS DE INTERÉS POR MES --- */
  // Devuelve la tasa mensual (%) vigente para la fecha de la compra.
  rateForDate(dateStr) {
    const d = Utils.parseDate(dateStr);
    const year = d.getFullYear(), month = d.getMonth() + 1;
    const rates = Repos.rates.all();
    const exact = rates.find(r => Number(r.year) === year && Number(r.month) === month);
    if (exact) return Number(exact.rate);
    // Fallback: tasa más reciente ANTERIOR a la fecha (nunca futura)
    const prior = rates
      .filter(r => (Number(r.year) < year) || (Number(r.year) === year && Number(r.month) <= month))
      .sort((a, b) => (b.year - a.year) || (b.month - a.month))[0];
    return prior ? Number(prior.rate) : 0;
  },

  /* --- AMORTIZACIÓN (sistema francés / cuota fija) --- */
  // P: capital, ratePct: % mensual, n: nº cuotas → array de cuotas {capital, interest, value}
  amortize(P, ratePct, n) {
    P = Number(P) || 0; n = Math.max(1, parseInt(n) || 1);
    const i = (Number(ratePct) || 0) / 100;
    const rows = [];
    if (i <= 0) {
      const base = Math.round(P / n);
      for (let k = 1; k <= n; k++) {
        const value = (k === n) ? P - base * (n - 1) : base;
        rows.push({ capital: value, interest: 0, value });
      }
      return rows;
    }
    const cuota = P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    let balance = P;
    for (let k = 1; k <= n; k++) {
      let interest = balance * i;
      let capital = cuota - interest;
      if (k === n) { capital = balance; } // ajuste final
      balance -= capital;
      rows.push({ capital: Math.round(capital), interest: Math.round(interest), value: Math.round(capital + interest) });
    }
    return rows;
  },

  /* --- FECHA DE CORTE Y PAGO de una compra según la tarjeta --- */
  // Regla: si la compra ocurre el día del corte o antes → entra a ese corte;
  // si es después → entra al corte del mes siguiente.
  // La fecha de pago es el "payDay"; si payDay <= cutDay se asume el mes siguiente al corte.
  billingDates(card, purchaseDateStr) {
    const d = Utils.parseDate(purchaseDateStr);
    const cutDay = Number(card?.cutDay) || 1;
    const payDay = Number(card?.payDay) || 1;
    let cut = Utils.dateOnMonth(d.getFullYear(), d.getMonth(), cutDay);
    if (d.getDate() > cutDay) cut = Utils.addMonths(cut, 1);
    // Pago: normalmente el mes siguiente al corte. Si payDay > cutDay puede ser el mismo mes del corte.
    let payMonthOffset = (payDay > cutDay) ? 0 : 1;
    let pay = Utils.dateOnMonth(cut.getFullYear(), cut.getMonth() + payMonthOffset, payDay);
    return { cut: Utils.iso(cut), firstPay: Utils.iso(pay) };
  },

  /* --- GENERAR CUOTAS de una compra a crédito --- */
  buildInstallments(expense, card) {
    const n = Math.max(1, parseInt(expense.installmentsCount) || 1);
    const ratePct = Number(expense.interestRate ?? this.rateForDate(expense.date));
    const rows = this.amortize(expense.amount, ratePct, n);
    const { firstPay } = card ? this.billingDates(card, expense.date) : { firstPay: Utils.iso(Utils.addMonths(Utils.parseDate(expense.date), 1)) };
    const first = Utils.parseDate(firstPay);
    return rows.map((r, idx) => ({
      number: idx + 1,
      dueDate: Utils.iso(Utils.addMonths(first, idx)),
      value: r.value,
      capital: r.capital,
      interest: r.interest,
      status: 'pendiente',          // pendiente | pagada | vencida
      paymentDate: null,
      receipt: null,
      notes: '',
    }));
  },

  // Recalcula estado "vencida" para cuotas pendientes con fecha pasada
  refreshInstallmentStatus(exp) {
    if (!exp.installments) return exp;
    const today = Utils.todayStr();
    exp.installments.forEach(c => {
      if (c.status === 'pendiente' && c.dueDate < today) c.status = 'vencida';
    });
    return exp;
  },

  /* --- DERIVADOS DE UNA COMPRA --- */
  expenseTotals(exp) {
    if (exp.method !== 'credito' || !exp.installments) {
      const paid = exp.status === 'pagado';
      return { total: exp.amount, paid: paid ? exp.amount : 0, pending: paid ? 0 : exp.amount, paidCount: paid ? 1 : 0, totalCount: 1, capitalPending: paid ? 0 : exp.amount, interestPending: 0 };
    }
    const ins = exp.installments;
    const totalCount = ins.length;
    const paidCount = ins.filter(c => c.status === 'pagada').length;
    const total = Utils.sum(ins, c => c.value);
    const paid = Utils.sum(ins.filter(c => c.status === 'pagada'), c => c.value);
    const pendingIns = ins.filter(c => c.status !== 'pagada');
    const pending = Utils.sum(pendingIns, c => c.value);
    const capitalPending = Utils.sum(pendingIns, c => c.capital);
    const interestPending = Utils.sum(pendingIns, c => c.interest);
    return { total, paid, pending, paidCount, totalCount, capitalPending, interestPending };
  },

  /* --- USO DE CUPO DE UNA TARJETA --- */
  cardUsage(card) {
    if (card.type !== 'credito') return { used: 0, available: 0, total: 0, pct: 0 };
    const total = Number(card.cupoTotal) || 0;
    // Capital pendiente de compras a crédito en esa tarjeta
    const used = Utils.sum(
      Repos.expenses.where(e => e.cardId === card.id && e.method === 'credito')
        .map(e => this.expenseTotals(this.refreshInstallmentStatus(e)).capitalPending)
    );
    const available = Math.max(0, total - used);
    const pct = total > 0 ? (used / total) * 100 : 0;
    return { used, available, total, pct };
  },

  /* --- DERIVADOS POR TARJETA --- */
  cardDebt(card) {
    return Utils.sum(
      Repos.expenses.where(e => e.cardId === card.id && e.method === 'credito' && e.type !== 'ingreso')
        .map(e => this.expenseTotals(this.refreshInstallmentStatus(e)).pending)
    );
  },
  cardNextPayment(card) {
    const out = [];
    Repos.expenses.where(e => e.cardId === card.id && e.method === 'credito' && e.type !== 'ingreso').forEach(e => {
      this.refreshInstallmentStatus(e);
      (e.installments || []).forEach(c => { if (c.status !== 'pagada') out.push(c); });
    });
    out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return out[0] ? { date: out[0].dueDate, amount: out[0].value } : null;
  },
  cardMonthlyInstallments(card, months) {
    return months.map(m => {
      let total = 0;
      Repos.expenses.where(e => e.cardId === card.id && e.method === 'credito' && e.installments).forEach(e => {
        (e.installments || []).forEach(c => { if (c.dueDate.slice(0, 7) === m) total += c.value; });
      });
      return total;
    });
  },
  cardFlow(card, months) {
    return months.map(m => {
      const exps = Repos.expenses.where(e => e.cardId === card.id && Utils.monthKey(e.date) === m);
      return {
        income: Utils.sum(exps.filter(e => e.type === 'ingreso'), e => e.amount),
        outflow: Utils.sum(exps.filter(e => e.type !== 'ingreso'), e => e.amount),
      };
    });
  },
  cardTotals(card) {
    const movs = Repos.expenses.where(e => e.cardId === card.id);
    return {
      count: movs.length,
      income: Utils.sum(movs.filter(e => e.type === 'ingreso'), e => e.amount),
      outflow: Utils.sum(movs.filter(e => e.type !== 'ingreso'), e => e.amount),
    };
  },

  /* --- TODAS LAS CUOTAS PENDIENTES (aplanadas) --- */
  pendingInstallments() {
    const out = [];
    Repos.expenses.where(e => e.method === 'credito' && e.type !== 'ingreso').forEach(e => {
      this.refreshInstallmentStatus(e);
      (e.installments || []).forEach(c => {
        if (c.status !== 'pagada') out.push({ expense: e, cuota: c });
      });
    });
    // También compras a débito/efectivo marcadas como pendientes
    return out.sort((a, b) => a.cuota.dueDate.localeCompare(b.cuota.dueDate));
  },

  /* --- TOTAL DE DEUDA --- */
  totalDebt() {
    return Utils.sum(
      Repos.expenses.where(e => e.method === 'credito' && e.type !== 'ingreso')
        .map(e => this.expenseTotals(this.refreshInstallmentStatus(e)).pending)
    );
  },

  /* --- TOTAL A PAGAR HASTA UNA FECHA (para saldar pendientes) --- */
  totalDueUntil(dateStr) {
    return Utils.sum(this.pendingInstallments().filter(p => p.cuota.dueDate <= dateStr).map(p => p.cuota.value));
  },

  /* --- INGRESOS / EGRESOS DE UN MES (clave YYYY-MM) --- */
  monthFlow(monthKey) {
    const exps = Repos.expenses.where(e => Utils.monthKey(e.date) === monthKey);
    const income = Utils.sum(exps.filter(e => e.type === 'ingreso'), e => e.amount);
    const outflow = Utils.sum(exps.filter(e => e.type !== 'ingreso'), e => e.amount);
    return { income, outflow, net: income - outflow };
  },

  /* --- NETO Y FLUJO POR MÉTODO (débito / efectivo / crédito) --- */
  methodNet(method) {
    const exps = Repos.expenses.where(e => e.method === method);
    return Utils.sum(exps.filter(e => e.type === 'ingreso'), e => e.amount) - Utils.sum(exps.filter(e => e.type !== 'ingreso'), e => e.amount);
  },
  methodFlow(method, months) {
    return months.map(m => {
      const exps = Repos.expenses.where(e => e.method === method && Utils.monthKey(e.date) === m);
      return { income: Utils.sum(exps.filter(e => e.type === 'ingreso'), e => e.amount), outflow: Utils.sum(exps.filter(e => e.type !== 'ingreso'), e => e.amount) };
    });
  },

  /* --- BALANCE GLOBAL (saldo disponible aproximado) --- */
  balance() {
    const income = Utils.sum(Repos.expenses.where(e => e.type === 'ingreso'), e => e.amount);
    // egresos a débito/efectivo restan de inmediato; crédito resta lo ya pagado
    const exps = Repos.expenses.where(e => e.type !== 'ingreso');
    let spent = 0;
    exps.forEach(e => {
      if (e.method === 'credito') spent += this.expenseTotals(this.refreshInstallmentStatus(e)).paid;
      else spent += e.amount;
    });
    return income - spent;
  },

  /* --- PRÓXIMO PAGO / PRÓXIMO CORTE --- */
  nextPayment() {
    const p = this.pendingInstallments()[0];
    return p ? { date: p.cuota.dueDate, amount: p.cuota.value, label: p.expense.entity } : null;
  },
  nextCut() {
    const today = Utils.todayStr();
    const cuts = Repos.cards.where(c => c.type === 'credito').map(c => {
      const dates = this.billingDates(c, today);
      return { date: dates.cut, card: c };
    }).filter(x => x.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    return cuts[0] || null;
  },

  /* --- PRESUPUESTO CONSUMIDO (mes actual) --- */
  budgetStatus(budget, monthKey) {
    const spent = Utils.sum(
      Repos.expenses.where(e => e.type !== 'ingreso' && e.category === budget.category && Utils.monthKey(e.date) === monthKey),
      e => e.amount
    );
    const pct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    return { spent, pct, remaining: budget.limit - spent };
  },
};
