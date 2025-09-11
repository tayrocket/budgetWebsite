import { db, auth } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';

class SecureFirebaseService {
  constructor() {
    this.user = null;
    this.authListenerSetup = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.setupAuthListener();
  }

  // Enhanced authentication with email verification
  async signUp(email, password) {
    try {
      // Validate input
      if (!this.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }
      
      if (!this.isValidPassword(password)) {
        return { success: false, error: 'Password must be at least 8 characters with uppercase, lowercase, and number' };
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      this.user = userCredential.user;
      
      // Send email verification
      await sendEmailVerification(this.user);
      
      return { 
        success: true, 
        user: this.user,
        message: 'Account created! Please check your email to verify your account.'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async signIn(email, password) {
    try {
      if (!this.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      this.user = userCredential.user;
      
      // Check if email is verified
      if (!this.user.emailVerified) {
        await signOut(auth);
        return { 
          success: false, 
          error: 'Please verify your email before signing in. Check your inbox for a verification link.',
          needsVerification: true
        };
      }
      
      return { success: true, user: this.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async signOut() {
    try {
      await signOut(auth);
      this.user = null;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  async resetPassword(email) {
    try {
      if (!this.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }
      
      await sendPasswordResetEmail(auth, email);
      return { 
        success: true, 
        message: 'Password reset email sent! Check your inbox.' 
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      if (!this.user) {
        return { success: false, error: 'User not authenticated' };
      }

      if (!this.isValidPassword(newPassword)) {
        return { success: false, error: 'New password must be at least 8 characters with uppercase, lowercase, and number' };
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(this.user.email, currentPassword);
      await reauthenticateWithCredential(this.user, credential);
      
      // Update password
      await updatePassword(this.user, newPassword);
      
      return { success: true, message: 'Password updated successfully!' };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  setupAuthListener() {
    if (this.authListenerSetup) {
      console.log('Auth listener already setup, skipping...');
      return;
    }
    
    console.log('Setting up auth listener...');
    this.authListenerSetup = true;
    
    onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
      
      if (this.user === user) {
        console.log('Same user state, skipping update');
        return;
      }
      
      this.user = user;
      
      if (user) {
        console.log('User signed in:', user.email);
        if (document.getElementById('transactionsList') && !this.isLoading) {
          this.isLoading = true;
          this.loadTransactions().finally(() => {
            this.isLoading = false;
          });
        }
      } else {
        console.log('User signed out');
        this.clearTransactions();
      }
    });
  }

  // Enhanced transaction methods with validation
  async addTransaction(transaction) {
    if (!this.user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Validate transaction data
      const validation = this.validateTransaction(transaction);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const transactionData = {
        ...transaction,
        userId: this.user.uid,
        createdAt: serverTimestamp(),
        amount: parseFloat(transaction.amount),
        description: this.sanitizeInput(transaction.description),
        category: this.sanitizeInput(transaction.category)
      };

      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Add transaction error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getTransactions(limitCount = 50) {
    if (!this.user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', this.user.uid),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions = [];
      
      querySnapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { success: true, transactions };
    } catch (error) {
      console.error('Get transactions error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateTransaction(transactionId, updates) {
    if (!this.user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Validate updates
      if (updates.amount !== undefined) {
        const validation = this.validateAmount(updates.amount);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }
        updates.amount = parseFloat(updates.amount);
      }

      if (updates.description) {
        updates.description = this.sanitizeInput(updates.description);
      }

      if (updates.category) {
        updates.category = this.sanitizeInput(updates.category);
      }

      updates.updatedAt = serverTimestamp();

      const transactionRef = doc(db, 'transactions', transactionId);
      await updateDoc(transactionRef, updates);
      return { success: true };
    } catch (error) {
      console.error('Update transaction error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async deleteTransaction(transactionId) {
    if (!this.user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      await deleteDoc(doc(db, 'transactions', transactionId));
      return { success: true };
    } catch (error) {
      console.error('Delete transaction error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Input validation methods
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  validateTransaction(transaction) {
    if (!transaction.description || transaction.description.trim().length === 0) {
      return { valid: false, error: 'Description is required' };
    }
    
    if (!transaction.amount || isNaN(transaction.amount) || transaction.amount <= 0) {
      return { valid: false, error: 'Amount must be a positive number' };
    }
    
    if (!transaction.type || !['income', 'expense'].includes(transaction.type)) {
      return { valid: false, error: 'Type must be income or expense' };
    }
    
    if (!transaction.category || transaction.category.trim().length === 0) {
      return { valid: false, error: 'Category is required' };
    }
    
    return { valid: true };
  }

  validateAmount(amount) {
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, error: 'Amount must be a positive number' };
    }
    
    if (amount > 999999.99) {
      return { valid: false, error: 'Amount too large' };
    }
    
    return { valid: true };
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().substring(0, 100); // Limit length and trim whitespace
  }

  getErrorMessage(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/weak-password': 'Password is too weak',
      'auth/invalid-email': 'Invalid email address',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'permission-denied': 'You do not have permission to perform this action'
    };
    
    return errorMessages[error.code] || error.message || 'An unexpected error occurred';
  }

  // Rate limiting (simple client-side)
  async rateLimit(action, maxAttempts = 5, windowMs = 60000) {
    const key = `rate_limit_${action}`;
    const now = Date.now();
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return { allowed: false, error: 'Too many attempts. Please wait before trying again.' };
    }
    
    recentAttempts.push(now);
    localStorage.setItem(key, JSON.stringify(recentAttempts));
    
    return { allowed: true };
  }

  // Rest of your existing methods...
  async loadTransactions() {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;

    try {
      const result = await this.getTransactions();
      if (result.success) {
        this.displayTransactions(result.transactions);
        this.updateBalance(result.transactions);
      }
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  }

  clearTransactions() {
    const transactionsList = document.getElementById('transactionsList');
    if (transactionsList) {
      transactionsList.innerHTML = `
        <div class="no-transactions">
          <i class="fas fa-receipt"></i>
          <p>Please sign in to view your transactions</p>
        </div>
      `;
    }
    this.updateBalance([]);
  }

  displayTransactions(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;
    
    if (transactions.length === 0) {
      transactionsList.innerHTML = `
        <div class="no-transactions">
          <i class="fas fa-receipt"></i>
          <p>No transactions yet. Add your first transaction above!</p>
        </div>
      `;
      return;
    }

    transactionsList.innerHTML = transactions.map(transaction => `
      <div class="transaction-item ${transaction.type}">
        <div class="transaction-info">
          <h4>${this.escapeHtml(transaction.description)}</h4>
          <p class="transaction-category">${this.escapeHtml(transaction.category)}</p>
          <p class="transaction-date">${new Date(transaction.createdAt.toDate()).toLocaleDateString()}</p>
        </div>
        <div class="transaction-amount">
          <span class="amount ${transaction.type}">
            ${transaction.type === 'income' ? '+' : '-'}$${Math.abs(transaction.amount).toFixed(2)}
          </span>
          <div class="transaction-actions">
            <button onclick="firebaseService.deleteTransaction('${transaction.id}')" class="btn-delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  updateBalance(transactions) {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalBalance = totalIncome - totalExpenses;

    const totalBalanceEl = document.getElementById('totalBalance');
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpensesEl = document.getElementById('totalExpenses');

    if (totalBalanceEl) totalBalanceEl.textContent = `$${totalBalance.toFixed(2)}`;
    if (totalIncomeEl) totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
    if (totalExpensesEl) totalExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global instance
const firebaseService = new SecureFirebaseService();

// Export for use in other files
export default firebaseService;
