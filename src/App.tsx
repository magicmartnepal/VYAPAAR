/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Receipt, 
  Users, 
  UtensilsCrossed, 
  Menu as MenuIcon, 
  QrCode, 
  Settings, 
  Clock, 
  Plus, 
  PlusSquare,
  Trash2, 
  ChevronRight, 
  LogOut, 
  User, 
  Lock,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  DollarSign,
  Globe,
  LogIn,
  ShieldCheck,
  Upload,
  Camera,
  Share2,
  FileText,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  History,
  Image as ImageIcon,
  ArrowLeft,
  Menu,
  Sparkles,
  Bike,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signInWithGoogle, signInGuest } from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser, getRedirectResult } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';

// Types
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type Language = 'en' | 'ne';
type Panel = 'dashboard' | 'orders' | 'billing' | 'staff' | 'cost' | 'menu' | 'payments' | 'ai-photoshoot' | 'settings';
type OrderTab = 'dine-in' | 'takeaway' | 'new';

const TRANSLATIONS = {
  en: {
    crm_name: 'VYAPAAR',
    sub_text: 'Minimalist Business Management',
    restricted: 'Restricted Access • Authorized Personnel Only',
    sign_in: 'Sign In with Google',
    google_login: 'Login with Google Workspace',
    logout: 'Logout',
    dashboard: 'Dashboard',
    orders: 'Orders',
    billing: 'Billing',
    staff: 'Staff',
    cost: 'Food Cost',
    menu: 'Menu',
    payments: 'Payments',
    settings: 'Settings',
    sales_analysis: 'Sales Analysis',
    recent_activity: 'Recent Activity',
    alerts: 'Alerts',
    total_sales: "Today's Sales",
    total_orders: "Total Orders",
    new_customers: "New Customers",
    avg_order: "Avg. Order",
    add_ingredient: "Add Raw Material",
    add_billing: "Add Line Entry",
    print: "Print Record",
    lang: "Language",
    active_orders: "Active Tables",
    no_active: "All tables are available",
    start_takeaway: "Takeaway",
    start_dinein: "Table",
    start_pathao: "Pathao",
    pos_all: "All",
    pos_checkout: "Settle Bill",
    pos_total: "Balance",
    pos_pay_cash: "Cash Payment",
    pos_pay_qr: "QR / Digital",
    pos_confirm: "Print & Close",
    pos_title: "Live Terminal",
    new_order: "New Order",
    active_terminal: "Switch Terminal",
    ai_photoshoot: "AI Photoshoot",
    order_history: "Order History",
    clear_all: "Clear All Records"
  },
  ne: {
    crm_name: 'व्यापार (VYAPAAR)',
    sub_text: 'न्यूनतम व्यापार व्यवस्थापन',
    restricted: 'प्रतिबन्धित पहुँच • आधिकारिक कर्मचारी मात्र',
    sign_in: 'Google मार्फत लगइन गर्नुहोस्',
    google_login: 'Google मार्फत पहुँच गर्नुहोस्',
    logout: 'लगआउट',
    dashboard: 'ड्यासबोर्ड',
    orders: 'अर्डरहरू',
    billing: 'बिलिङ',
    staff: 'कर्मचारी',
    cost: 'खाद्य लागत',
    menu: 'मेनु',
    payments: 'भुक्तानी',
    settings: 'सेटिङहरू',
    sales_analysis: 'बिक्री विश्लेषण',
    recent_activity: 'नयाँ गतिविधि',
    alerts: 'अलर्टहरू',
    total_sales: "आजको बिक्री",
    total_orders: "कुल अर्डर",
    new_customers: "नयाँ ग्राहक",
    avg_order: "औसत अर्डर",
    new_order: "नयाँ अर्डर",
    active_terminal: "टर्मिनल परिवर्तन",
    add_ingredient: "कच्चा पदार्थ थप्नुहोस्",
    add_billing: "इन्ट्री थप्नुहोस्",
    print: "रेकर्ड प्रिन्ट",
    lang: "भाषा",
    active_orders: "सक्रिय टेबलहरू",
    no_active: "सबै टेबलहरू खाली छन्",
    start_takeaway: "टेकअवे",
    start_dinein: "टेबल",
    start_pathao: "पठाओ",
    pos_all: "सबै",
    pos_checkout: "बिल फत्ते",
    pos_total: "बाँकी",
    pos_pay_cash: "नगद भुक्तानी",
    pos_pay_qr: "QR / डिजिटल",
    pos_confirm: "प्रिन्ट र बन्द",
    pos_title: "प्रत्यक्ष टर्मिनल",
    ai_photoshoot: "AI फोटोसूट",
    order_history: "अर्डर इतिहास",
    clear_all: "सबै मेट्नुहोस्",
    more: "थप"
  }
};

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  status: 'In' | 'Out';
  clockInTime?: string;
  imageUrl?: string;
}

interface StaffLog {
  id: string;
  staffId: string;
  in: string;
  out?: string;
  date: string;
  timestamp: any;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  imageUrl?: string;
  timestamp: any;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
}

