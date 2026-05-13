let investments = {};
let goal = null;
let fireData = null;
let editingPurchase = null;
let editingInvestment = null;

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const compressed = urlParams.get('d');
    if (compressed) {
        try {
            const json = LZString.decompressFromEncodedURIComponent(compressed);
            const data = JSON.parse(json);
            investments = data.investments || {};
            goal = data.goal || null;
            fireData = data.fireData || null;
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }
    render();
}

function saveToURL() {
    const json = JSON.stringify({ investments, goal, fireData });
    const compressed = LZString.compressToEncodedURIComponent(json);
    window.history.replaceState({}, '', `${window.location.pathname}?d=${compressed}`);
}

function sharePortfolio() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = document.getElementById('shareBtn');
        const original = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = original, 2000);
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function toggleForm() {
    const form = document.getElementById('addForm');
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
        document.getElementById('date').value = getTodayDate();
        document.getElementById('unitDate').value = getTodayDate();
        document.getElementById('investmentType').value = 'regular';
        toggleInvestmentType();
    }
}

function toggleInvestmentType() {
    const type = document.getElementById('investmentType').value;
    document.getElementById('regularFields').classList.toggle('hidden', type !== 'regular');
    document.getElementById('unitFields').classList.toggle('hidden', type !== 'unit');
}

function addInvestment() {
    const name = document.getElementById('investmentName').value.trim();
    const type = document.getElementById('investmentType').value;

    if (!name) { alert('Please enter investment name'); return; }

    const key = name.toLowerCase().replace(/\s+/g, '_');
    if (investments[key]) { alert('Investment with this name already exists'); return; }

    if (type === 'regular') {
        const amount = parseFloat(document.getElementById('amount').value);
        const date = document.getElementById('date').value;
        const currentValue = parseFloat(document.getElementById('currentValue').value);

        if (!amount || !date || !currentValue) { alert('Please fill all fields'); return; }

        investments[key] = {
            name, type: 'regular',
            currentValue,
            purchases: [{ amount, date, id: Date.now() }]
        };

        document.getElementById('amount').value = '';
        document.getElementById('currentValue').value = '';
    } else {
        const unitLabel = document.getElementById('unitLabel').value.trim() || 'units';
        const units = parseFloat(document.getElementById('unitAmount').value);
        const pricePerUnit = parseFloat(document.getElementById('unitPrice').value);
        const date = document.getElementById('unitDate').value;
        const currentRate = parseFloat(document.getElementById('unitCurrentRate').value);
        const karat = parseInt(document.getElementById('unitKarat').value);

        if (!units || !pricePerUnit || !date || !currentRate) { alert('Please fill all fields'); return; }

        investments[key] = {
            name, type: 'unit', unitLabel,
            currentRate,
            purchases: [{ units, pricePerUnit, amount: units * pricePerUnit, date, karat, id: Date.now() }]
        };

        document.getElementById('unitLabel').value = '';
        document.getElementById('unitAmount').value = '';
        document.getElementById('unitPrice').value = '';
        document.getElementById('unitCurrentRate').value = '';
        document.getElementById('unitKarat').value = '24';
    }

    document.getElementById('investmentName').value = '';
    document.getElementById('date').value = getTodayDate();
    document.getElementById('unitDate').value = getTodayDate();

    toggleForm();
    saveToURL();
    render();
}

function deleteInvestment(key) {
    if (confirm('Delete this investment?')) {
        delete investments[key];
        saveToURL();
        render();
    }
}

function deletePurchase(invKey, purchaseId) {
    investments[invKey].purchases = investments[invKey].purchases.filter(p => p.id !== purchaseId);

    if (investments[invKey].purchases.length === 0) {
        delete investments[invKey];
    }

    saveToURL();
    render();
}

function togglePurchaseForm(key) {
    const form = document.getElementById(`purchase-form-${key}`);
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
        document.getElementById(`purchase-date-${key}`).value = getTodayDate();
    }
}

