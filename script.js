import firebaseService from './firebase-service.js';

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
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    
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
    } else {
        showNotification(`Error: ${result.error}`, 'error');
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
    // You can add auth forms to your HTML or create them dynamically
    console.log('User needs to sign in');
}

function hideAuthForms() {
    // Hide auth forms when user is signed in
    console.log('User is signed in');
}

function showNotification(message, type) {
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
        notification.remove();
    }, 3000);
}

// Make firebaseService globally available for inline event handlers
window.firebaseService = firebaseService;
