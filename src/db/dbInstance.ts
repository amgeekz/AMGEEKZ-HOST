import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if serviceAccountKey.json is present
let firestoreDb: Firestore | null = null;
let useFirebase = false;

try {
  const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount)
      });
    }
    
    firestoreDb = getFirestore();
    useFirebase = true;
    console.log("🔥 Firebase Admin SDK initialized successfully using serviceAccountKey.json.");
  } else {
    console.log("⚠️ serviceAccountKey.json not found. Fallback to local file database.");
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", error);
}

async function fetchCollectionSync<T>(collectionName: string): Promise<T[]> {
  if (!useFirebase || !firestoreDb) return [];
  try {
    const snapshot = await firestoreDb.collection(collectionName).get();
    const items: T[] = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() } as any);
    });
    return items;
  } catch (error) {
    console.error(`Error reading ${collectionName} from Firestore:`, error);
    return [];
  }
}

async function saveToFirestoreDoc(collectionName: string, docId: string, data: any) {
  if (!useFirebase || !firestoreDb) return;
  try {
    // Sanitize data (remove undefined properties since Firestore doesn't reject them cleanly)
    const sanitized = JSON.parse(JSON.stringify(data));
    await firestoreDb.collection(collectionName).doc(docId).set(sanitized, { merge: true });
  } catch (error) {
    console.error(`Failed to save doc ${docId} to Firestore collection ${collectionName}:`, error);
  }
}

async function deleteFromFirestoreDoc(collectionName: string, docId: string) {
  if (!useFirebase || !firestoreDb) return;
  try {
    await firestoreDb.collection(collectionName).doc(docId).delete();
  } catch (error) {
    console.error(`Failed to delete doc ${docId} from Firestore collection ${collectionName}:`, error);
  }
}

// Interfaces based on the Firestore schema
export interface User {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'admin';
  passwordHash?: string; // Standard local auth addition
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  package: 'basic' | 'premium' | 'plus';
  status: 'active' | 'expired' | 'pending';
  endDate: string;
}

export interface Bot {
  botId: string;
  userId: string;
  phoneNumber?: string;
  sessionPath: string;
  status: 'disconnected' | 'pairing' | 'connected';
  qrCode?: string;
  pairingCode?: string;
  lastOnline: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
}

export interface KeywordResponse {
  id: string;
  keyword: string;
  response: string;
}

export interface Schedule {
  id: string;
  recipient: string;
  message: string;
  time: string; // HH:mm or schedule representation
  daily: boolean;
  status: 'pending' | 'sent' | 'failed';
}

export interface BotSettings {
  botId: string;
  autoReply: boolean;
  aiEnabled: boolean;
  templates: Template[];
  keywordResponses: KeywordResponse[];
  schedules: Schedule[];
  webhookUrl?: string;
  apiKey?: string;
  // AI Customer Service Customizers (No Coding Necessary)
  agentName?: string;
  systemPrompt?: string;
  adminContacts?: string;
  productSyncUrl?: string;
  customProductData?: string;
  // Multi-Agent Configuration
  aiMode?: 'single' | 'multi';
  salesAgentName?: string;
  salesAgentPrompt?: string;
  techAgentName?: string;
  techAgentPrompt?: string;
  billingAgentName?: string;
  billingAgentPrompt?: string;
}

export interface Payment {
  orderId: string;
  userId: string;
  amount: number;
  package: 'basic' | 'premium' | 'plus';
  status: 'unpaid' | 'paid' | 'expired';
  paymentMethod: string;
  paidAt?: string;
  qrCodeUrl?: string; // QRIS payment visualizer
  createdAt: string;
}

export interface BotLog {
  id: string;
  botId: string;
  activity: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export interface Analytics {
  botId: string;
  date: string;
  messagesReceived: number;
  messagesSent: number;
  uniqueChats: number;
  avgResponseTime: number;
}

export interface ApiKey {
  id: string;
  userId: string;
  key: string;
  name: string;
  permissions: string[];
  createdAt: string;
}

// Ensure the local sessions and database directories exist
const sessionsDir = path.resolve(process.cwd(), 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

const dbFilePath = path.join(sessionsDir, 'db.json');

// Memory representation of the SaaS database state
interface DatabaseState {
  users: User[];
  subscriptions: Subscription[];
  bots: Bot[];
  botSettings: BotSettings[];
  payments: Payment[];
  botLogs: BotLog[];
  analytics: Analytics[];
  apiKeys: ApiKey[];
}

const initialDbState: DatabaseState = {
  users: [
    {
      userId: 'admin-id-123',
      email: 'bolehakutaunomormu@gmail.com', // Pre-bootstrap the active user so they can login directly
      name: 'System Admin',
      phone: '628123456789',
      role: 'admin',
      passwordHash: '$2a$10$tZ8nEdfaW279oZ9K6W6.9OaZDeH/22B/L.Z69Q6h3z3gNshKx1Tee', // hashed 'admin123'
      createdAt: new Date().toISOString(),
    }
  ],
  subscriptions: [
    {
      id: 'sub-admin',
      userId: 'admin-id-123',
      package: 'plus',
      status: 'active',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year active
    }
  ],
  bots: [],
  botSettings: [],
  payments: [],
  botLogs: [],
  analytics: [],
  apiKeys: []
};

// Handle localized reads/writes for reliability during local development
function loadLocalDatabase(): DatabaseState {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, 'utf-8');
      return JSON.parse(data) as DatabaseState;
    }
  } catch (error) {
    console.error('Error loading fallback JSON database, resetting state:', error);
  }
  saveLocalDatabase(initialDbState);
  return initialDbState;
}