function addPurchase(key) {
    const inv = investments[key];
    const date = document.getElementById(`purchase-date-${key}`).value;

    if (inv.type === 'unit') {
        const units = parseFloat(document.getElementById(`purchase-units-${key}`).value);
        const pricePerUnit = parseFloat(document.getElementById(`purchase-price-${key}`).value);
        const karat = parseInt(document.getElementById(`purchase-karat-${key}`).value);

        if (!units || !pricePerUnit || !date) { alert('Please fill all fields'); return; }

        inv.purchases.push({ units, pricePerUnit, amount: units * pricePerUnit, date, karat, id: Date.now() + Math.random() });
    } else {
        const amount = parseFloat(document.getElementById(`purchase-amount-${key}`).value);

        if (!amount || !date) { alert('Please fill amount and date'); return; }

        inv.purchases.push({ amount, date, id: Date.now() + Math.random() });
    }

    togglePurchaseForm(key);
    saveToURL();
    render();
}

function editInvestment(key) {
    const inv = investments[key];
    editingInvestment = key;

    document.getElementById('editInvestmentName').value = inv.name;
    if (inv.type === 'unit') {
        document.getElementById('editValueLabel').textContent = `Current Rate per ${inv.unitLabel} (₹)`;
        document.getElementById('editInvestmentValue').value = inv.currentRate;
    } else {
        document.getElementById('editValueLabel').textContent = 'Current Value (₹)';
        document.getElementById('editInvestmentValue').value = inv.currentValue;
    }
    document.getElementById('editInvestmentModal').classList.add('show');
}

function closeEditInvestmentModal() {
    document.getElementById('editInvestmentModal').classList.remove('show');
    editingInvestment = null;
}

function saveEditInvestment() {
    if (!editingInvestment) return;

    const newName = document.getElementById('editInvestmentName').value.trim();
    const newValue = parseFloat(document.getElementById('editInvestmentValue').value);

    if (!newName || !newValue || newValue < 0) {
        alert('Please enter valid name and current value');
        return;
    }

    const newKey = newName.toLowerCase().replace(/\s+/g, '_');
    const oldKey = editingInvestment;

    if (newKey !== oldKey && investments[newKey]) {
        alert('Investment with this name already exists');
        return;
    }

    const isUnit = investments[oldKey].type === 'unit';

    if (newKey !== oldKey) {
        investments[newKey] = { ...investments[oldKey], name: newName };
        delete investments[oldKey];
    } else {
        investments[oldKey].name = newName;
    }

    if (isUnit) {
        investments[newKey || oldKey].currentRate = newValue;
    } else {
        investments[newKey || oldKey].currentValue = newValue;
    }

    saveToURL();
    render();
    closeEditInvestmentModal();
}

function editPurchase(invKey, purchaseId) {
    const inv = investments[invKey];
    const purchase = inv.purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    editingPurchase = { invKey, purchaseId };
    const isUnit = inv.type === 'unit';

    document.getElementById('editPurchaseRegularFields').classList.toggle('hidden', isUnit);
    document.getElementById('editPurchaseUnitFields').classList.toggle('hidden', !isUnit);

    if (isUnit) {
        document.getElementById('editPurchaseUnitsLabel').textContent = `Units (${inv.unitLabel})`;
        document.getElementById('editPurchasePriceLabel').textContent = `Price per ${inv.unitLabel} (₹)`;
        document.getElementById('editPurchaseUnits').value = purchase.units;
        document.getElementById('editPurchasePrice').value = purchase.pricePerUnit;
        document.getElementById('editPurchaseKarat').value = purchase.karat || 24;
    } else {
        document.getElementById('editPurchaseAmount').value = purchase.amount;
    }

    document.getElementById('editPurchaseDate').value = purchase.date;
    document.getElementById('editPurchaseModal').classList.add('show');
}