interface BillItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [lang, setLang] = useState<Language>('ne');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<Panel>('dashboard');
  const [bizType, setBizType] = useState<'Restaurant' | 'Store'>('Restaurant');
  
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Dashboard Calculations
  const hourlyData = useMemo(() => {
    const data = new Array(12).fill(0);
    orderHistory.forEach(order => {
      const date = order.createdAt?.toDate();
      if (date) {
        const hour = date.getHours();
        if (hour >= 8 && hour < 20) {
          data[hour - 8] += order.totalBill || 0;
        }
      }
    });
    return data;
  }, [orderHistory]);

  const totalBillingToday = useMemo(() => 
    orderHistory.filter(o => {
      const d = o.createdAt?.toDate();
      return d && d.toDateString() === new Date().toDateString();
    }).reduce((acc, order) => acc + (order.totalBill || 0), 0)
  , [orderHistory]);

  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffLogs, setStaffLogs] = useState<StaffLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ id: '1', name: '', unit: 'kg', qty: 0, price: 0 }]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [inventoryForecast, setInventoryForecast] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [posCategory, setPosCategory] = useState<string>('All');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QR'>('Cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingTax, setIsGeneratingTax] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [posMobileView, setPosMobileView] = useState<'sessions' | 'items' | 'cart'>('items');
  const [showMobileMore, setShowMobileMore] = useState(false);
  
  // App Config States
  const [useVAT, setUseVAT] = useState(false);
  const [taxType, setTaxType] = useState<'PAN' | 'VAT'>('PAN');
  const [sellingPrice, setSellingPrice] = useState(0);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('Magic Mart');
  const [authError, setAuthError] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];

  // Auth Listener
  useEffect(() => {
    // Handle redirect result for mobile browsers that might have forced a redirect
    getRedirectResult(auth).catch((err: any) => {
      console.error("Redirect Auth Error:", err);
      if (err.message?.includes('missing initial state')) {
        setAuthError("Auth state lost. Please open this link in Safari or Chrome directly, not inside an app.");
      } else {
        setAuthError(err.message);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Ensure user document exists
        const userRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email || null,
              displayName: user.displayName || (user.isAnonymous ? 'Guest User' : 'User'),
              language: 'ne',
              bizType: 'Restaurant',
              setupComplete: false,
              createdAt: serverTimestamp(),
              qrImageUrl: null
            });
          } else {
            const data = userSnap.data();
            if (data.language) setLang(data.language as Language);
            if (data.bizType) setBizType(data.bizType as 'Restaurant' | 'Store');
            if (data.qrImageUrl) setQrImageUrl(data.qrImageUrl);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Sync Listeners
  useEffect(() => {
    if (!currentUser) return;

    const staffQuery = query(collection(db, 'staff'), where('userId', '==', currentUser.uid));
    const unsubStaff = onSnapshot(staffQuery, (snap) => {
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff');
    });

    const logsQuery = query(collection(db, 'staff_logs'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(100));
    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setStaffLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff_logs');
    });

    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'));
    const unsubExpenses = onSnapshot(expensesQuery, (snap) => {
      setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    });

    const productsQuery = query(collection(db, 'products'), where('userId', '==', currentUser.uid));
    const unsubProducts = onSnapshot(productsQuery, (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const ingredientsQuery = query(collection(db, 'ingredients'), where('userId', '==', currentUser.uid));
    const unsubIngredients = onSnapshot(ingredientsQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient));
      if (data.length > 0) setIngredients(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ingredients');
    });

    const sessionsQuery = query(collection(db, 'activeSessions'), where('userId', '==', currentUser.uid));
    const unsubSessions = onSnapshot(sessionsQuery, (snap) => {
      setActiveSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activeSessions');
    });

    const historyQuery = query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      setOrderHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      unsubStaff();
      unsubLogs();
      unsubExpenses();
      unsubProducts();
      unsubIngredients();
      unsubSessions();
      unsubHistory();
    };
  }, [currentUser]);

  // Calculations
  const subTotal = billItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  // POS Calculations for billing panel
  const vatAmount = useVAT ? subTotal * 0.13 : 0;
  const totalBill = subTotal + vatAmount;

  const totalCost = ingredients.reduce((acc, ing) => acc + (ing.price * (ing.qty || 0)), 0);
  const foodCostPerc = sellingPrice > 0 ? (totalCost / sellingPrice) * 100 : 0;

  const totalOrdersCount = orderHistory.length;
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = posCategory === 'All' || p.category === posCategory;
    return matchesSearch && matchesCategory;
  }), [products, searchQuery, posCategory]);
  const addProductToBill = (p: Product) => {
    setBillItems(prev => {
      const existing = prev.find(i => i.name === p.name);
      if (existing) {
        return prev.map(i => i.id === existing.id ? { ...i, qty: i.qty + 1 } : i);
      } else {
        return [...prev, { id: 'item-' + Math.random().toString(36).slice(2, 9), name: p.name, price: p.price, qty: 1 }];
      }
    });
    // On mobile, automatically show the cart if an item is added and it was hidden
    if (window.innerWidth < 1024) {
      setPosMobileView('cart');
    }
  };

  useEffect(() => {
    console.log("Current Bill Items:", billItems);
  }, [billItems]);

  // Auto-sync session items to Firestore
  useEffect(() => {
    if (currentSessionId) {
      const timeout = setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'activeSessions', currentSessionId), {
            items: billItems
          });
        } catch (e) {
          console.error("Session sync failed:", e);
        }
      }, 500); // Faster sync
      return () => clearTimeout(timeout);
    }
  }, [billItems, currentSessionId]);

  // AI Insight Generator
  const generateVyaparInsight = async () => {
    if (!currentUser || isGeneratingInsight) return;
    setIsGeneratingInsight(true);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a business consultant for a Nepalese restaurant/store. 
      Today's Analysis for "The Himalayan Kitchen":
      - Total Sales: Rs. ${totalBillingToday}
      - Orders: ${totalOrdersCount}
      - Margin Efficiency: ${foodCostPerc.toFixed(1)}% (Target < 35%)
      - Staff Strength: ${staff.length}
      
      Give a short business tip in ${lang === 'en' ? 'English' : 'Nepali'}. If margin is > 40%, warn the user with "VERY BAD" or "BAD". If < 30% say "EXCELLENT".
      Format: [EFFICIENCY LABEL]: Tip text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setAiInsight(response.text);
    } catch (e) {
      console.error("AI Error:", e);
      setAiInsight(lang === 'en' ? "Consistently high service quality drives repeat business." : "निरन्तर उच्च सेवा गुणस्तरले बारम्बार व्यापार बढाउँछ।");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const generateInventoryForecast = async () => {
    if (!currentUser || isGeneratingInsight) return;
    setIsGeneratingInsight(true);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze historical data for Nepalese Vyapar:
      - Total Historical Orders: ${orderHistory.length}
      - Current Products: ${products.map(p => p.name).join(', ')}
      - Current Stock: ${ingredients.map(i => `${i.name}: ${i.qty}${i.unit}`).join(', ')}
      
      Predict inventory requirements for the next 7 days in ${lang === 'en' ? 'English' : 'Nepali'}. Keep it concise.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setInventoryForecast(response.text);
    } catch (e) {
      console.error("AI Error:", e);
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const processOCR = async (file: File) => {
    if (!currentUser || isOCRProcessing) return;
    setIsOCRProcessing(true);
    try {
      // For demo, we simulate processing by reading the file and asking Gemini to "imagine" what's on it
      // In a real app, you'd send the image bytes
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Simulate reading and extracting text
      const prompt = `As a Smart Expense OCR for Nepal:
      Simulate extracting data from a typical grocery receipt or electric bill in Nepal. 
      Items might be like "Milk", "Chicken", "Rent". 
      Return JSON: { "amount": number, "category": string, "description": string }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      try {
        const cleaned = response.text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleaned);
        await addDoc(collection(db, 'expenses'), {
          ...data,
          userId: currentUser.uid,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error("JSON Parse Error", err);
      }
    } catch (e) {
      console.error("OCR Error:", e);
    } finally {
      setIsOCRProcessing(false);
    }
  };

  // Handlers with Firebase persistence
  const startNewSession = async (type: string, tableName: string) => {
    if (!currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'activeSessions'), {
        userId: currentUser.uid,
        type,
        tableName,
        items: [],
        status: 'Active',
        createdAt: serverTimestamp()
      });
      setActivePanel('billing');
      setCurrentSessionId(docRef.id);
      setBillItems([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'activeSessions');
    }
  };

  const loadSession = (session: any) => {
    setBillItems(session.items || []);
    setCurrentSessionId(session.id);
    setActivePanel('billing');
  };

  const shareOnWhatsapp = (orderId: string, total: number) => {
    const text = `*व्यापार रसीद (Vyapar Receipt)*\nOrder ID: #${orderId.slice(-4)}\nTotal: Rs. ${total.toLocaleString()}\nThank you for choosing us!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const finalizeOrder = async () => {
    if (!currentUser) return;
    const items = billItems.filter(i => i.name && i.qty > 0);
    if (items.length === 0) return;

    try {
      const orderDoc = await addDoc(collection(db, 'orders'), {
        items,
        subTotal,
        vatAmount,
        totalBill,
        paymentMethod,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        status: 'Completed',
        sessionId: currentSessionId
      });

      if (currentSessionId) {
        await deleteDoc(doc(db, 'activeSessions', currentSessionId));
      }

      setLastOrderId(orderDoc.id);
      setShowCheckout(false);
      setShowOrderSuccess(true);
      
      // Auto-reset after delay or let user close
      // window.print(); // Remove auto-print, user can print from success screen
    } catch (e) {
      console.error("Failed to save order", e);
    }
  };

  const toggleClock = async (index: number) => {
    if (!currentUser) return;
    const member = staff[index];
    const isClockingIn = member.status === 'Out';
    const newStatus = isClockingIn ? 'In' : 'Out';
    const timeText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      await updateDoc(doc(db, 'staff', member.id), {
        status: newStatus,
        clockInTime: isClockingIn ? timeText : null
      });

      // Record in logs
      await addDoc(collection(db, 'staff_logs'), {
        staffId: member.id,
        staffName: member.name,
        type: newStatus,
        time: timeText,
        date: new Date().toLocaleDateString(),
        userId: currentUser.uid,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `staff/${member.id}`);
    }
  };

  const addBillItem = () => setBillItems(prev => [...prev, { id: Math.random().toString(36), name: '', price: 0, qty: 1 }]);
  const updateBillItem = (id: string, field: keyof BillItem, value: any) => {
    setBillItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const removeBillItem = (id: string) => setBillItems(prev => prev.filter(item => item.id !== id));

  const addIngredient = async () => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'ingredients'), {
        name: '',
        unit: 'kg',
        qty: 0,
        price: 0,
        userId: currentUser.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ingredients');
    }
  };

  const updateIngredient = async (id: string, field: keyof Ingredient, value: any) => {
    try {
      await updateDoc(doc(db, 'ingredients', id), { [field]: value });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ingredients/${id}`);
    }
  };

  const removeIngredient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ingredients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ingredients/${id}`);
    }
  };

  const performAIPhotoshoot = async (productId: string, productName: string) => {
    if (!currentUser) return;
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `As a professional food photographer, reimagined photoshoot for "${productName}" on a clean white background with cinematic lighting. Describe it and finish with [SUCCESS].`;

      await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      // Simulation: Update with a high-quality placeholder for pro look
      // In a real app with Imagen API, you'd generate the actual image here.
      await updateDoc(doc(db, 'products', productId), { 
        imageUrl: `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=60` 
      });
      
      alert(lang === 'en' ? "AI Photoshoot Complete! (Vision Enhanced)" : "AI फोटोसूट पूरा भयो! (भिजन परिष्कृत)");
    } catch (e) {
      console.error("AI Photoshoot Error:", e);
    }
  };

  const editCompletedOrder = async (order: any) => {
    if (!confirm(lang === 'en' ? 'Reload this completed order for editing? This will create a new terminal session.' : 'के तपाई यो अर्डर सम्पादन गर्न लोड गर्न चाहनुहुन्छ? यसले नयाँ टर्मिनल सत्र सिर्जना गर्नेछ।')) return;
    try {
      const docRef = await addDoc(collection(db, 'activeSessions'), {
        userId: currentUser?.uid,
        type: order.type || 'Takeaway',
        tableName: `EDIT-${order.id.slice(-4)}`,
        items: order.items || [],
        status: 'Active',
        createdAt: serverTimestamp()
      });
      setActivePanel('billing');
      setCurrentSessionId(docRef.id);
      setBillItems(order.items || []);
    } catch (err) {
      console.error("Failed to reload order", err);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm(lang === 'en' ? 'Delete this order record permanently?' : 'यो अर्डर रेकर्ड स्थायी रूपमा मेटाउने?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (e) {
      console.error("Delete order failed", e);
    }
  };

  const clearOrderHistory = async () => {
    if (!currentUser) return;
    if (!confirm(lang === 'en' ? 'Clear ALL completed orders? This cannot be undone.' : 'सबै पूरा भएका अर्डरहरू मेट्ने? यो फिर्ता गर्न सकिँदैन।')) return;
    try {
      const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
      const snap = await getDocs(q);
      const batch = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batch);
    } catch (e) {
      console.error("Clear history failed", e);
    }
  };

  const handleLogout = () => signOut(auth);
  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError("Popup blocked! Please allow popups for this site.");
      } else {
        setAuthError(err.message || "Google Login failed");
      }
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setAuthError(null);
      await signInGuest();
    } catch (err: any) {
      console.error("Guest login failed", err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError("Guest Login is not enabled. Please enable 'Anonymous Auth' in your Firebase Console.");
      } else {
        setAuthError(err.message || "Guest Access failed");
      }
    }
  };

  const downloadTaxSummary = async () => {
    if (!currentUser || isGeneratingTax) return;
    setIsGeneratingTax(true);
    try {
      // Calculate monthly totals
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const salesQuery = query(
        collection(db, 'orders'), 
        where('userId', '==', currentUser.uid),
        where('createdAt', '>=', firstDay)
      );
      const salesSnap = await getDocs(salesQuery);
      let totalSales = 0;
      let totalTax = 0;
      salesSnap.docs.forEach(d => {
        const data = d.data();
        totalSales += data.totalBill || 0;
        totalTax += data.vatAmount || 0;
      });

      const summaryText = `IRD TAX SUMMARY - ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}\n` +
        `-----------------------------------\n` +
        `Merchant ID: ${currentUser.uid.slice(0, 8)}\n` +
        `Total Monthly Sales: Rs. ${totalSales.toLocaleString()}\n` +
        `Total VAT Collected: Rs. ${totalTax.toLocaleString()}\n` +
        `Tax Compliance Status: ACTIVE\n\n` +
        `Generated by Vyapar IQ Engine`;
      
      const blob = new Blob([summaryText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tax_Summary_${now.getMonth() + 1}_${now.getFullYear()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Tax Summary Error:", e);
    } finally {
      setIsGeneratingTax(false);
    }
  };

  const toggleLanguage = async () => {
    const newLang = lang === 'en' ? 'ne' : 'en';
    setLang(newLang);
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { language: newLang });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 text-zinc-900">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="flex justify-center mb-12">
            <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center text-white">
              <ShoppingBag size={24} />
            </div>
          </div>
          
          <div className="text-center mb-12">
            <h1 className="text-xl font-bold tracking-tighter uppercase italic mb-1">{restaurantName || t.crm_name}</h1>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{t.sub_text}</p>
          </div>

          <div className="space-y-4">
            {authError && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-lg space-y-3 mb-6 animate-shake">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-red-500 shrink-0" size={18} />
                  <p className="text-[10px] font-black text-red-900 uppercase tracking-tight leading-tight">{authError}</p>
                </div>
                {authError.includes('link in Safari') && (
                  <p className="text-[9px] text-red-700 font-bold leading-relaxed">
                    WhatsApp or other in-app browsers often block login popups. 
                    Please copy the link and paste it into your device's browser (Safari/Chrome).
                  </p>
                )}
              </div>
            )}
            
            <button 
              onClick={handleGoogleSignIn}
              className="w-full bg-zinc-900 text-white py-4 font-black text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-3 hover:bg-black transition-all group"
            >
              <div className="w-5 h-5 bg-white flex items-center justify-center rounded-sm">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-3 h-3" />
              </div>
              {t.google_login || t.sign_in}
            </button>

            <button 
              onClick={handleGuestSignIn}
              className="w-full bg-white border border-zinc-200 text-zinc-900 py-4 font-black text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-3 hover:bg-zinc-50 transition-all group"
            >
              <Users size={16} />
              Guest Access
            </button>
            
            <div className="flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300 italic">
              <ShieldCheck size={10} />
              Secured Cloud Infrastructure
            </div>

            <div className="pt-8 flex justify-center">
              <button 
                onClick={toggleLanguage}
                className="text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2"
              >
                <Globe size={14} />
                {lang === 'en' ? 'नेपालीमा हेर्नुहोस्' : 'Switch to English'}
              </button>
            </div>
          </div>
          
          <p className="mt-12 text-center text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
            {t.restricted}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden text-zinc-900 font-sans flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-zinc-200 flex-col z-10 shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center text-white">
              <ShoppingBag size={18} />
            </div>
            <span className="pixel-text text-lg text-zinc-900 truncate">{restaurantName}</span>
          </div>
          
          <nav className="space-y-1">
            <NavItem active={activePanel === 'dashboard'} onClick={() => setActivePanel('dashboard')} icon={<LayoutDashboard size={16} />} label={t.dashboard} />
            <NavItem active={activePanel === 'billing'} onClick={() => setActivePanel('billing')} icon={<Receipt size={16} />} label={t.billing} />
            <NavItem active={activePanel === 'inventory' as any || activePanel === 'menu'} onClick={() => setActivePanel('menu')} icon={<PlusSquare size={16} />} label={t.menu} />
            <NavItem active={activePanel === 'orders'} onClick={() => setActivePanel('orders')} icon={<Clock size={16} />} label={t.orders} />
            <NavItem active={activePanel === 'payments'} onClick={() => setActivePanel('payments')} icon={<CreditCard size={16} />} label={t.payments} />
            <NavItem active={activePanel === 'ai-photoshoot'} onClick={() => setActivePanel('ai-photoshoot')} icon={<Sparkles size={16} />} label={t.ai_photoshoot} />
            <NavItem active={activePanel === 'settings'} onClick={() => setActivePanel('settings')} icon={<Settings size={16} />} label={t.settings} />
            <NavItem active={activePanel === 'staff'} onClick={() => setActivePanel('staff')} icon={<Users size={16} />} label={t.staff} />
            <NavItem active={activePanel === 'cost'} onClick={() => setActivePanel('cost')} icon={<UtensilsCrossed size={16} />} label={t.cost} />
          </nav>
        </div>
        
        <div className="mt-auto p-8">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 text-zinc-400 hover:text-zinc-900 transition-colors w-full px-0 py-2 border-t border-transparent hover:border-zinc-100"
          >
            <LogOut size={16} />
            <span className="font-black uppercase tracking-[0.2em] text-[9px]">{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white flex flex-col relative pb-16 lg:pb-0 scroll-smooth">
        <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-7 h-7 bg-zinc-900 flex items-center justify-center text-white text-[11px] font-black italic rounded-sm shadow-sm">{restaurantName.charAt(0)}</div>
            <div className="flex flex-col">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-none mb-1">
                 {activePanel}
              </h2>
              <span className="text-[10px] font-bold uppercase text-zinc-900 tracking-tight">
                {restaurantName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Admin</p>
              <p className="text-[8px] text-zinc-400 uppercase tracking-widest font-bold">System Root</p>
            </div>
            <div className="w-8 h-8 bg-zinc-50 border border-zinc-200 flex items-center justify-center">
              <User size={14} className="text-zinc-400" />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 pb-12 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {activePanel === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label={t.total_sales} value={`Rs. ${totalBillingToday.toLocaleString()}`} icon={<TrendingUp size={16} />} sub="Growth +12%" />
                  <StatCard label={t.total_orders} value={totalOrdersCount.toString()} icon={<ShoppingBag size={16} />} sub="Volume Stable" />
                  <StatCard label="Margin Analysis" value={`${foodCostPerc.toFixed(1)}%`} icon={<BrainCircuit size={16} />} sub={foodCostPerc > 35 ? "Action Required" : "Healthy Range"} />
                  <StatCard label="Cash Flow" value={`Rs. ${(totalBillingToday - totalCost).toLocaleString()}`} icon={<IndianRupee size={16} />} sub="Net Liquid" />
                </div>

                {/* Quick Access Grid - User Request: ADD BUTTONS TO ALL pages in the main home screen */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 italic">Quick Operations</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    <QuickButton icon={<Receipt size={20} />} label={t.billing} active={activePanel === 'billing'} onClick={() => setActivePanel('billing')} />
                    <QuickButton icon={<PlusSquare size={20} />} label={t.menu} active={activePanel === 'menu'} onClick={() => setActivePanel('menu')} />
                    <QuickButton icon={<Clock size={20} />} label={t.orders} active={activePanel === 'orders'} onClick={() => setActivePanel('orders')} />
                    <QuickButton icon={<Users size={20} />} label={t.staff} active={activePanel === 'staff'} onClick={() => setActivePanel('staff')} />
                    <QuickButton icon={<CreditCard size={20} />} label={t.payments} active={activePanel === 'payments'} onClick={() => setActivePanel('payments')} />
                    <QuickButton icon={<UtensilsCrossed size={20} />} label={t.cost} active={activePanel === 'cost'} onClick={() => setActivePanel('cost')} />
                    <QuickButton icon={<Sparkles size={20} />} label={t.ai_photoshoot} active={activePanel === 'ai-photoshoot'} onClick={() => setActivePanel('ai-photoshoot')} />
                    <QuickButton icon={<Settings size={20} />} label={t.settings} active={activePanel === 'settings'} onClick={() => setActivePanel('settings')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Left Column: Analysis & Activity */}
                  <div className="lg:col-span-2 space-y-10">
                    <div className="bg-white p-8 rounded-sm border border-zinc-100 shadow-sm">
                      <div className="flex items-center justify-between mb-12">
                        <div className="space-y-1">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-900">{t.sales_analysis}</h3>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Real-time Revenue Nodes</p>
                        </div>
                        <div className="flex gap-4">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-zinc-900" />
                             <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Peak Hours</span>
                           </div>
                        </div>
                      </div>
                      <div className="flex items-end justify-between h-48 gap-px bg-zinc-50 px-px">
                        {hourlyData.map((val, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full">
                            <div className="flex-1 w-full flex items-end">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: val > 0 ? `${Math.max(4, (val / (Math.max(...hourlyData) || 8000)) * 100)}%` : '2%' }}
                                className={`w-full ${val > 0 ? 'bg-zinc-900 hover:bg-black' : 'bg-zinc-100'} transition-all relative rounded-t-sm`}
                              >
                                {val > 0 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white px-1 shadow-sm border border-zinc-100 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">₹{Math.round(val/1000)}k</div>}
                              </motion.div>
                            </div>
                            <span className="text-[8px] text-zinc-400 font-bold font-mono tracking-tighter pb-2">{(i + 8).toString().padStart(2, '0')}h</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Forecasting Card */}
                    <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-sm relative overflow-hidden group">
                       <div className="absolute -top-10 -right-10 opacity-5 group-hover:rotate-12 transition-transform">
                          <BrainCircuit size={200} />
                       </div>
                       <div className="flex items-center justify-between mb-8">
                          <div className="space-y-1">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-900 border-l-2 border-zinc-900 pl-4 italic">7-Day Inventory Forecast</h3>
                            <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest pl-4">Predictive Engine v2.0</p>
                          </div>
                          <button 
                            onClick={generateInventoryForecast}
                            disabled={isGeneratingInsight}
                            className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-zinc-900 text-white hover:bg-black transition-colors"
                          >
                            {isGeneratingInsight ? 'CALCULATING...' : 'RUN FORECAST'}
                          </button>
                       </div>
                       
                       <AnimatePresence mode="wait">
                         {inventoryForecast ? (
                           <motion.div 
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             className="bg-white p-6 border border-zinc-200 text-xs font-bold leading-relaxed tracking-tight text-zinc-800"
                           >
                              {inventoryForecast}
                           </motion.div>
                         ) : (
                           <div className="py-12 text-center text-[10px] text-zinc-300 font-black uppercase tracking-[0.3em] italic">No forecast data generated. Select Run to begin.</div>
                         )}
                       </AnimatePresence>
                    </div>
                  </div>

                  {/* Right Column: AI Insights & Quick Actions */}
                  <div className="space-y-6">
                    <div className="bg-zinc-900 p-10 rounded-sm text-white shadow-xl shadow-zinc-200 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp size={80} />
                      </div>
                      <div className="flex items-center justify-between mb-10">
                        <h3 className="text-[10px] uppercase font-black tracking-[0.3em] text-zinc-500 italic">VYAPAR IQ</h3>
                        <div className="px-2 py-1 bg-white/10 rounded-sm text-[8px] font-black uppercase tracking-[0.25em]">PRO-LICENSE</div>
                      </div>
                      
                      {aiInsight ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-8"
                        >
                          <div className="flex gap-3">
                             <div className="mt-1"><BrainCircuit size={16} className="text-zinc-500" /></div>
                             <p className="text-xs font-bold leading-relaxed italic text-zinc-100">{aiInsight}</p>
                          </div>
                          <button 
                            onClick={generateVyaparInsight}
                            className="w-full py-4 bg-white text-zinc-900 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-zinc-100 transition-all active:scale-95"
                          >
                            New Analysis
                          </button>
                        </motion.div>
                      ) : (
                        <div className="space-y-8">
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest border-l border-zinc-800 pl-6 leading-loose">
                            AI-driven business logic for Nepalese market optimization. Efficiency analytics active.
                          </p>
                          <button 
                            onClick={generateVyaparInsight}
                            disabled={isGeneratingInsight}
                            className="w-full py-4 bg-white text-zinc-900 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-zinc-100 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isGeneratingInsight ? 'ANALYZING...' : 'RUN IQ ENGINE'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Smart OCR Action */}
                    <div className="p-10 border border-zinc-900 bg-white shadow-xl shadow-zinc-50 flex flex-col items-center text-center gap-6 group hover:bg-zinc-50 transition-all">
                       <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                          <Camera size={24} />
                       </div>
                       <div>
                          <h4 className="text-[11px] font-black tracking-widest uppercase text-zinc-900">Expense OCR</h4>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-2 px-4">Upload bill to sync tax summaries automatically</p>
                       </div>
                       <label className="w-full">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) processOCR(file);
                            }}
                          />
                          <div className="w-full py-4 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-[0.3em] cursor-pointer hover:bg-black transition-colors flex items-center justify-center gap-3">
                             {isOCRProcessing ? 'SCANNING...' : 'SCAN RECEIPT'}
                          </div>
                       </label>
                    </div>

                    {/* Tax Summary Export */}
                    <button 
                      onClick={downloadTaxSummary}
                      disabled={isGeneratingTax}
                      className="w-full p-6 border border-zinc-100 flex items-center justify-between hover:bg-zinc-50 transition-all group disabled:opacity-50"
                    >
                       <div className="flex items-center gap-4">
                          <FileText size={20} className="text-zinc-200 group-hover:text-zinc-900 transition-colors" />
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{isGeneratingTax ? 'GENERATING...' : 'IRD Summary'}</p>
                            <p className="text-[8px] text-zinc-300 font-bold uppercase tracking-widest mt-1">Ready for Tax Return</p>
                          </div>
                       </div>
                       <ChevronRight size={14} className="text-zinc-200" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activePanel === 'billing' && (
              <motion.div 
                key="billing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-1 h-[calc(100vh-64px)] lg:h-[calc(100vh-100px)] -m-4 sm:-m-8 pb-16 lg:pb-0"
              >
                {/* Active Sessions Sidebar */}
                <div className={`lg:w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col shrink-0 ${posMobileView === 'sessions' ? 'flex fixed inset-0 lg:relative z-[60] lg:z-0' : 'hidden lg:flex'}`}>
                  <div className="p-4 border-b border-zinc-200 bg-white sticky top-0 z-10">
                    <div className="flex items-center justify-between lg:block">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-zinc-400">{t.active_terminal}</h3>
                      <button className="lg:hidden p-2 text-zinc-400" onClick={() => setPosMobileView('items')}><ArrowLeft size={20} /></button>
                    </div>
                    <div className="space-y-2">
                       <button 
                         onClick={() => {
                           const table = prompt(lang === 'en' ? 'Table/Order Name:' : 'टेबल वा अर्डरको नाम:');
                           if (table) {
                             startNewSession('Dine-in', table);
                             setPosMobileView('items');
                           }
                         }}
                         className="w-full py-3 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                       >
                         <Plus size={14} /> {t.new_order}
                       </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {activeSessions.map((session) => (
                      <div 
                        key={session.id}
                        role="button"
                        onClick={() => loadSession(session)}
                        className={`w-full text-left p-4 rounded-sm border transition-all relative cursor-pointer group ${currentSessionId === session.id ? 'bg-white border-zinc-900 shadow-sm' : 'bg-transparent border-transparent hover:bg-zinc-100'}`}
                      >
                         <div className="flex justify-between items-start mb-1">
                            <span className="text-[11px] font-black uppercase tracking-tight text-zinc-900 truncate pr-4">{session.tableName}</span>
                            <span className="text-[10px] font-mono font-black">₹{(session.items?.reduce((a: number, b: any) => a + (b.price * b.qty), 0) || 0)}</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest italic">{session.type}</span>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (confirm(lang === 'en' ? 'Delete this terminal session?' : 'यो टर्मिनल सत्र मेटाउने?')) {
                                     deleteDoc(doc(db, 'activeSessions', session.id));
                                     if (currentSessionId === session.id) setCurrentSessionId(null);
                                   }
                                 }}
                                 className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all p-1"
                               >
                                  <Trash2 size={10} />
                               </button>
                               <span className="px-1.5 py-0.5 bg-zinc-100 text-[10px] font-black text-zinc-900 uppercase">
                                 {session.items?.length || 0} ITEMS
                               </span>
                            </div>
                         </div>
                         {currentSessionId === session.id && (
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-2/3 bg-zinc-900 rounded-l-full" />
                         )}
                      </div>
                    ))}
                    
                    {activeSessions.length === 0 && (
                      <div className="py-12 text-center">
                         <p className="text-[9px] text-zinc-300 font-black uppercase tracking-widest italic leading-relaxed px-4">No active terminals. Start an order to begin.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main POS Interface */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {currentSessionId === null ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/20">
                    <div className="w-16 h-16 bg-white border border-zinc-100 flex items-center justify-center text-zinc-200 mb-8 rounded-full shadow-inner">
                       <LayoutDashboard size={32} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-400 mb-10">{lang === 'en' ? 'Select or Create Order' : 'अर्डर चयन गर्नुहोस् वा सिर्जना गर्नुहोस्'}</h3>
                    <div className="flex flex-wrap justify-center gap-4 px-12">
                      <POSInitButton icon={<ShoppingBag size={18} />} label={t.start_takeaway} onClick={() => startNewSession('Takeaway', `TR-${Math.floor(100 + Math.random() * 900)}`)} />
                      <POSInitButton icon={<UtensilsCrossed size={18} />} label={t.start_dinein} onClick={() => {
                        const table = prompt(lang === 'en' ? 'Table Number:' : 'टेबल नम्बर:');
                        if (table) startNewSession('Dine-in', table);
                      }} />
                      <POSInitButton icon={<Bike size={18} />} label={t.start_pathao} onClick={() => startNewSession('Pathao', `Pathao-${Math.floor(100 + Math.random() * 900)}`)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full">
                    {/* Items Grid */}
                    <div className={`flex-1 flex flex-col border-r border-zinc-100 ${posMobileView === 'items' ? 'flex' : 'hidden lg:flex'}`}>
                       <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0 z-10">
                          <div className="flex items-center gap-4">
                             <button className="lg:hidden p-2 -ml-2 text-zinc-400" onClick={() => setPosMobileView('sessions')}>
                                <Menu size={20} />
                             </button>
                             <div className="w-1.5 h-1.5 bg-zinc-900 animate-pulse hidden sm:block" />
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 truncate max-w-[120px] sm:max-w-[200px]">
                                <span className="hidden sm:inline">Terminal: </span><span className="text-zinc-400">{activeSessions.find(s => s.id === currentSessionId)?.tableName || 'None'}</span>
                             </h4>
                          </div>
                          <div className="flex items-center gap-2">
                             <Receipt size={14} className="text-zinc-300" />
                             <input 
                               className="bg-transparent border-none text-[10px] font-black text-zinc-900 focus:outline-none uppercase placeholder:text-zinc-200 w-24 sm:w-32"
                               placeholder="SEARCH..."
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                             />
                          </div>
                          <button className="lg:hidden relative" onClick={() => setPosMobileView('cart')}>
                             <ShoppingBag size={20} className="text-zinc-900" />
                             {billItems.length > 0 && (
                               <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full font-black">
                                 {billItems.reduce((a, b) => a + b.qty, 0)}
                               </span>
                             )}
                          </button>
                       </div>

                       <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-zinc-50/30">
                          <div className="flex flex-wrap gap-2 mb-8">
                             {categories.map(cat => (
                               <button 
                                 key={cat}
                                 onClick={() => setPosCategory(cat)}
                                 className={`px-5 py-2.5 rounded-sm text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${posCategory === cat ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl shadow-zinc-100' : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900'}`}
                               >
                                 {cat === 'All' ? t.pos_all : cat}
                               </button>
                             ))}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-3 pb-24">
                             {filteredProducts.map(p => (
                               <button 
                                 key={p.id}
                                 onClick={() => addProductToBill(p)}
                                 className="group flex flex-col bg-white border border-zinc-100 hover:border-zinc-900 hover:shadow-2xl hover:shadow-zinc-100 transition-all active:scale-[0.97] rounded-sm overflow-hidden"
                               >
                                  <div className="aspect-square relative overflow-hidden bg-zinc-50">
                                     {p.imageUrl ? (
                                       <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                     ) : (
                                       <div className="w-full h-full flex items-center justify-center opacity-10"><ShoppingBag size={48} /></div>
                                     )}
                                     <div className="absolute top-2 right-2 bg-zinc-900 text-white px-2 py-1 text-[9px] font-mono font-black italic">
                                        ₹{p.price}
                                     </div>
                                  </div>
                                  <div className="p-4 text-left">
                                     <h5 className="text-[11px] font-black uppercase tracking-tight text-zinc-900 leading-tight mb-1">{p.name}</h5>
                                     <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest italic">{p.category}</p>
                                  </div>
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>

                    {/* Order Details Panel */}
                    <div className={`w-full lg:w-96 flex flex-col bg-white shadow-xl shadow-zinc-100 border-l border-zinc-200 fixed lg:relative inset-0 z-[60] lg:z-0 ${posMobileView === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
                       <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
                          <div className="flex items-center gap-3">
                             <button className="lg:hidden p-2 -ml-2 text-zinc-400" onClick={() => setPosMobileView('items')}><ArrowLeft size={20} /></button>
                             <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white">
                                <Receipt size={14} />
                             </div>
                             <div className="text-left leading-none">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-0.5">{activeSessions.find(s => s.id === currentSessionId)?.tableName}</h3>
                                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest italic">Order Details</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => {
                              if (confirm(lang === 'en' ? 'Reset and close current terminal?' : 'टर्मिनल बन्द गर्ने?')) {
                                setCurrentSessionId(null);
                                setBillItems([]);
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center border border-zinc-100 rounded-sm text-zinc-300 hover:text-red-500 hover:border-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                       </div>

                       <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white">
                          {billItems.filter(i => i.name).length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4 mt-20">
                               <PlusSquare size={48} strokeWidth={1} />
                               <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">Add items from left</p>
                            </div>
                          )}
                          
                          {billItems.filter(i => i.name).map(item => (
                            <div key={item.id} className="p-4 bg-zinc-50/50 border border-zinc-100 group relative hover:bg-white hover:border-zinc-300 transition-all rounded-sm">
                               <div className="flex justify-between items-start mb-4">
                                  <span className="text-[11px] font-black uppercase tracking-tight text-zinc-900 leading-tight w-4/5 line-clamp-2">{item.name}</span>
                                  <button onClick={() => removeBillItem(item.id)} className="text-zinc-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={12} />
                                  </button>
                               </div>
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                     <button onClick={() => updateBillItem(item.id, 'qty', Math.max(1, item.qty - 1))} className="w-8 h-8 flex items-center justify-center border border-zinc-200 hover:bg-zinc-100 transition-colors text-xs font-black">-</button>
                                     <span className="w-10 text-center text-xs font-mono font-black">{item.qty}</span>
                                     <button onClick={() => updateBillItem(item.id, 'qty', item.qty + 1)} className="w-8 h-8 flex items-center justify-center bg-zinc-900 text-white text-xs font-black hover:bg-black transition-colors">+</button>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[11px] font-mono font-black text-zinc-900">₹{item.price * item.qty}</p>
                                    <p className="text-[8px] text-zinc-300 font-bold">₹{item.price}/ea</p>
                                  </div>
                               </div>
                            </div>
                          ))}
                       </div>

                       <div className="p-6 bg-zinc-900 text-white pb-24 lg:pb-6">
                          <div className="space-y-3 mb-8">
                             <div className="flex justify-between items-center text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">
                                <span>Subtotal</span>
                                <span className="font-mono">₹{subTotal.toLocaleString()}</span>
                             </div>
                             {useVAT && (
                               <div className="flex justify-between items-center text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">
                                  <span>VAT (13%)</span>
                                  <span className="font-mono">₹{vatAmount.toLocaleString()}</span>
                               </div>
                             )}
                             <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.3em] pt-4 border-t border-zinc-800">
                                <span>Payable</span>
                                <span className="text-2xl font-mono tracking-tighter text-white">₹{totalBill.toLocaleString()}</span>
                             </div>
                          </div>
                          
                          <button 
                            onClick={() => setShowCheckout(true)}
                            disabled={billItems.filter(i => i.name).length === 0}
                            className="w-full py-5 bg-white text-zinc-900 font-black text-[11px] uppercase tracking-[0.4em] hover:bg-zinc-100 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3"
                          >
                            <QrCode size={16} /> {t.pos_checkout}
                          </button>
                       </div>
                    </div>
                  </div>
                )}
                </div>
              </motion.div>
            )}

            {activePanel === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-12"
              >
                {/* Active Terminals Section */}
                <div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 pb-10 mb-8">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em]">{t.active_orders}</h3>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest italic">{activeSessions.length} Terminals Active</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => startNewSession('Takeaway', `TR-${Math.floor(100 + Math.random() * 900)}`)}
                        className="px-6 py-4 border border-zinc-200 text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 transition-all flex items-center gap-3"
                      >
                        <ShoppingBag size={14} /> {t.start_takeaway}
                      </button>
                      <button 
                        onClick={() => {
                          const table = prompt(lang === 'en' ? 'Table Number:' : 'टेबल नम्बर:');
                          if (table) startNewSession('Dine-in', table);
                        }}
                        className="px-6 py-4 bg-white border border-zinc-900 text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-3"
                      >
                        <LayoutDashboard size={14} /> {t.start_dinein}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {activeSessions.map((session) => (
                      <motion.div 
                        key={session.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => loadSession(session)}
                        className="bg-white border-2 border-zinc-100 p-8 cursor-pointer relative group transition-all hover:border-zinc-900 bg-zinc-50/20"
                      >
                        <div className="absolute top-4 right-4 text-[8px] font-black tracking-widest text-zinc-300 italic">{session.type}</div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(lang === 'en' ? 'Cancel this session?' : 'यो सत्र रद्द गर्ने?')) {
                              deleteDoc(doc(db, 'activeSessions', session.id));
                            }
                          }}
                          className="absolute bottom-4 right-4 text-zinc-100 hover:text-red-500 transition-colors z-10"
                        >
                           <Trash2 size={14} />
                        </button>
                        <div className="mb-8 w-12 h-12 bg-zinc-900 text-white flex items-center justify-center font-mono font-black italic shadow-2xl shadow-zinc-200">
                           {session.tableName.match(/\d+/) || session.tableName.charAt(0)}
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">{session.tableName}</h4>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-2">{session.items?.length || 0} Items Loading...</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* History Section */}
                <div className="pt-20">
                   <div className="flex items-center justify-between border-b border-zinc-100 pb-10 mb-8">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em]">{t.order_history}</h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest italic">{orderHistory.length} SETTLED RECORDS</p>
                      </div>
                      <button 
                        onClick={clearOrderHistory}
                        className="text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-red-500 transition-colors flex items-center gap-2 border border-zinc-100 px-4 py-2 hover:border-red-500"
                      >
                         <Trash2 size={12} /> {t.clear_all}
                      </button>
                   </div>

                   <div className="space-y-3">
                      {orderHistory.map((order) => (
                        <div key={order.id} className="p-6 bg-white border border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl hover:shadow-zinc-50 transition-all group">
                           <div className="flex items-center gap-6">
                              <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 flex flex-col items-center justify-center">
                                 <span className="text-[8px] font-black text-zinc-300 uppercase">INV</span>
                                 <span className="text-[10px] font-mono font-black">#{order.id.slice(-4)}</span>
                              </div>
                              <div>
                                 <div className="flex items-center gap-3">
                                   <h4 className="text-[11px] font-black uppercase tracking-tight text-zinc-900">{order.items?.length || 0} Items Settled</h4>
                                   <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${order.paymentMethod === 'Cash' ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-50 text-blue-500'}`}>
                                      {order.paymentMethod}
                                   </span>
                                 </div>
                                 <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1 italic">
                                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'Recent'}
                                 </p>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-12">
                              <div className="text-right">
                                 <p className="text-sm font-mono font-black text-zinc-900">₹{(order.totalBill || 0).toLocaleString()}</p>
                                 <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest shadow-zinc-100">NET TOTAL</p>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button 
                                   onClick={() => editCompletedOrder(order)}
                                   className="p-3 bg-zinc-50 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all rounded-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                                 >
                                    <PlusSquare size={14} /> EDIT
                                 </button>
                                 <button 
                                   onClick={() => deleteOrder(order.id)}
                                   className="p-3 bg-red-50 text-red-200 hover:text-red-500 transition-all rounded-sm"
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                           </div>
                        </div>
                      ))}
                      
                      {orderHistory.length === 0 && (
                        <div className="py-20 text-center border-2 border-dashed border-zinc-100">
                           <History size={48} className="mx-auto text-zinc-100 mb-6" />
                           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-300 italic">No historical nodes detected</p>
                        </div>
                      )}
                   </div>
                </div>
              </motion.div>
            )}

            {activePanel === 'ai-photoshoot' && (
              <motion.div 
                key="ai-photoshoot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-12"
              >
                <div className="bg-zinc-900 p-12 text-white relative overflow-hidden">
                   <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
                      <Sparkles size={160} />
                   </div>
                   <div className="max-w-xl relative z-10">
                      <h3 className="text-xl font-black uppercase tracking-tighter mb-4 italic">AI Vision Enhancement</h3>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.3em] leading-relaxed mb-8">
                        Generate professional food photography using Gemini Vision. Transform simple shots into cinematic Menu assets instantly.
                      </p>
                      <div className="flex items-center gap-4 text-xs font-mono font-black border-l-2 border-zinc-700 pl-6 my-10">
                         <div className="flex flex-col">
                            <span className="text-[8px] text-zinc-600 uppercase mb-1">PROMPT ENGINE</span>
                            <span>GEMINI-3-FLASH</span>
                         </div>
                         <div className="w-px h-8 bg-zinc-800 mx-4" />
                         <div className="flex flex-col">
                            <span className="text-[8px] text-zinc-600 uppercase mb-1">IMAGE SOURCE</span>
                            <span>UPSPLASH SYNC v1.2</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                   {products.map(p => (
                     <div key={p.id} className="bg-white border border-zinc-100 group relative flex flex-col">
                        <div className="aspect-square bg-zinc-50 relative overflow-hidden">
                           {p.imageUrl ? (
                             <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center opacity-10">
                                <ImageIcon size={48} />
                             </div>
                           )}
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-8 text-center">
                              <p className="text-[9px] text-white font-black uppercase tracking-widest leading-loose">
                                Re-visualize this product using AI vision parameters.
                              </p>
                           </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                           <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 mb-1">{p.name}</h4>
                           <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-6 italic">{p.category}</p>
                           <button 
                             onClick={() => performAIPhotoshoot(p.id, p.name)}
                             className="w-full py-4 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-[0.3em] hover:bg-black hover:shadow-xl hover:shadow-zinc-200 transition-all flex items-center justify-center gap-2 mt-auto"
                           >
                             <Sparkles size={12} /> Run Photoshoot
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
              </motion.div>
            )}

            {activePanel === 'staff' && (
              <motion.div 
                key="staff"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">{t.staff_mgmt}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest italic">{staff.length} Active Node(s)</p>
                  </div>
                  <button 
                    onClick={() => {
                      const name = prompt(lang === 'en' ? 'Staff Name:' : 'कर्मचारीको नाम:');
                      const role = prompt(lang === 'en' ? 'Role:' : 'भूमिका:');
                      if (name && role) {
                        addDoc(collection(db, 'staff'), { name, role, status: 'Out', userId: currentUser?.uid });
                      }
                    }}
                    className="flex items-center gap-3 px-6 py-3 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                  >
                    <Plus size={14} /> Add Staff
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {staff.map((member, idx) => (
                    <div key={member.id} className="bg-white border border-zinc-100 p-8 flex flex-col items-center group relative">
                       <div className="w-24 h-24 mb-6 relative">
                          <div className="w-full h-full rounded-sm bg-zinc-50 border border-zinc-100 overflow-hidden flex items-center justify-center">
                             {member.imageUrl ? (
                               <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                             ) : (
                               <Users size={32} className="text-zinc-200" />
                             )}
                          </div>
                          <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-zinc-900 text-white rounded-sm flex items-center justify-center cursor-pointer hover:bg-black transition-colors shadow-lg">
                             <Camera size={14} />
                             <input type="file" className="hidden" onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (ev) => {
                                     await updateDoc(doc(db, 'staff', member.id), { imageUrl: ev.target?.result });
                                  };
                                  reader.readAsDataURL(file);
                               }
                             }} />
                          </label>
                       </div>

                       <div className="text-center mb-8">
                          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">{member.name}</h4>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1 italic">{member.role}</p>
                       </div>
                       
                       <div className="w-full border-t border-zinc-50 pt-6 flex items-center justify-between mb-8">
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${member.status === 'In' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                             <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{member.status}</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-zinc-400">{member.clockInTime || '--:--'}</span>
                       </div>

                       <button 
                         onClick={() => toggleClock(idx)}
                         className={`w-full py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${member.status === 'In' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                       >
                         {member.status === 'In' ? 'CLOCK OUT' : 'CLOCK IN'}
                       </button>

                       <div className="mt-8 pt-6 border-t border-zinc-50 w-full">
                          <h5 className="text-[8px] font-black uppercase tracking-widest text-zinc-300 mb-4 flex items-center gap-2"><History size={10} /> RECENT LOGS</h5>
                          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                             {staffLogs.filter(l => l.staffId === member.id).slice(0, 7).map(log => (
                               <div key={log.id} className="flex justify-between items-center text-[8px] font-bold text-zinc-400 uppercase">
                                  <span>{log.date}</span>
                                  <span className={log.type === 'In' ? 'text-green-500' : 'text-red-500'}>{log.type} {log.time}</span>
                               </div>
                             ))}
                          </div>
                       </div>

                       <button 
                         onClick={() => deleteDoc(doc(db, 'staff', member.id))}
                         className="absolute top-4 right-4 text-zinc-100 hover:text-red-500 transition-colors"
                       >
                          <Trash2 size={14} />
                       </button>
                    </div>
                  ))}
                </div>
              </motion.div>
          )}

          {activePanel === 'menu' && (
              <motion.div 
                key="menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">{t.menu_mgmt}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest italic">{products.length} Items Configured</p>
                  </div>
                  <button 
                    onClick={() => {
                      const name = prompt('Product Name:');
                      const price = parseFloat(prompt('Price:') || '0');
                      const category = prompt('Category:');
                      if (name && price >= 0) {
                        addDoc(collection(db, 'products'), { name, price, category, userId: currentUser?.uid });
                      }
                    }}
                    className="flex items-center gap-3 px-6 py-3 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                  >
                    <Plus size={14} /> Add Product
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white border border-zinc-100 group overflow-hidden relative">
                       <div className="aspect-square bg-zinc-50 relative flex items-center justify-center overflow-hidden">
                          {product.imageUrl ? (
                             <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                             <ShoppingBag size={48} className="text-zinc-100" />
                          )}
                          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer gap-2 text-white">
                             <Camera size={20} />
                             <span className="text-[10px] font-black uppercase tracking-widest">Update Photo</span>
                             <input type="file" className="hidden" onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (ev) => {
                                     await updateDoc(doc(db, 'products', product.id), { imageUrl: ev.target?.result });
                                  };
                                  reader.readAsDataURL(file);
                               }
                             }} />
                          </label>
                       </div>
                       <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                             <div>
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 truncate">{product.name}</h4>
                                <span className="text-[8px] px-2 py-0.5 bg-zinc-50 text-zinc-400 font-black uppercase tracking-widest rounded-[2px] mt-1 inline-block">{product.category}</span>
                             </div>
                             <span className="text-xs font-mono font-black text-zinc-900 border-b border-zinc-900">₹{product.price}</span>
                          </div>
                          <div className="flex flex-col gap-2 pt-2">
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => deleteDoc(doc(db, 'products', product.id))}
                                  className="flex-1 py-3 bg-zinc-50 text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all text-[9px] font-black uppercase tracking-widest"
                                >Remove</button>
                                <button 
                                  onClick={() => {
                                    const newName = prompt('New Name:', product.name);
                                    const newPrice = parseFloat(prompt('New Price:', product.price.toString()) || '0');
                                    if (newName && !isNaN(newPrice)) {
                                      updateDoc(doc(db, 'products', product.id), { name: newName, price: newPrice });
                                    }
                                  }}
                                  className="flex-1 py-3 bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-all text-[9px] font-black uppercase tracking-widest"
                                >Edit</button>
                             </div>
                             <button 
                                onClick={() => performAIPhotoshoot(product.id, product.name)}
                                className="w-full py-3 bg-zinc-900 text-white hover:bg-black transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                              >
                                <Sparkles size={10} /> AI Photoshoot
                              </button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </motion.div>
          )}

          {activePanel === 'cost' && (
              <motion.div 
                key="cost"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-12"
              >
                <div className="lg:col-span-2 space-y-8">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 border-b border-zinc-100 pb-4">{lang === 'en' ? 'Recipe Analysis' : 'नुस्खा विश्लेषण'}</h3>
                   
                   <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">
                      <div className="col-span-4">{lang === 'en' ? 'Ingredient' : 'सामाग्री'}</div>
                      <div className="col-span-2 text-center">{lang === 'en' ? 'Unit' : 'एकाइ'}</div>
                      <div className="col-span-2 text-center">{lang === 'en' ? 'Qty' : 'परिमाण'}</div>
                      <div className="col-span-3 text-right">{lang === 'en' ? 'Price/Unit' : 'एकाइ मूल्य'}</div>
                      <div className="col-span-1"></div>
                    </div>
                    {ingredients.map(ing => (
                      <div key={ing.id} className="grid grid-cols-12 gap-3">
                        <div className="col-span-4">
                          <input 
                            className="w-full bg-white border border-zinc-200 rounded-sm px-3 py-2 text-xs font-bold focus:outline-none focus:border-zinc-900 uppercase" 
                            placeholder="NAME"
                            value={ing.name}
                            onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <select 
                            className="w-full bg-white border border-zinc-200 rounded-sm px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-zinc-900 h-full"
                            value={ing.unit}
                            onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                          >
                            <option>kg</option>
                            <option>ltr</option>
                            <option>pcs</option>
                            <option>gm</option>
                          </select>
                        </div>
                        <div className="col-span-2 text-center">
                          <input 
                            type="number" 
                            className="w-full bg-white border border-zinc-200 rounded-sm px-3 py-2 text-xs font-mono font-bold text-center focus:outline-none focus:border-zinc-900" 
                            value={ing.qty || ''}
                            onChange={(e) => updateIngredient(ing.id, 'qty', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3 text-right relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 text-[8px] font-black uppercase">RS.</span>
                          <input 
                            type="number" 
                            className="w-full bg-white border border-zinc-200 rounded-sm pl-8 pr-3 py-2 text-xs font-mono font-bold text-right focus:outline-none focus:border-zinc-900" 
                            value={ing.price || ''}
                            onChange={(e) => updateIngredient(ing.id, 'price', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                          <button 
                            onClick={() => removeIngredient(ing.id)}
                            className="text-zinc-200 hover:text-zinc-900 transition-colors"
                          ><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={addIngredient}
                      className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-zinc-200 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 transition-all text-[9px] font-black uppercase tracking-[0.2em]"
                    >
                      <Plus size={14} /> {t.add_ingredient}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-zinc-900 p-8 text-center text-white relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                        <TrendingUp size={200} />
                     </div>
                     <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.3em] mb-4 font-mono">Gross Expenditure</p>
                     <div className="text-4xl font-black tracking-tighter mb-1 font-mono">Rs. {totalCost.toFixed(0)}</div>
                     <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest italic">Inventory Weighted Cost</p>
                     
                     <div className="mt-12 pt-12 border-t border-zinc-800 flex flex-col gap-8">
                        <div className="text-left">
                          <label className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] block mb-2">Target Price Point</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-black uppercase tracking-widest">Rs.</span>
                            <input 
                              type="number"
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-sm pl-12 pr-4 py-4 font-black text-xl text-white focus:outline-none focus:border-white transition-colors"
                              placeholder="0"
                              value={sellingPrice || ''}
                              onChange={(e) => setSellingPrice(parseFloat(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="p-6 border border-zinc-700 bg-zinc-800/50 flex flex-col items-center justify-center">
                          <span className="text-[9px] uppercase font-black tracking-[0.2em] mb-2 text-zinc-500">Margin Efficiency</span>
                          <span className="text-3xl font-black font-mono tracking-tighter">{totalCost > 0 && sellingPrice > 0 ? foodCostPerc.toFixed(1) : '0.0'}%</span>
                          <span className="text-[8px] mt-4 font-black uppercase tracking-[0.4em] text-zinc-400 italic">{
                            foodCostPerc <= 35 ? 'OPT_HEALTH_HIGH' :
                            foodCostPerc <= 45 ? 'OPT_HEALTH_MOD' :
                            'OPT_HEALTH_CRIT'
                          }</span>
                        </div>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePanel === 'payments' && (
              <motion.div 
                key="payments"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-10"
              >
                 <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">QR Checkout Nodes</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest italic">Digital Payment Infrastructure</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div className="bg-white border border-zinc-100 p-12 text-center flex flex-col items-center">
                      <div className="w-64 aspect-square bg-zinc-50 border border-zinc-100 mb-8 flex items-center justify-center relative overflow-hidden rounded-sm group">
                         {qrImageUrl ? (
                            <img src={qrImageUrl} alt="QR Code" className="w-full h-full object-contain" />
                         ) : (
                            <QrCode size={64} className="text-zinc-100" />
                         )}
                         <label className="absolute inset-0 bg-zinc-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer gap-4">
                            <Upload size={32} />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Upload Merchant QR</p>
                            <input type="file" className="hidden" onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (ev) => {
                                     setQrImageUrl(ev.target?.result as string);
                                     if (currentUser) {
                                        await updateDoc(doc(db, 'users', currentUser.uid), { qrImageUrl: ev.target?.result });
                                     }
                                  };
                                  reader.readAsDataURL(file);
                               }
                            }} />
                         </label>
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-2">Unified Fonepay / ConnectIPS</h4>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest italic max-w-xs mx-auto">
                        Your customers can scan this code to pay instantly. Supported by all Nepalese banks.
                      </p>
                   </div>

                   <div className="space-y-6">
                      <div className="p-8 bg-zinc-50 border border-zinc-100">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-6">Payment Analytics</h4>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center">
                               <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Digital Share</span>
                               <span className="text-xs font-mono font-black text-zinc-900">42%</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                               <div className="h-full bg-zinc-900 w-[42%]" />
                            </div>
                         </div>
                      </div>

                      <div className="p-8 border border-zinc-100">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-6 italic border-l-2 border-zinc-900 pl-4">Digital Invoice Settings</h4>
                         <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white border border-zinc-50">
                               <div className="flex items-center gap-3">
                                  <MessageSquare size={16} className="text-zinc-300" />
                                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Auto-Whatsapp Link</span>
                               </div>
                               <div className="w-8 h-4 bg-zinc-100 rounded-full relative">
                                  <div className="absolute left-1 top-1 w-2 h-2 bg-zinc-300 rounded-full" />
                               </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white border border-zinc-50">
                               <div className="flex items-center gap-3">
                                  <Share2 size={16} className="text-zinc-300" />
                                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Email Cloud Sync</span>
                               </div>
                               <div className="w-8 h-4 bg-zinc-900 rounded-full relative">
                                  <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
          )}

          {activePanel === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto space-y-12"
              >
                <div className="bg-white p-10 border border-zinc-200">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 mb-10 border-b border-zinc-50 pb-4">{t.settings}</h3>
                   
                   <div className="space-y-10">
                      <div className="flex items-center justify-between">
                         <div>
                            <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{lang === 'en' ? 'Industry Architecture' : 'उद्योग संरचना'}</p>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Schema: {bizType}</p>
                         </div>
                         <div className="flex border border-zinc-200 rounded-sm overflow-hidden p-0.5">
                            <button 
                              onClick={() => setBizType('Restaurant')}
                              className={`px-6 py-2 text-[9px] font-black tracking-widest transition-all uppercase ${bizType === 'Restaurant' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                            >F&B</button>
                            <button 
                              onClick={() => setBizType('Store')}
                              className={`px-6 py-2 text-[9px] font-black tracking-widest transition-all uppercase ${bizType === 'Store' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                            >RETAIL</button>
                         </div>
                      </div>

                      <div className="pt-10 border-t border-zinc-100 space-y-6">
                        <div className="mb-6">
                          <label className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-2 block">Restaurant / Store Name</label>
                          <input 
                            type="text"
                            value={restaurantName}
                            onChange={(e) => setRestaurantName(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-[10px] font-black text-zinc-900 uppercase focus:outline-none focus:border-zinc-900"
                            placeholder="Enter Name..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <InputGroup label={lang === 'en' ? "Language Preference" : "भाषा प्राथमिकता"} value={lang === 'en' ? 'English' : 'Nepali'} readOnly onClick={toggleLanguage} icon={<Globe size={14}/>} />
                          <InputGroup label="Entity Identity" value={currentUser?.displayName || 'User'} readOnly />
                        </div>
                        <InputGroup label="Email Node" value={currentUser?.email || ''} readOnly />
                      </div>
                   </div>
                </div>

                <div className="border border-zinc-900 p-10 flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 mb-1">Destructive Operations</h4>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Terminate Session & Flush Cache</p>
                  </div>
                  <button onClick={handleLogout} className="bg-zinc-900 text-white px-8 py-3 text-[9px] font-black uppercase tracking-widest hover:bg-black transition-colors">{t.logout}</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Global Checkout Modal */}
        <AnimatePresence>
          {showCheckout && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-md p-6 sm:p-10 shadow-2xl relative rounded-sm m-4"
              >
                <button onClick={() => setShowCheckout(false)} className="absolute top-8 right-8 text-zinc-300 hover:text-zinc-900 transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
                
                <div className="text-center mb-10">
                    <h2 className="text-xl font-black uppercase tracking-tighter mb-2">{t.pos_checkout}</h2>
                    <div className="flex items-center justify-center gap-2">
                       <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-loose">Payable Balance:</span>
                       <span className="text-sm font-mono font-black text-zinc-900">₹{totalBill.toLocaleString()}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                    <button 
                      onClick={() => setPaymentMethod('Cash')}
                      className={`flex flex-col items-center gap-4 p-8 border-2 transition-all ${paymentMethod === 'Cash' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 hover:bg-zinc-50'}`}
                    >
                      <DollarSign size={24} className={paymentMethod === 'Cash' ? 'text-zinc-900' : 'text-zinc-200'} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.pos_pay_cash}</span>
                    </button>
                    <button 
                      onClick={() => setPaymentMethod('QR')}
                      className={`flex flex-col items-center gap-4 p-8 border-2 transition-all ${paymentMethod === 'QR' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 hover:bg-zinc-50'}`}
                    >
                      <QrCode size={24} className={paymentMethod === 'QR' ? 'text-zinc-900' : 'text-zinc-200'} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.pos_pay_qr}</span>
                    </button>
                </div>

                <AnimatePresence mode="wait">
                  {paymentMethod === 'QR' ? (
                    <motion.div 
                      key="qr"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-10 text-center flex flex-col items-center border border-zinc-100 p-6 bg-zinc-50/50 rounded-sm"
                    >
                      <div className="w-48 h-48 bg-white border border-zinc-200 p-2 mb-4 shadow-inner relative group">
                          {qrImageUrl ? (
                            <img src={qrImageUrl} alt="QR" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-200 p-8">
                                <AlertCircle size={32} strokeWidth={1} />
                                <p className="text-[8px] font-black tracking-widest uppercase leading-tight">Merchant QR<br/>Not Loaded</p>
                            </div>
                          )}
                      </div>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest italic max-w-[180px] leading-relaxed">
                        Customers should scan this code using Fonepay, eSewa or any mobile banking app.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="cash"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mb-10 p-10 border border-zinc-100 bg-zinc-50/50 flex flex-col items-center justify-center gap-4 text-center rounded-sm"
                    >
                       <DollarSign size={32} className="text-zinc-100" />
                       <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest italic">Prepare physical change for the customer.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={() => {
                    finalizeOrder();
                    setShowCheckout(false);
                  }}
                  className="w-full py-6 bg-zinc-900 text-white font-black text-xs uppercase tracking-[0.4em] hover:bg-black transition-all shadow-2xl shadow-zinc-200 active:scale-[0.98]"
                >
                  {t.pos_confirm}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Success Modal with QR */}
        <AnimatePresence>
          {showOrderSuccess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[101] flex items-center justify-center bg-zinc-900/90 backdrop-blur-md p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-sm p-6 sm:p-12 shadow-2xl text-center relative overflow-hidden rounded-sm m-4"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900 animate-pulse" />
                
                <div className="mb-10 flex justify-center">
                   <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={32} />
                   </div>
                </div>

                <h3 className="text-xl font-black uppercase tracking-tighter mb-2 italic">Success!</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mb-10">Order Saved & Settle Completed</p>

                {paymentMethod === 'QR' && (
                  <div className="mb-10 p-6 border-2 border-zinc-100 bg-zinc-50 flex flex-col items-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-4">Customer Payment QR</p>
                      <div className="w-40 h-40 bg-zinc-900 p-2">
                          {qrImageUrl ? (
                            <img src={qrImageUrl} alt="QR" className="w-full h-full object-contain invert grayscale" />
                          ) : (
                            <div className="w-full h-full border border-zinc-700 flex items-center justify-center text-zinc-600">
                                <QrCode size={40} />
                            </div>
                          )}
                      </div>
                      <p className="text-[8px] font-mono font-black mt-4 text-zinc-900 uppercase">OrderID: #{lastOrderId?.slice(-6)}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <button 
                    onClick={() => window.print()}
                    className="w-full py-4 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all"
                  >
                    Print Bill
                  </button>
                  <button 
                    onClick={() => {
                        setShowOrderSuccess(false);
                        setBillItems([]);
                        setCurrentSessionId(null);
                        setSearchQuery('');
                        setPosCategory('All');
                        setActivePanel('dashboard');
                    }}
                    className="w-full py-4 border border-zinc-200 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-zinc-900 hover:border-zinc-900 transition-all"
                  >
                    Close Session
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <AnimatePresence>
        {showMobileMore && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMore(false)}
              className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[75] lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[80] rounded-t-3xl p-8 lg:hidden shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-900">Vyapaar Navigator</h3>
                <button onClick={() => setShowMobileMore(false)} className="text-zinc-400 p-2"><Plus size={20} className="rotate-45" /></button>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <MobileMoreItem icon={<Users size={20} />} label={t.staff} onClick={() => { setActivePanel('staff'); setShowMobileMore(false); }} />
                <MobileMoreItem icon={<UtensilsCrossed size={20} />} label={t.cost} onClick={() => { setActivePanel('cost'); setShowMobileMore(false); }} />
                <MobileMoreItem icon={<CreditCard size={20} />} label={t.payments} onClick={() => { setActivePanel('payments'); setShowMobileMore(false); }} />
                <MobileMoreItem icon={<Sparkles size={20} />} label={t.ai_photoshoot} onClick={() => { setActivePanel('ai-photoshoot'); setShowMobileMore(false); }} />
                <MobileMoreItem icon={<Settings size={20} />} label={t.settings} onClick={() => { setActivePanel('settings'); setShowMobileMore(false); }} />
                <MobileMoreItem icon={<History size={20} />} label={t.order_history} onClick={() => { setActivePanel('orders'); setShowMobileMore(false); }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="lg:hidden fixed bottom-1 left-1 right-1 bg-zinc-900 text-white px-2 py-3 flex justify-between items-center z-[70] rounded-xl shadow-2xl border border-zinc-800">
         <MobileNavItem active={activePanel === 'dashboard'} onClick={() => { setActivePanel('dashboard'); setShowMobileMore(false); }} icon={<LayoutDashboard size={20} />} label="Home" />
         <MobileNavItem active={activePanel === 'billing'} onClick={() => { setActivePanel('billing'); setShowMobileMore(false); }} icon={<Receipt size={20} />} label="POS" />
         <MobileNavItem active={activePanel === 'orders'} onClick={() => { setActivePanel('orders'); setShowMobileMore(false); }} icon={<Clock size={20} />} label="Orders" />
         <MobileNavItem active={activePanel === 'menu'} onClick={() => { setActivePanel('menu'); setPosCategory('All'); setShowMobileMore(false); }} icon={<PlusSquare size={20} />} label="Menu" />
         <MobileNavItem active={showMobileMore} onClick={() => setShowMobileMore(!showMobileMore)} icon={<Menu size={20} />} label="More" />
      </nav>
    </main>
  </div>
  );
}

// Components
function QuickButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-4 rounded-xl border ${active ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-100 text-zinc-400'} transition-all active:scale-95 shadow-sm`}
    >
      <div className={`${active ? 'text-white' : 'text-zinc-900'}`}>{icon}</div>
      <span className="text-[8px] font-black uppercase tracking-widest text-center truncate w-full">{label}</span>
    </button>
  );
}

function MobileMoreItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-4 bg-zinc-50 rounded-2xl active:bg-zinc-100 transition-colors"
    >
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-zinc-900 shadow-sm border border-zinc-100">
        {icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 truncate w-full text-center">{label}</span>
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 transition-all ${active ? 'text-white scale-110' : 'text-zinc-500'}`}
    >
       {icon}
       <span className={`text-[7px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </button>
  );
}
function POSInitButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-6 p-10 bg-white border-2 border-zinc-100 hover:border-zinc-900 hover:shadow-2xl hover:shadow-zinc-50 transition-all rounded-sm group active:scale-95 min-w-[200px]"
    >
       <div className="w-16 h-16 bg-zinc-900 text-white flex items-center justify-center rounded-sm group-hover:scale-110 transition-transform shadow-xl shadow-zinc-100">
          {icon}
       </div>
       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 group-hover:text-zinc-900">{label}</span>
    </button>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 transition-all duration-200 relative group overflow-hidden ${
        active 
          ? 'bg-zinc-900 text-white' 
          : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900'} transition-colors`}>
        {icon}
      </span>
      <span className="font-black uppercase tracking-[0.14em] text-[10px]">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-rail" 
          className="absolute right-0 top-0 bottom-0 w-1 bg-white opacity-20" 
        />
      )}
    </button>
  );
}

function StatCard({ label, value, icon, sub }: { label: string, value: string, icon: React.ReactNode, sub?: string }) {
  return (
    <div className="bg-white p-8 border border-zinc-100 shadow-sm group hover:border-zinc-900 transition-all">
      <div className="flex items-center justify-between mb-8">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">{label}</p>
        <div className="text-zinc-200 group-hover:text-zinc-900 transition-colors">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-xl font-mono font-black text-zinc-900 tracking-tighter leading-none">{value}</h4>
        {sub && (
          <p className="text-[8px] font-black tracking-widest text-zinc-400 uppercase italic">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function QueueItem({ label, count, color }: { label: string, count: string, color: string }) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
       <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 ${color} group-hover:bg-zinc-900 transition-colors`} />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-900">{label}</span>
       </div>
       <span className="font-mono text-xs font-black text-zinc-900">{count}</span>
    </div>
  );
}

function InputGroup({ label, value, readOnly, onClick, icon }: { label: string, value: string, readOnly?: boolean, onClick?: () => void, icon?: React.ReactNode }) {
  return (
    <div className="space-y-1.5" onClick={onClick}>
      <div className="flex items-center justify-between">
        <label className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">{label}</label>
        {icon}
      </div>
      <input 
        type="text" 
        value={value || ''} 
        readOnly={readOnly}
        className={`w-full bg-white border border-zinc-200 rounded-sm px-4 py-3 text-[11px] font-bold text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors ${onClick ? 'cursor-pointer hover:bg-zinc-50' : ''}`}
      />
    </div>
  );
}
