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
    urlParams.forEach((value, key) => {
        try {
            if (key === 'goal') {
                goal = JSON.parse(decodeURIComponent(value));
            } else if (key === 'fire') {
                fireData = JSON.parse(decodeURIComponent(value));
            } else {
                investments[key] = JSON.parse(decodeURIComponent(value));
            }
        } catch (e) {
            console.error('Error parsing:', e);
        }
    });
    render();
}

function saveToURL() {
    const params = new URLSearchParams();
    Object.entries(investments).forEach(([key, data]) => {
        params.set(key, encodeURIComponent(JSON.stringify(data)));
    });
    if (goal) {
        params.set('goal', encodeURIComponent(JSON.stringify(goal)));
    }
    if (fireData) {
        params.set('fire', encodeURIComponent(JSON.stringify(fireData)));
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
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
    }
}

function addInvestment() {
    const name = document.getElementById('investmentName').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const currentValue = parseFloat(document.getElementById('currentValue').value);

    if (!name || !amount || !date || !currentValue) {
        alert('Please fill all fields');
        return;
    }

    const key = name.toLowerCase().replace(/\s+/g, '_');
    if (investments[key]) {
        alert('Investment with this name already exists');
        return;
    }

    investments[key] = {
        name,
        currentValue,
        purchases: [{ amount, date, id: Date.now() }]
    };

    document.getElementById('investmentName').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('date').value = getTodayDate();
    document.getElementById('currentValue').value = '';

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
    const amount = parseFloat(document.getElementById(`purchase-amount-${key}`).value);
    const date = document.getElementById(`purchase-date-${key}`).value;

    if (!amount || !date) {
        alert('Please fill amount and date');
        return;
    }

    investments[key].purchases.push({
        amount,
        date,
        id: Date.now() + Math.random()
    });

    document.getElementById(`purchase-amount-${key}`).value = '';
    document.getElementById(`purchase-date-${key}`).value = getTodayDate();

    togglePurchaseForm(key);
    saveToURL();
    render();
}

function editInvestment(key) {
    const inv = investments[key];
    editingInvestment = key;
    
    document.getElementById('editInvestmentName').value = inv.name;
    document.getElementById('editInvestmentValue').value = inv.currentValue;
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

    if (newKey !== oldKey) {
        investments[newKey] = { 
            ...investments[oldKey], 
            name: newName, 
            currentValue: newValue 
        };
        delete investments[oldKey];
    } else {
        investments[oldKey].name = newName;
        investments[oldKey].currentValue = newValue;
    }

    saveToURL();
    render();
    closeEditInvestmentModal();
}

function editPurchase(invKey, purchaseId) {
    const purchase = investments[invKey].purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    editingPurchase = { invKey, purchaseId };
    document.getElementById('editPurchaseAmount').value = purchase.amount;
    document.getElementById('editPurchaseDate').value = purchase.date;
    document.getElementById('editPurchaseModal').classList.add('show');
}

function closeEditPurchaseModal() {
    document.getElementById('editPurchaseModal').classList.remove('show');
    editingPurchase = null;
}

function saveEditPurchase() {
    if (!editingPurchase) return;

    const amount = parseFloat(document.getElementById('editPurchaseAmount').value);
    const date = document.getElementById('editPurchaseDate').value;

    if (!amount || !date) {
        alert('Please fill all fields');
        return;
    }

    const purchase = investments[editingPurchase.invKey].purchases.find(
        p => p.id === editingPurchase.purchaseId
    );

    if (purchase) {
        purchase.amount = amount;
        purchase.date = date;
        saveToURL();
        render();
    }

    closeEditPurchaseModal();
}

function sharePortfolio() {
    navigator.clipboard.writeText(window.location.href);
    alert('URL copied to clipboard! Share this link to view your portfolio.');
}

function bookmarkPage() {
    const pageTitle = 'My Net Worth Tracker';
    const pageUrl = window.location.href;

    if ('addBookmark' in window) {
        try {
            window.addBookmark(pageUrl, pageTitle);
            alert('✅ Bookmark saved/updated!');
            return;
        } catch (e) {
            console.log('addBookmark not supported');
        }
    }

    if (window.sidebar && window.sidebar.addPanel) {
        try {
            window.sidebar.addPanel(pageTitle, pageUrl, '');
            alert('✅ Bookmark saved/updated in Firefox!');
            return;
        } catch (e) {
            console.log('Firefox bookmark failed');
        }
    }

    if (window.external && ('AddFavorite' in window.external)) {
        try {
            window.external.AddFavorite(pageUrl, pageTitle);
            alert('✅ Bookmark saved/updated!');
            return;
        } catch (e) {
            console.log('IE/Edge bookmark failed');
        }
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? '⌘ Cmd+D' : 'Ctrl+D';
    
    navigator.clipboard.writeText(pageUrl).then(() => {
        alert(`🔖 To bookmark/update this page:\n\n1. Press ${shortcut}\n2. Confirm the bookmark\n\n💡 Your URL has been copied to clipboard!\n\nBookmarking will save all your current data. When you update investments and bookmark again, it will UPDATE your existing bookmark with the new data.`);
    }).catch(() => {
        alert(`🔖 To bookmark/update this page:\n\nPress ${shortcut} and confirm\n\nThis will save all your current data and UPDATE any existing bookmark!`);
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

function render() {
    let totalInvested = 0;
    let totalCurrent = 0;

    Object.values(investments).forEach(inv => {
        const invested = inv.purchases.reduce((sum, p) => sum + p.amount, 0);
        totalInvested += invested;
        totalCurrent += inv.currentValue;
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
        const returns = inv.currentValue - invested;
        const pct = invested > 0 ? ((returns / invested) * 100).toFixed(2) : 0;

        return `
        <div class="investment-card">
            <div class="investment-header">
                <div style="flex: 1;">
                    <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">${inv.name}</h3>
                    <div class="investment-stats">
                        <div>
                            <div class="stat-label">Total Invested</div>
                            <div style="font-weight: 600;">${formatCurrency(invested)}</div>
                        </div>
                        <div>
                            <div class="stat-label">Current Value</div>
                            <div style="font-weight: 600;">${formatCurrency(inv.currentValue)}</div>
                        </div>
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
                    <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: end;">
                        <div class="form-group">
                            <label class="form-label">Amount (₹)</label>
                            <input type="number" class="form-input" id="purchase-amount-${key}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Date</label>
                            <input type="date" class="form-input" id="purchase-date-${key}">
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-primary" onclick="addPurchase('${key}')">Add</button>
                            <button class="btn btn-secondary" onclick="togglePurchaseForm('${key}')">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Purchase Date</th>
                        <th style="text-align:right;">Amount Invested</th>
                        <th style="text-align:center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${inv.purchases.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => `
                        <tr>
                            <td>${formatDate(p.date)}</td>
                            <td style="text-align:right; font-weight:600;">${formatCurrency(p.amount)}</td>
                            <td style="text-align:center;">
                                <button class="btn btn-edit" onclick="editPurchase('${key}', ${p.id})" style="padding: 0.25rem 0.5rem;">✏️</button>
                                <button class="btn btn-danger" onclick="deletePurchase('${key}', ${p.id})" style="padding: 0.25rem 0.5rem;">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        `;
    }).join('');
}

document.getElementById('date').value = getTodayDate();
loadFromURL();