function closeEditPurchaseModal() {
    document.getElementById('editPurchaseModal').classList.remove('show');
    editingPurchase = null;
}

function saveEditPurchase() {
    if (!editingPurchase) return;

    const inv = investments[editingPurchase.invKey];
    const date = document.getElementById('editPurchaseDate').value;
    if (!date) { alert('Please fill all fields'); return; }

    const purchase = inv.purchases.find(p => p.id === editingPurchase.purchaseId);
    if (!purchase) { closeEditPurchaseModal(); return; }

    if (inv.type === 'unit') {
        const units = parseFloat(document.getElementById('editPurchaseUnits').value);
        const pricePerUnit = parseFloat(document.getElementById('editPurchasePrice').value);
        const karat = parseInt(document.getElementById('editPurchaseKarat').value);
        if (!units || !pricePerUnit) { alert('Please fill all fields'); return; }
        purchase.units = units;
        purchase.pricePerUnit = pricePerUnit;
        purchase.amount = units * pricePerUnit;
        purchase.karat = karat;
    } else {
        const amount = parseFloat(document.getElementById('editPurchaseAmount').value);
        if (!amount) { alert('Please fill all fields'); return; }
        purchase.amount = amount;
    }

    purchase.date = date;
    saveToURL();
    render();
    closeEditPurchaseModal();
}

function copyAsText() {
    const lines = [];
    const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    lines.push(`Net Worth Summary — ${now}`);
    lines.push('='.repeat(40));

    let totalInvested = 0;
    let totalCurrent = 0;

    Object.values(investments).forEach(inv => {
        const invested = inv.purchases.reduce((sum, p) => sum + p.amount, 0);
        const currentValue = getComputedCurrentValue(inv);
        const returns = currentValue - invested;
        const pct = invested > 0 ? ((returns / invested) * 100).toFixed(1) : '0.0';
        const isUnit = inv.type === 'unit';
        const totalUnits = isUnit ? getTotalUnits(inv) : 0;

        totalInvested += invested;
        totalCurrent += currentValue;

        lines.push('');
        lines.push(`${inv.name}${isUnit ? ` (${inv.unitLabel})` : ''}`);
        lines.push('-'.repeat(30));
        if (isUnit) {
            lines.push(`  Total: ${totalUnits} ${inv.unitLabel} @ ₹${inv.currentRate.toLocaleString('en-IN')}/${inv.unitLabel}`);
        }
        lines.push(`  Invested:      ${formatCurrency(invested)}`);
        lines.push(`  Current Value: ${formatCurrency(currentValue)}`);
        lines.push(`  Returns:       ${returns >= 0 ? '+' : ''}${formatCurrency(returns)} (${returns >= 0 ? '+' : ''}${pct}%)`);

        const sorted = [...inv.purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
        lines.push(`  Purchases (${sorted.length}):`);
        sorted.forEach(p => {
            const dateStr = formatDate(p.date);
            if (isUnit) {
                lines.push(`    ${dateStr}: ${p.units} ${inv.unitLabel} @ ₹${p.pricePerUnit.toLocaleString('en-IN')} · ${p.karat || 24}kt = ${formatCurrency(p.amount)}`);
            } else {
                lines.push(`    ${dateStr}: ${formatCurrency(p.amount)}`);
            }
        });
    });

    const totalReturns = totalCurrent - totalInvested;
    const totalPct = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(1) : '0.0';

    lines.push('');
    lines.push('='.repeat(40));
    lines.push(`Total Invested:  ${formatCurrency(totalInvested)}`);
    lines.push(`Current Value:   ${formatCurrency(totalCurrent)}`);
    lines.push(`Total Returns:   ${totalReturns >= 0 ? '+' : ''}${formatCurrency(totalReturns)} (${totalReturns >= 0 ? '+' : ''}${totalPct}%)`);

    if (goal) {
        const progress = ((totalCurrent / goal) * 100).toFixed(1);
        lines.push(`Goal:            ${formatCurrency(goal)} (${progress}% reached)`);
    }

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyTextBtn');
        const original = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = original, 2000);
    });
}


