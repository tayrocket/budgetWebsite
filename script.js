import firebaseService from './firebase-service-secure.js';

// DOM elements
const transactionForm = document.getElementById('transactionForm');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupAuthUI();
});

function setupEventListeners() {
    // Transaction form submission
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionSubmit);
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
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    if (signInBtn) {
        signInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthForms();
        });
    }

    if (signUpBtn) {
        signUpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthForms();
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleSignOut();
        });
    }
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(transactionForm);
        const transaction = {
            description: formData.get('description'),
            amount: formData.get('amount'),
            type: formData.get('type'),
            category: formData.get('category')
        };

        const result = await firebaseService.addTransaction(transaction);
        
        if (result.success) {
            transactionForm.reset();
            showNotification('Transaction added successfully!', 'success');
        } else {
            showNotification(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Transaction error:', error);
        showNotification('An error occurred while adding the transaction', 'error');
    }
}

async function handleSignIn(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(signInForm);
        const email = formData.get('email');
        const password = formData.get('password');

        const result = await firebaseService.signIn(email, password);
        
        if (result.success) {
            showNotification('Signed in successfully!', 'success');
            hideAuthForms();
        } else {
            showNotification(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        showNotification('An error occurred while signing in', 'error');
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(signUpForm);
        const email = formData.get('email');
        const password = formData.get('password');

        const result = await firebaseService.signUp(email, password);
        
        if (result.success) {
            showNotification('Account created successfully!', 'success');
            hideAuthForms();
        } else {
            showNotification(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Sign up error:', error);
        showNotification('An error occurred while creating account', 'error');
    }
}

async function handleSignOut() {
    try {
        const result = await firebaseService.signOut();
        if (result.success) {
            showNotification('Signed out successfully!', 'success');
            showAuthForms();
        } else {
            showNotification(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Sign out error:', error);
        showNotification('An error occurred while signing out', 'error');
    }
}

function setupAuthUI() {
    // Check if user is already signed in
    if (firebaseService.user) {
        hideAuthForms();
    } else {
        showAuthForms();
    }
}

function showAuthForms() {
    const authForms = document.getElementById('authForms');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    if (authForms) authForms.style.display = 'block';
    if (signInBtn) signInBtn.style.display = 'none';
    if (signUpBtn) signUpBtn.style.display = 'none';
    if (signOutBtn) signOutBtn.style.display = 'none';
}

function hideAuthForms() {
    const authForms = document.getElementById('authForms');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    if (authForms) authForms.style.display = 'none';
    if (signInBtn) signInBtn.style.display = 'inline-block';
    if (signUpBtn) signUpBtn.style.display = 'inline-block';
    if (signOutBtn) signOutBtn.style.display = 'inline-block';
}

function showNotification(message, type) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create a simple notification system
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add styles
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
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Make firebaseService globally available for inline event handlers
window.firebaseService = firebaseService;