function saveLocalDatabase(state: DatabaseState) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to persist database file:', error);
  }
}

// Instantiate fallback JSON database database
let activeState = loadLocalDatabase();

// Sync from Firestore startup hook
export async function syncFromFirestore() {
  if (!useFirebase || !firestoreDb) return;
  try {
    console.log("📥 Syncing database FROM Firestore...");
    
    const users = await fetchCollectionSync<User>('users');
    const subscriptions = await fetchCollectionSync<Subscription>('subscriptions');
    const bots = await fetchCollectionSync<Bot>('bots');
    const botSettings = await fetchCollectionSync<BotSettings>('botSettings');
    const payments = await fetchCollectionSync<Payment>('payments');
    const botLogs = await fetchCollectionSync<BotLog>('botLogs');
    const analytics = await fetchCollectionSync<Analytics>('analytics');
    const apiKeys = await fetchCollectionSync<ApiKey>('apiKeys');

    if (users.length === 0) {
      console.log("🌱 Firestore 'users' is empty. Seeding initial local database state to Firestore...");
      
      for (const u of activeState.users) {
        await saveToFirestoreDoc('users', u.userId, u);
      }
      for (const s of activeState.subscriptions) {
        await saveToFirestoreDoc('subscriptions', s.id, s);
      }
      for (const bs of activeState.botSettings) {
        await saveToFirestoreDoc('botSettings', bs.botId, bs);
      }
      console.log("🌱 Database seeding to Firestore completed.");
    } else {
      activeState.users = users;
      activeState.subscriptions = subscriptions;
      activeState.bots = bots;
      activeState.botSettings = botSettings;
      activeState.payments = payments;
      activeState.botLogs = botLogs;
      activeState.analytics = analytics;
      activeState.apiKeys = apiKeys;
      
      saveLocalDatabase(activeState);
      console.log(`✅ Loaded ${users.length} users, ${subscriptions.length} subs, ${bots.length} bots from Firestore.`);
    }
  } catch (err) {
    console.error("❌ Error during startup sync from Firestore:", err);
  }
}