function openGoalModal() {
    if (goal) {
        document.getElementById('goalInput').value = goal;
    }
    document.getElementById('goalModal').classList.add('show');
}

function closeGoalModal() {
    document.getElementById('goalModal').classList.remove('show');
}

function saveGoal() {
    const goalValue = parseFloat(document.getElementById('goalInput').value);
    if (!goalValue || goalValue <= 0) {
        alert('Please enter a valid goal amount');
        return;
    }
    goal = goalValue;
    saveToURL();
    render();
    closeGoalModal();
}

function clearGoal() {
    if (confirm('Clear your net worth goal?')) {
        goal = null;
        saveToURL();
        render();
        closeGoalModal();
    }
}

function openFireModal() {
    if (fireData) {
        document.getElementById('annualExpenses').value = fireData.expenses;
        document.getElementById('expectedReturn').value = fireData.returnRate;
    }
    document.getElementById('fireModal').classList.add('show');
}

function closeFireModal() {
    document.getElementById('fireModal').classList.remove('show');
}

function calculateFire() {
    const expenses = parseFloat(document.getElementById('annualExpenses').value);
    const returnRate = parseFloat(document.getElementById('expectedReturn').value) / 100;

    if (!expenses || expenses <= 0) {
        alert('Please enter valid annual expenses');
        return;
    }

    const fireAmount = expenses * 25;
    const currentNetWorth = Object.values(investments).reduce((sum, inv) => sum + inv.currentValue, 0);
    const needed = fireAmount - currentNetWorth;

    fireData = {
        expenses,
        returnRate: returnRate * 100,
        fireAmount,
        currentNetWorth
    };

    document.getElementById('fireAmount').textContent = formatCurrency(fireAmount);
    document.getElementById('amountNeeded').textContent = formatCurrency(Math.max(0, needed));

    if (needed > 0 && returnRate > 0) {
        const years = Math.log(fireAmount / currentNetWorth) / Math.log(1 + returnRate);
        const yearsText = years > 0 ? `${years.toFixed(1)} years` : 'Already achieved! 🎉';
        document.getElementById('yearsToFire').textContent = yearsText;
    } else if (needed <= 0) {
        document.getElementById('yearsToFire').textContent = 'Already achieved! 🎉';
    } else {
        document.getElementById('yearsToFire').textContent = 'Add expected return rate';
    }

    document.getElementById('fireResults').style.display = 'block';
    saveToURL();
    render();
}

function getTotalUnits(inv) {
    return inv.purchases.reduce((sum, p) => sum + (p.units || 0), 0);
}

function getComputedCurrentValue(inv) {
    if (inv.type === 'unit') {
        return inv.purchases.reduce((sum, p) => {
            const purity = (p.karat || 24) / 24;
            return sum + (p.units || 0) * purity * (inv.currentRate || 0);
        }, 0);
    }
    return inv.currentValue || 0;
}

function getPureUnitEquivalent(inv) {
    return inv.purchases.reduce((sum, p) => {
        const purity = (p.karat || 24) / 24;
        return sum + (p.units || 0) * purity;
    }, 0);
}

