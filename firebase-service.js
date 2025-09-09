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
  onSnapshot 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';

class FirebaseService {
  constructor() {
    this.user = null;
    this.setupAuthListener();
  }

  // Authentication methods
  async signUp(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      this.user = userCredential.user;
      return { success: true, user: this.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      this.user = userCredential.user;
      return { success: true, user: this.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      await signOut(auth);
      this.user = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
      if (user) {
        console.log('User signed in:', user.email);
        this.loadTransactions();
      } else {
        console.log('User signed out');
        this.clearTransactions();
      }
    });
  }

  // Transaction methods
  async addTransaction(transaction) {
    if (!this.user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const transactionData = {
        ...transaction,
        userId: this.user.uid,
        createdAt: new Date(),
        amount: parseFloat(transaction.amount)
      };

      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getTransactions() {
    if (!this.user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', this.user.uid),
        orderBy('createdAt', 'desc')
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
      return { success: false, error: error.message };
    }
  }

  async updateTransaction(transactionId, updates) {
    if (!this.user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const transactionRef = doc(db, 'transactions', transactionId);
      await updateDoc(transactionRef, updates);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
    }
  }

  // Category methods
  async addCategory(category) {
    if (!this.user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const categoryData = {
        ...category,
        userId: this.user.uid,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'categories'), categoryData);
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCategories() {
    if (!this.user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const q = query(
        collection(db, 'categories'),
        where('userId', '==', this.user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const categories = [];
      
      querySnapshot.forEach((doc) => {
        categories.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return { success: true, categories };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Real-time listener for transactions
  subscribeToTransactions(callback) {
    if (!this.user) {
      return null;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', this.user.uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const transactions = [];
      querySnapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(transactions);
    });
  }

  // Helper methods for UI
  loadTransactions() {
    this.getTransactions().then(result => {
      if (result.success) {
        this.displayTransactions(result.transactions);
        this.updateBalance(result.transactions);
      }
    });
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
          <h4>${transaction.description}</h4>
          <p class="transaction-category">${transaction.category}</p>
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
}

// Create global instance
const firebaseService = new FirebaseService();

// Export for use in other files
export default firebaseService;
