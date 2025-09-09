import firebaseService from './firebase-service.js';

// DOM elements
const categoryForm = document.getElementById('categoryForm');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const categoriesGrid = document.getElementById('categoriesGrid');
const breakdownChart = document.getElementById('breakdownChart');
const transactionsByCategory = document.getElementById('transactionsByCategory');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupAuthUI();
});

function setupEventListeners() {
    // Category form submission
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategorySubmit);
    }

    // Sign in form
    if (signInForm) {
        signInForm.addEventListener('submit', handleSignIn);
    }

    // Sign up form
    if (signUpForm) {
        signUpForm.addEventListener('submit', handleSignUp);
    }

    // Auth buttons
    document.getElementById('signInBtn').addEventListener('click', () => showAuthForms());
    document.getElementById('signUpBtn').addEventListener('click', () => showAuthForms());
    document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(categoryForm);
    const category = {
        name: formData.get('categoryName'),
        goal: parseFloat(formData.get('categoryGoal')) || 0
    };

    const result = await firebaseService.addCategory(category);
    
    if (result.success) {
        categoryForm.reset();
        showNotification('Category added successfully!', 'success');
        loadSavingsData();
    } else {
        showNotification(`Error: ${result.error}`, 'error');
    }
}

async function handleSignIn(e) {
    e.preventDefault();
    
    const formData = new FormData(signInForm);
    const email = formData.get('email');
    const password = formData.get('password');

    const result = await firebaseService.signIn(email, password);
    
    if (result.success) {
        showNotification('Signed in successfully!', 'success');
        hideAuthForms();
        loadSavingsData();
    } else {
        showNotification(`Error: ${result.error}`, 'error');
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    
    const formData = new FormData(signUpForm);
    const email = formData.get('email');
    const password = formData.get('password');

    const result = await firebaseService.signUp(email, password);
    
    if (result.success) {
        showNotification('Account created successfully!', 'success');
        hideAuthForms();
        loadSavingsData();
    } else {
        showNotification(`Error: ${result.error}`, 'error');
    }
}

async function handleSignOut() {
    const result = await firebaseService.signOut();
    if (result.success) {
        showNotification('Signed out successfully!', 'success');
        clearSavingsData();
    }
}

function setupAuthUI() {
    // Check if user is already signed in
    if (firebaseService.user) {
        hideAuthForms();
        loadSavingsData();
    } else {
        showAuthForms();
    }
}

function showAuthForms() {
    document.getElementById('authForms').style.display = 'block';
    document.getElementById('signInBtn').style.display = 'none';
    document.getElementById('signUpBtn').style.display = 'none';
}

function hideAuthForms() {
    document.getElementById('authForms').style.display = 'none';
    document.getElementById('signInBtn').style.display = 'inline-block';
    document.getElementById('signUpBtn').style.display = 'inline-block';
    document.getElementById('signOutBtn').style.display = 'inline-block';
}

async function loadSavingsData() {
    if (!firebaseService.user) return;

    try {
        // Load transactions and calculate savings by category
        const transactionsResult = await firebaseService.getTransactions();
        if (transactionsResult.success) {
            const categorySavings = calculateCategorySavings(transactionsResult.transactions);
            displaySavingsData(categorySavings);
            displayTransactionsByCategory(transactionsResult.transactions);
        }
    } catch (error) {
        console.error('Error loading savings data:', error);
    }
}

function calculateCategorySavings(transactions) {
    const categoryTotals = {};
    const categoryGoals = {};

    // Initialize categories with goals
    const categories = [
        'emergency', 'vacation', 'retirement', 'house', 'car', 
        'education', 'healthcare', 'investment', 'other'
    ];

    categories.forEach(cat => {
        categoryTotals[cat] = 0;
        categoryGoals[cat] = 0; // You can set goals later
    });

    // Calculate totals by category
    transactions.forEach(transaction => {
        const category = transaction.category;
        if (categoryTotals.hasOwnProperty(category)) {
            if (transaction.type === 'income') {
                categoryTotals[category] += transaction.amount;
            } else if (transaction.type === 'expense') {
                categoryTotals[category] -= transaction.amount;
            }
        }
    });

    return { categoryTotals, categoryGoals };
}

function displaySavingsData(savingsData) {
    const { categoryTotals, categoryGoals } = savingsData;
    
    // Calculate total savings
    const totalSavings = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    document.getElementById('totalSavings').textContent = `$${totalSavings.toFixed(2)}`;

    // Display categories grid
    categoriesGrid.innerHTML = Object.entries(categoryTotals).map(([category, amount]) => {
        const goal = categoryGoals[category] || 0;
        const progress = goal > 0 ? (amount / goal) * 100 : 0;
        const isPositive = amount >= 0;
        
        return `
            <div class="category-card ${isPositive ? 'positive' : 'negative'}">
                <div class="category-header">
                    <h3>${formatCategoryName(category)}</h3>
                    <span class="category-amount ${isPositive ? 'positive' : 'negative'}">
                        $${Math.abs(amount).toFixed(2)}
                    </span>
                </div>
                ${goal > 0 ? `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    <p class="goal-text">Goal: $${goal.toFixed(2)}</p>
                ` : ''}
            </div>
        `;
    }).join('');

    // Display breakdown chart
    displayBreakdownChart(categoryTotals);
}

function displayBreakdownChart(categoryTotals) {
    const chartData = Object.entries(categoryTotals)
        .filter(([_, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1]);

    if (chartData.length === 0) {
        breakdownChart.innerHTML = '<p>No savings data available</p>';
        return;
    }

    const maxAmount = Math.max(...chartData.map(([_, amount]) => amount));
    
    breakdownChart.innerHTML = chartData.map(([category, amount]) => {
        const percentage = (amount / maxAmount) * 100;
        return `
            <div class="chart-item">
                <div class="chart-label">
                    <span class="category-name">${formatCategoryName(category)}</span>
                    <span class="category-value">$${amount.toFixed(2)}</span>
                </div>
                <div class="chart-bar">
                    <div class="chart-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function displayTransactionsByCategory(transactions) {
    const transactionsByCat = {};
    
    // Group transactions by category
    transactions.forEach(transaction => {
        if (!transactionsByCat[transaction.category]) {
            transactionsByCat[transaction.category] = [];
        }
        transactionsByCat[transaction.category].push(transaction);
    });

    // Display transactions grouped by category
    transactionsByCategory.innerHTML = Object.entries(transactionsByCat).map(([category, categoryTransactions]) => {
        const categoryTotal = categoryTransactions.reduce((sum, t) => {
            return sum + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);

        return `
            <div class="category-transactions">
                <h3>${formatCategoryName(category)} 
                    <span class="category-total ${categoryTotal >= 0 ? 'positive' : 'negative'}">
                        $${Math.abs(categoryTotal).toFixed(2)}
                    </span>
                </h3>
                <div class="transaction-list">
                    ${categoryTransactions.slice(0, 5).map(transaction => `
                        <div class="transaction-item ${transaction.type}">
                            <div class="transaction-info">
                                <h4>${transaction.description}</h4>
                                <p class="transaction-date">${new Date(transaction.createdAt.toDate()).toLocaleDateString()}</p>
                            </div>
                            <div class="transaction-amount">
                                <span class="amount ${transaction.type}">
                                    ${transaction.type === 'income' ? '+' : '-'}$${Math.abs(transaction.amount).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                    ${categoryTransactions.length > 5 ? `<p class="more-transactions">+${categoryTransactions.length - 5} more transactions</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
}

function clearSavingsData() {
    document.getElementById('totalSavings').textContent = '$0.00';
    categoriesGrid.innerHTML = '<p>Please sign in to view your savings</p>';
    breakdownChart.innerHTML = '<p>Please sign in to view your savings breakdown</p>';
    transactionsByCategory.innerHTML = '<p>Please sign in to view your transactions</p>';
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        ${type === 'success' ? 'background-color: #4CAF50;' : 'background-color: #f44336;'}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Make firebaseService globally available
window.firebaseService = firebaseService;