function render() {
    let totalInvested = 0;
    let totalCurrent = 0;

    Object.values(investments).forEach(inv => {
        const invested = inv.purchases.reduce((sum, p) => sum + p.amount, 0);
        totalInvested += invested;
        totalCurrent += getComputedCurrentValue(inv);
    });

    const totalReturns = totalCurrent - totalInvested;
    const percentage = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : 0;

    document.getElementById('totalInvested').textContent = formatCurrency(totalInvested);
    document.getElementById('totalCurrent').textContent = formatCurrency(totalCurrent);
    document.getElementById('totalReturns').textContent = formatCurrency(totalReturns);
    document.getElementById('totalReturns').className = `stat-value ${totalReturns >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('totalReturnsPercent').textContent = `${totalReturns >= 0 ? '+' : ''}${percentage}%`;
    document.getElementById('totalReturnsPercent').className = `stat-label ${totalReturns >= 0 ? 'positive' : 'negative'}`;

    if (goal && goal > 0) {
        const progress = Math.min((totalCurrent / goal) * 100, 100);
        document.getElementById('goalProgressText').textContent = `${formatCurrency(totalCurrent)} / ${formatCurrency(goal)}`;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressPercent').textContent = `${progress.toFixed(1)}%`;
        document.getElementById('currentAmount').textContent = formatCurrency(totalCurrent);
        document.getElementById('goalAmount').textContent = formatCurrency(goal);
        document.getElementById('progressBarContainer').style.display = 'block';
        document.getElementById('progressLabel').style.display = 'flex';
    } else {
        document.getElementById('goalProgressText').textContent = 'Set a goal to track progress';
        document.getElementById('progressBarContainer').style.display = 'none';
        document.getElementById('progressLabel').style.display = 'none';
    }

    if (fireData) {
        document.getElementById('fireNumber').textContent = formatCurrency(fireData.fireAmount);
        const needed = fireData.fireAmount - totalCurrent;
        if (needed <= 0) {
            document.getElementById('fireYears').textContent = '🎉 FIRE achieved!';
            document.getElementById('fireYears').className = 'stat-label positive';
        } else {
            document.getElementById('fireYears').textContent = `${formatCurrency(needed)} to go`;
            document.getElementById('fireYears').className = 'stat-label';
        }
    }

    const container = document.getElementById('investments');
    const empty = document.getElementById('emptyState');
    const hasInvestments = Object.keys(investments).length > 0;

    if (!hasInvestments) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    container.innerHTML = Object.entries(investments).map(([key, inv]) => {
        const invested = inv.purchases.reduce((sum, p) => sum + p.amount, 0);
        const currentValue = getComputedCurrentValue(inv);
        const returns = currentValue - invested;
        const pct = invested > 0 ? ((returns / invested) * 100).toFixed(2) : 0;
        const isUnit = inv.type === 'unit';
        const totalUnits = isUnit ? getTotalUnits(inv) : 0;

        const pureEquiv = isUnit ? getPureUnitEquivalent(inv) : 0;
        const hasMixedKarat = isUnit && inv.purchases.some(p => (p.karat || 24) < 24);
        const unitExtraStats = isUnit ? `
            <div>
                <div class="stat-label">Total ${inv.unitLabel}</div>
                <div style="font-weight: 600;">${totalUnits.toLocaleString('en-IN')} ${inv.unitLabel}</div>
            </div>
            ${hasMixedKarat ? `
            <div>
                <div class="stat-label">Pure 24kt Eq.</div>
                <div style="font-weight: 600;">${pureEquiv.toFixed(2)} ${inv.unitLabel}</div>
            </div>` : ''}
            <div>
                <div class="stat-label">Rate / ${inv.unitLabel} (24kt)</div>
                <div style="font-weight: 600;">${formatCurrency(inv.currentRate)}</div>
            </div>
        ` : '';

        const purchaseFormFields = isUnit ? `
            <div class="purchase-form-grid">
                <div class="form-group">
                    <label class="form-label">Units (${inv.unitLabel})</label>
                    <input type="number" class="form-input" id="purchase-units-${key}" step="any">
                </div>
                <div class="form-group">
                    <label class="form-label">Price / ${inv.unitLabel} (₹)</label>
                    <input type="number" class="form-input" id="purchase-price-${key}" step="any">
                </div>
                <div class="form-group">
                    <label class="form-label">Karat</label>
                    <select class="form-input" id="purchase-karat-${key}">
                        <option value="24">24kt (Pure)</option>
                        <option value="22">22kt</option>
                        <option value="18">18kt</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-input" id="purchase-date-${key}">
                </div>
                <div class="form-group" style="justify-content: flex-end;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" onclick="addPurchase('${key}')">Add</button>
                        <button class="btn btn-secondary" onclick="togglePurchaseForm('${key}')">Cancel</button>
                    </div>
                </div>
            </div>
        ` : `
            <div class="purchase-form-grid">
                <div class="form-group">
                    <label class="form-label">Amount (₹)</label>
                    <input type="number" class="form-input" id="purchase-amount-${key}">
                </div>
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-input" id="purchase-date-${key}">
                </div>
                <div class="form-group" style="justify-content: flex-end;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" onclick="addPurchase('${key}')">Add</button>
                        <button class="btn btn-secondary" onclick="togglePurchaseForm('${key}')">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        const tableRows = inv.purchases.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => `
            <tr>
                <td>${formatDate(p.date)}</td>
                ${isUnit ? `<td style="text-align:right;">${p.units} ${inv.unitLabel} @ ${formatCurrency(p.pricePerUnit)}/${inv.unitLabel} · <span style="color:#94a3b8;">${p.karat || 24}kt</span></td>` : ''}
                <td style="text-align:right; font-weight:600;">${formatCurrency(p.amount)}</td>
                <td style="text-align:center;">
                    <button class="btn btn-edit" onclick="editPurchase('${key}', ${p.id})" style="padding: 0.25rem 0.5rem;">✏️</button>
                    <button class="btn btn-danger" onclick="deletePurchase('${key}', ${p.id})" style="padding: 0.25rem 0.5rem;">🗑️</button>
                </td>
            </tr>
        `).join('');

        return `
        <div class="investment-card">
            <div class="investment-header">
                <div style="flex: 1;">
                    <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">${inv.name}${isUnit ? ` <span style="font-size:0.875rem; color:#94a3b8; font-weight:400;">(${inv.unitLabel})</span>` : ''}</h3>
                    <div class="investment-stats">
                        <div>
                            <div class="stat-label">Total Invested</div>
                            <div style="font-weight: 600;">${formatCurrency(invested)}</div>
                        </div>
                        <div>
                            <div class="stat-label">Current Value</div>
                            <div style="font-weight: 600;">${formatCurrency(currentValue)}</div>
                        </div>
                        ${unitExtraStats}
                        <div>
                            <div class="stat-label">Returns</div>
                            <div style="font-weight: 600;" class="${returns >= 0 ? 'positive' : 'negative'}">
                                ${returns >= 0 ? '+' : ''}${formatCurrency(returns)}
                            </div>
                        </div>
                        <div>
                            <div class="stat-label">Return %</div>
                            <div style="font-weight: 600;" class="${returns >= 0 ? 'positive' : 'negative'}">
                                ${returns >= 0 ? '+' : ''}${pct}%
                            </div>
                        </div>
                    </div>
                </div>
                <div class="investment-actions">
                    <button class="btn btn-edit" onclick="editInvestment('${key}')">✏️</button>
                    <button class="btn btn-danger" onclick="deleteInvestment('${key}')">🗑️</button>
                </div>
            </div>

            <div style="padding: 1.5rem; border-bottom: 1px solid #334155;">
                <button class="btn btn-secondary" onclick="togglePurchaseForm('${key}')">+ Add Purchase</button>
                <div id="purchase-form-${key}" class="hidden" style="margin-top: 1rem;">
                    ${purchaseFormFields}
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Purchase Date</th>
                        ${isUnit ? `<th style="text-align:right;">Units & Karat</th>` : ''}
                        <th style="text-align:right;">Amount Invested</th>
                        <th style="text-align:center;">Actions</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
        `;
    }).join('');
}

document.getElementById('date').value = getTodayDate();
loadFromURL();