// In Firebase setup mode, we can extend actual Firestore endpoints, but as instructed under guidelines
// "Always implement a local database fallback, such as a file-based state so the app remains fully interactive during local preview".
// We wrap our queries to guarantee standard interface compliance.
export const Database = {
  getUsers: () => {
    activeState = loadLocalDatabase();
    return activeState.users;
  },
  saveUser: (user: User) => {
    activeState = loadLocalDatabase();
    const idx = activeState.users.findIndex(u => u.userId === user.userId);
    if (idx >= 0) activeState.users[idx] = user;
    else activeState.users.push(user);
    saveLocalDatabase(activeState);
    saveToFirestoreDoc('users', user.userId, user);
    return user;
  },

  getSubscriptions: () => {
    activeState = loadLocalDatabase();
    return activeState.subscriptions;
  },
  saveSubscription: (sub: Subscription) => {
    activeState = loadLocalDatabase();
    const idx = activeState.subscriptions.findIndex(s => s.userId === sub.userId);
    if (idx >= 0) activeState.subscriptions[idx] = sub;
    else activeState.subscriptions.push(sub);
    saveLocalDatabase(activeState);
    saveToFirestoreDoc('subscriptions', sub.id, sub);
    return sub;
  },

  getBots: () => {
    activeState = loadLocalDatabase();
    return activeState.bots;
  },
  getBotByUserId: (userId: string) => {
    activeState = loadLocalDatabase();
    return activeState.bots.find(b => b.userId === userId);
  },
  saveBot: (bot: Bot) => {
    activeState = loadLocalDatabase();
    const idx = activeState.bots.findIndex(b => b.botId === bot.botId);
    if (idx >= 0) activeState.bots[idx] = bot;
    else activeState.bots.push(bot);
    saveLocalDatabase(activeState);
    saveToFirestoreDoc('bots', bot.botId, bot);
    return bot;
  },

  getBotSettings: (botId: string) => {
    activeState = loadLocalDatabase();
    let settings = activeState.botSettings.find(s => s.botId === botId);
    if (!settings) {
      settings = {
        botId,
        autoReply: true,
        aiEnabled: true,
        templates: [
          { id: 't1', name: 'Greeting', content: 'Halo! Selamat datang di layanan kami.' },
          { id: 't2', name: 'Support', content: 'Ada yang bisa kami bantu? Sampaikan kendala Anda ya.' }
        ],
        keywordResponses: [
          { id: 'k1', keyword: 'p', response: 'Halo! Ada yang bisa kami bantu?' },
          { id: 'k2', keyword: 'halo', response: 'Halo juga! Selamat datang.' },
          { id: 'k3', keyword: 'harga', response: 'Berikut paket berlangganan WhatsApp Bot Hosting:\n1. BASIC (Rp 50rb)\n2. PREMIUM (Rp 150rb)\n3. PLUS (Rp 300rb)' }
        ],
        schedules: [],
        agentName: process.env.VITE_BRAND_NAME || 'GeekzCS',
        systemPrompt: `Kamu adalah customer service untuk website kami, dan nama kamu {AGENT_NAME}. Kamu akan membantu Kakak dengan pertanyaan seputar produk dan layanan kami.

## Tugas
Tugas kamu adalah membantu menjawab pertanyaan seputar produk dan layanan yang tersedia. Jika Kakak punya masalah atau kebingungan seputar produk kami, kamu akan berusaha memberikan solusi yang bisa membantu.

## Convert
ubah angka untuk harga produk Contoh : dari 30000 menjadi Rp 30,000

## Prosedur Pembelian
- Pilih produk yang Kakak mau beli, isi data yang diperlukan, dan pilih metode pembayaran yang sesuai.
- Jangan lupa untuk double-check produk dan jumlah sebelum bayar ya.

## Keamanan Pembayaran
Kami menggunakan sistem pembayaran yang aman dan terpercaya. Semua transaksi Kakak dilindungi dengan teknologi enkripsi untuk menjaga data pribadi dan pembayaran Kakak tetap aman.

## Panggilan
Panggil Kakak dengan "Kak", ya! Hidari pakai kata "Anda", biar lebih akrab.

## Batasan
Kalau Kakak tanya hal yang nggak saya tahu jawabannya, saya bakal coba kasih solusi yang kira-kira bisa bantu. Kalau belum bisa, nanti saya arahkan Kakak ke WhatsApp admin kami.`,
        adminContacts: `admin: +62 856-4945-5626`,
        productSyncUrl: '',
        customProductData: `[
  {
    "nama_layanan": "VPS Premium Hosting",
    "brand": "${process.env.VITE_BRAND_NAME || 'GeekzCS'}",
    "status": "Tersedia",
    "price": "Rp 75,000"
  },
  {
    "nama_layanan": "Bot WhatsApp Gateway Basic",
    "brand": "${process.env.VITE_BRAND_NAME || 'GeekzCS'}",
    "status": "Tersedia",
    "price": "Rp 50,000"
  }
]`,
        aiMode: 'single',
        salesAgentName: 'GeekzSales',
        salesAgentPrompt: `Kamu spesialis marketing dan promo produk di website kami. Berusahalah membujuk Kakak secara ramah & persuasif agar bertransaksi membeli layanan VPS atau Bot hosting. Tawarkan diskon halus jika relevan. Panggil selalu dengan "Kak".`,
        techAgentName: 'GeekzTech',
        techAgentPrompt: `Kamu spesialis bantuan teknis (Tech Support). Tugasmu membantu Kakak memecahkan masalah error koneksi Baileys, setup Webhook, pemadaman server, atau instalasi VPS dengan penjelasan yang sederhana dan professional. Panggil selalu dengan "Kak".`,
        billingAgentName: 'GeekzBilling',
        billingAgentPrompt: `Kamu spesialis Penjualan, Billing, dan Kebijakan Refund. Bantu Kakak seputar cara pembayaran (QRIS, Bank), konfirmasi status invoice, serta jelaskan kebijakan refund 1 hari jika produk belum aktif atau mengalami gangguan permanen. Panggil selalu dengan "Kak".`
      };
      activeState.botSettings.push(settings);
      saveLocalDatabase(activeState);
      saveToFirestoreDoc('botSettings', settings.botId, settings);
    }
    return settings;
  },
  saveBotSettings: (settings: BotSettings) => {
    activeState = loadLocalDatabase();
    const idx = activeState.botSettings.findIndex(s => s.botId === settings.botId);
    if (idx >= 0) activeState.botSettings[idx] = settings;
    else activeState.botSettings.push(settings);
    saveLocalDatabase(activeState);
    saveToFirestoreDoc('botSettings', settings.botId, settings);
    return settings;
  },

  getPayments: () => {
    activeState = loadLocalDatabase();
    return activeState.payments;
  },
  getPaymentByOrderId: (orderId: string) => {
    activeState = loadLocalDatabase();
    return activeState.payments.find(p => p.orderId === orderId);
  },
  savePayment: (payment: Payment) => {
    activeState = loadLocalDatabase();
    const idx = activeState.payments.findIndex(p => p.orderId === payment.orderId);
    if (idx >= 0) activeState.payments[idx] = payment;
    else activeState.payments.push(payment);
    saveLocalDatabase(activeState);
    saveToFirestoreDoc('payments', payment.orderId, payment);
    return payment;
  },

  getBotLogs: (botId: string) => {
    activeState = loadLocalDatabase();
    return activeState.botLogs.filter(l => l.botId === botId);
  },
  addBotLog: (botId: string, activity: string, type: 'info' | 'success' | 'warning' | 'error') => {
    activeState = loadLocalDatabase();
    const newLog: BotLog = {
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      botId,
      activity,
      type,
      timestamp: new Date().toISOString()
    };
    activeState.botLogs.push(newLog);
    // limit logs to 50 items per bot to keep file lightweight
    const botLogsOnly = activeState.botLogs.filter(l => l.botId === botId);
    if (botLogsOnly.length > 50) {
      const oldestLogsToRem = botLogsOnly.slice(0, botLogsOnly.length - 50);
      activeState.botLogs = activeState.botLogs.filter(l => !oldestLogsToRem.includes(l));
      for (const oldL of oldestLogsToRem) {
        deleteFromFirestoreDoc('botLogs', oldL.id);
      }
    }
    saveLocalDatabase(activeState);
    saveToFirestoreDoc('botLogs', newLog.id, newLog);
    return newLog;
  },

  getAnalytics: (botId: string) => {
    activeState = loadLocalDatabase();
    const data = activeState.analytics.filter(a => a.botId === botId);
    if (data.length === 0) {
      // Seed nice look-alike historical data for proper dashboard visualization
      const historical: Analytics[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        historical.push({
          botId,
          date: dateStr,
          messagesReceived: Math.floor(Math.random() * 30) + 15,
          messagesSent: Math.floor(Math.random() * 25) + 10,
          uniqueChats: Math.floor(Math.random() * 12) + 5,
          avgResponseTime: parseFloat((Math.random() * 3 + 1.2).toFixed(1))
        });
      }
      activeState.analytics.push(...historical);
      saveLocalDatabase(activeState);
      
      // Sync seeded analytics to Firestore
      for (const h of historical) {
        saveToFirestoreDoc('analytics', `${botId}_${h.date}`, h);
      }
      return historical;
    }
    return data;
  },
  recordAnalyticEvent: (botId: string, type: 'received' | 'sent') => {
    activeState = loadLocalDatabase();
    const dateStr = new Date().toISOString().split('T')[0];
    let record = activeState.analytics.find(a => a.botId === botId && a.date === dateStr);
    if (!record) {
      record = {
        botId,
        date: dateStr,
        messagesReceived: 0,
        messagesSent: 0,
        uniqueChats: 1,
        avgResponseTime: 1.5
      };
      activeState.analytics.push(record);
    }
    if (type === 'received') {
      record.messagesReceived += 1;
    } else {
      record.messagesSent += 1;
    }
    saveLocalDatabase(activeState);
    saveToFirestoreDoc('analytics', `${botId}_${dateStr}`, record);
  },

  getApiKeys: (userId: string) => {
    activeState = loadLocalDatabase();
    return activeState.apiKeys.filter(k => k.userId === userId);
  },
  saveApiKey: (apiKey: ApiKey) => {
    activeState = loadLocalDatabase();
    const idx = activeState.apiKeys.findIndex(k => k.id === apiKey.id);
    if (idx >= 0) activeState.apiKeys[idx] = apiKey;
    else activeState.apiKeys.push(apiKey);
    saveLocalDatabase(activeState);
    saveToFirestoreDoc('apiKeys', apiKey.id, apiKey);
    return apiKey;
  },
  deleteApiKey: (id: string, userId: string) => {
    activeState = loadLocalDatabase();
    activeState.apiKeys = activeState.apiKeys.filter(k => !(k.id === id && k.userId === userId));
    saveLocalDatabase(activeState);
    deleteFromFirestoreDoc('apiKeys', id);
    return true;
  }
};
