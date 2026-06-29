"use strict";

/* ----------------------------------------------------------------
 * 17) ASISTENTE FINANCIERO (IA basada en reglas)
 * ---------------------------------------------------------------- */
const Insights = {
  generate() {
    const out = [];
    const mkNow = Utils.monthKey(Utils.todayStr());
    const prev = Charts.lastMonths(2)[0];
    const now = Engine.monthFlow(mkNow), before = Engine.monthFlow(prev);

    // 1) Comparativa de gasto por categoría
    const catNow = {}, catPrev = {};
    Repos.expenses.where(e => e.type !== 'ingreso').forEach(e => {
      const mk = Utils.monthKey(e.date);
      if (mk === mkNow) catNow[e.category] = (catNow[e.category]||0) + e.amount;
      if (mk === prev) catPrev[e.category] = (catPrev[e.category]||0) + e.amount;
    });
    Object.keys(catNow).forEach(cat => {
      const p = catPrev[cat] || 0;
      if (p > 0) {
        const diff = (catNow[cat] - p) / p * 100;
        if (diff >= 15) out.push({ type: 'warn', icon: 'fa-arrow-trend-up', text: `Gastaste ${diff.toFixed(0)}% más en ${cat} este mes (${Utils.money(catNow[cat])} vs ${Utils.money(p)}).` });
        else if (diff <= -15) out.push({ type: 'good', icon: 'fa-arrow-trend-down', text: `Redujiste ${Math.abs(diff).toFixed(0)}% en ${cat}. ¡Buen trabajo!` });
      }
    });

    // 2) Uso de tarjetas
    Repos.cards.where(c => c.type === 'credito').forEach(c => {
      const u = Engine.cardUsage(c);
      if (u.pct >= 80) out.push({ type: 'danger', icon: 'fa-credit-card', text: `Tu tarjeta ${c.name} está al ${u.pct.toFixed(0)}% de uso. Considera bajar el saldo.` });
    });

    // 3) Presupuestos en riesgo
    Repos.budgets.all().forEach(b => {
      const s = Engine.budgetStatus(b, mkNow);
      if (s.pct >= 90) out.push({ type: 'danger', icon: 'fa-wallet', text: `Tu presupuesto de ${b.category} está al ${s.pct.toFixed(0)}%.` });
      else if (s.pct >= 70) out.push({ type: 'warn', icon: 'fa-wallet', text: `Tu presupuesto de ${b.category} se encuentra en riesgo (${s.pct.toFixed(0)}%).` });
    });

    // 4) Ahorro potencial (categoría más cara)
    const topCat = Object.entries(catNow).sort((a, b) => b[1] - a[1])[0];
    if (topCat && topCat[1] > 0) out.push({ type: 'tip', icon: 'fa-lightbulb', text: `Tu mayor gasto del mes es ${topCat[0]} (${Utils.money(topCat[1])}). Reducirlo 15% te ahorraría ${Utils.money(topCat[1]*0.15)}.` });

    // 5) Balance del mes
    if (now.outflow > now.income && now.income > 0) out.push({ type: 'warn', icon: 'fa-scale-unbalanced', text: `Este mes tus egresos (${Utils.money(now.outflow)}) superan tus ingresos (${Utils.money(now.income)}).` });

    if (!out.length) out.push({ type: 'good', icon: 'fa-circle-check', text: 'Todo bajo control. Registra más movimientos para recibir recomendaciones personalizadas.' });
    return out;
  },
  cardHTML(list) {
    const colors = { good: 'emerald', warn: 'amber', danger: 'rose', tip: 'sky' };
    return `<div class="space-y-2">${list.map(i => `
      <div class="flex items-start gap-3 rounded-xl p-3 bg-${colors[i.type]}-50 dark:bg-${colors[i.type]}-500/10">
        <i class="fa-solid ${i.icon} text-${colors[i.type]}-500 mt-0.5"></i>
        <p class="text-sm">${i.text}</p>
      </div>`).join('')}</div>`;
  },
};
