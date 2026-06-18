import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database, User, Bot, Subscription, Payment, BotSettings, ApiKey } from '../db/dbInstance';
import { authenticateToken, requireAdmin, requireFeature, AuthenticatedRequest } from '../middleware/auth';
import { BotService } from '../services/botService';
import { PakasirService } from '../services/pakasir';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secure-geekzhost-secret-string';

// Helper to attach Socket.io instance dynamically in routes if available
let socketIoInstance: any = null;
export function setSocketIo(io: any) {
  socketIoInstance = io;
}

// ===================================================================
// AUTH SYSTEM
// ===================================================================

// Register Endpoint
router.post('/auth/register', (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, Password, dan Nama lengkap wajib diisi.' });
      return;
    }

    const existingUsers = Database.getUsers();
    if (existingUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(400).json({ error: 'Alamat email sudah terdaftar di sistem.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = 'usr-' + Math.random().toString(36).substring(2, 11);

    const newUser: User = {
      userId,
      email,
      name,
      phone,
      role: 'user',
      passwordHash,
      createdAt: new Date().toISOString()
    };

    Database.saveUser(newUser);

    // Auto-create standard BASIC subscription (Trial mode)
    const initialSub: Subscription = {
      id: 'sub-' + Math.random().toString(36).substring(2, 11),
      userId,
      package: 'basic',
      status: 'active',
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days trial
    };
    Database.saveSubscription(initialSub);

    // Generate JWT Access Token
    const token = jwt.sign({ userId, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registrasi Akun sukses!',
      token,
      user: { userId, email, name, phone, role: 'user' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kegagalan rute registrasi.' });
  }
});

// Login Endpoint
router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
       res.status(400).json({ error: 'Email dan password wajib diisi.' });
       return;
    }

    const user = Database.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
       res.status(401).json({ error: 'Email atau password salah.' });
       return;
    }

    const token = jwt.sign({ userId: user.userId, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login sukses!',
      token,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login gagal.' });
  }
});

// Email Verification Mock
router.post('/auth/verify-email', (req, res) => {
  res.json({ message: 'Email verifikasi sukses diproses!' });
});

// Forgot Password Mock
router.post('/auth/forgot-password', (req, res) => {
  res.json({ message: 'Tautan reset sandi sukses dikirim ke email Anda.' });
});

// Reset Password Mock
router.post('/auth/reset-password', (req, res) => {
  res.json({ message: 'Kata sandi Anda berhasil diperbarui.' });
});

// ===================================================================
// USER & SUBSCRIPTION
// ===================================================================

router.get('/user/profile', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }
  const { passwordHash, ...safeUser } = req.user as any;
  res.json({ user: safeUser });
});

router.put('/user/profile', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    const { name, phone } = req.body;
    const updatedUser = {
      ...req.user,
      name: name || req.user.name,
      phone: phone || req.user.phone
    };
    Database.saveUser(updatedUser);
    res.json({ message: 'Profil berhasil diperbarui!', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Gagal merubah profil.' });
  }
});

router.get('/user/subscription', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  const sub = Database.getSubscriptions().find(s => s.userId === userId);
  res.json({ subscription: sub });
});

// Pay/Upgrade package endpoint
router.post('/user/upgrade', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { packageTier } = req.body;
    if (!packageTier || !['basic', 'premium', 'plus'].includes(packageTier)) {
       res.status(400).json({ error: 'Paket tidak valid' });
       return;
    }

    const order = await PakasirService.createTransaction(
      req.user!.userId,
      packageTier,
      req.user!.email,
      req.user!.name
    );

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses peningkatan paket.' });
  }
});

// ===================================================================
// WHATSAPP BOT MANAGEMENT
// ===================================================================

// Provision new Bot document for user if not yet present
router.post('/bot/create', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    let bot = Database.getBotByUserId(userId);
    if (!bot) {
      bot = {
        botId: 'bot-' + Math.random().toString(36).substring(2, 10),
        userId,
        sessionPath: `./sessions/bot-${userId}`,
        status: 'disconnected',
        lastOnline: new Date().toISOString()
      };
      Database.saveBot(bot);
      Database.addBotLog(bot.botId, 'Bot Instance siap deployed!', 'success');
    }
    const settings = Database.getBotSettings(bot.botId);
    res.json({ bot, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed provisioning bot doc.' });
  }
});

router.get('/bot/status', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const bot = Database.getBotByUserId(userId);
  if (!bot) {
    res.status(404).json({ error: 'WhatsApp bot belum dideploy. Silahkan klik Deploy Bot.' });
    return;
  }
  const sizeMeta = BotService.checkSessionSize(bot.botId);
  const logs = Database.getBotLogs(bot.botId).slice(-15); // latest 15 logs
  res.json({ bot, sizeInfo: sizeMeta, logs });
});

router.post('/bot/start', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const bot = Database.getBotByUserId(userId);
    if (!bot) {
       res.status(404).json({ error: 'Bot document not found. Create one first.' });
       return;
    }
    const { method, phoneNumber } = req.body || {};
    const updatedBot = await BotService.startBot(bot.botId, userId, socketIoInstance, method, phoneNumber);
    res.json({ bot: updatedBot });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyalakan WhatsApp Bot.' });
  }
});

router.post('/bot/stop', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const bot = Database.getBotByUserId(userId);
    if (!bot) {
       res.status(404).json({ error: 'Bot not configured.' });
       return;
    }
    const updatedBot = await BotService.stopBot(bot.botId, userId, socketIoInstance);
    res.json({ bot: updatedBot });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mematikan bot.' });
  }
});

router.get('/bot/settings', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const bot = Database.getBotByUserId(userId);
  if (!bot) {
    res.status(404).json({ error: 'Bot instance not found.' });
    return;
  }
  const s = Database.getBotSettings(bot.botId);
  res.json({ settings: s });
});

router.put('/bot/settings', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const bot = Database.getBotByUserId(userId);
    if (!bot) {
       res.status(404).json({ error: 'Bot not found' });
       return;
    }

    const { autoReply, aiEnabled, templates, keywordResponses, webhookUrl } = req.body;
    const currentSettings = Database.getBotSettings(bot.botId);

    const updated: BotSettings = {
      botId: bot.botId,
      autoReply: typeof autoReply === 'boolean' ? autoReply : currentSettings.autoReply,
      aiEnabled: typeof aiEnabled === 'boolean' ? aiEnabled : currentSettings.aiEnabled,
      templates: templates || currentSettings.templates,
      keywordResponses: keywordResponses || currentSettings.keywordResponses,
      schedules: currentSettings.schedules, // managed separately or united
      webhookUrl: webhookUrl || currentSettings.webhookUrl
    };

    Database.saveBotSettings(updated);
    Database.addBotLog(bot.botId, 'Konfigurasi Bot Auto-Reply sukses diperbarui.', 'success');
    res.json({ message: 'Settings saved successfully!', settings: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed updating configuration.' });
  }
});

// Schedules
router.post('/bot/schedule', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const bot = Database.getBotByUserId(userId);
    if (!bot) {
       res.status(404).json({ error: 'Bot instance not linked.' });
       return;
    }

    const { recipient, message, time, daily } = req.body;
    if (!recipient || !message || !time) {
      res.status(400).json({ error: 'Target penerima, isi pesan, dan waktu kirim wajib diisi.' });
      return;
    }

    const settings = Database.getBotSettings(bot.botId);
    
    // Check tier count constraint
    const userSub = Database.getSubscriptions().find(s => s.userId === userId);
    const tier = userSub?.package || 'basic';
    if (tier === 'basic' && settings.schedules.length >= 10) {
      res.status(403).json({ error: 'Batas jadwal terlampaui. Paket BASIC dibatasi maksimal 10 jadwal pesan per hari.' });
      return;
    } else if (tier === 'premium' && settings.schedules.length >= 50) {
      res.status(403).json({ error: 'Batas jadwal terlampaui. Paket PREMIUM dibatasi maksimal 50 jadwal pesan per hari.' });
      return;
    }

    const newSched = {
      id: 'sch-' + Math.random().toString(36).substring(2, 9),
      recipient,
      message,
      time,
      daily: !!daily,
      status: 'pending' as const
    };

    settings.schedules.push(newSched);
    Database.saveBotSettings(settings);
    Database.addBotLog(bot.botId, `Jadwal Broadcast baru diset untuk ${recipient} pada pukul ${time}`, 'success');

    res.json({ message: 'Broadcast schedule created successfully!', schedule: newSched });
  } catch (err) {
    res.status(500).json({ error: 'Failed establishing schedule broadcast.' });
  }
});

router.get('/bot/schedules', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const bot = Database.getBotByUserId(userId);
  if (!bot) {
    res.json({ schedules: [] });
    return;
  }
  const settings = Database.getBotSettings(bot.botId);
  res.json({ schedules: settings.schedules });
});

router.delete('/bot/schedule/:id', authenticateToken as any, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const bot = Database.getBotByUserId(userId);
    if (!bot) {
       res.status(404).json({ error: 'Bot not linked.' });
       return;
    }

    const settings = Database.getBotSettings(bot.botId);
    const initialLen = settings.schedules.length;
    settings.schedules = settings.schedules.filter(s => s.id !== req.params.id);

    if (settings.schedules.length === initialLen) {
      res.status(404).json({ error: 'Schedule index not found.' });
      return;
    }

    Database.saveBotSettings(settings);
    Database.addBotLog(bot.botId, 'Broadcast scheduler slot dihapus.', 'warning');
    res.json({ message: 'Schedule removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed clearing schedule item.' });
  }
});

// ===================================================================
// PAYMENT VERIFICATION & WEBHOOKS
// ===================================================================

router.post('/payment/create', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { packageTier } = req.body;
    if (!['basic', 'premium', 'plus'].includes(packageTier)) {
      res.status(400).json({ error: 'Package tier not valid' });
      return;
    }
    const order = await PakasirService.createTransaction(req.user!.userId, packageTier, req.user!.email, req.user!.name);
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Failed generating invoice' });
  }
});

router.get('/payment/status/:orderId', async (req, res) => {
  try {
    const payment = await PakasirService.checkTransactionStatus(req.params.orderId);
    if (!payment) {
      res.status(404).json({ error: 'Order ID tidak ditemukan.' });
      return;
    }
    res.json({ order: payment });
  } catch (err) {
    res.status(500).json({ error: 'Error checking invoice status' });
  }
});

// Pakasir callback webhook
router.post('/webhook/pakasir', async (req, res) => {
  try {
    const { order_id, status } = req.body;
    console.log(`Received Pakasir Webhook notification for ${order_id}, state: ${status}`);
    
    const payment = Database.getPaymentByOrderId(order_id);
    if (!payment) {
      res.status(404).json({ error: 'Referenced Order not found' });
      return;
    }

    if (status === 'success' || status === 'SUCCESS' || status === 'paid' || status === 'PAID') {
      await PakasirService.triggerSimulatedCallback(order_id);
      
      // Dispatch live notification socket
      if (socketIoInstance) {
        socketIoInstance.emit(`payment-success:${payment.userId}`, { orderId: order_id, package: payment.package });
      }
    }

    const brand = process.env.VITE_BRAND_NAME || 'GeekzCS';
    res.json({ message: `Webhook callback processed successfully by ${brand} Backend` });
  } catch (err) {
    res.status(500).json({ error: 'Internal callback fail' });
  }
});

// Interactive local Sandbox bypass tool to instantly process payments
router.post('/payment/simulate-success', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.body;
    const payment = Database.getPaymentByOrderId(orderId);
    if (!payment) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const updated = await PakasirService.triggerSimulatedCallback(orderId);
    
    if (socketIoInstance) {
      socketIoInstance.emit(`payment-success:${payment.userId}`, { orderId, package: payment.package });
    }

    res.json({ message: 'Pembayaran berhasil disimulasikan!', order: updated });
  } catch (err) {
    res.status(500).json({ error: 'Bypass checkout failed' });
  }
});

// ===================================================================
// ANALYTICS ENDPOINTS (Plus Tier Exclusive)
// ===================================================================

router.get('/analytics/daily', authenticateToken as any, requireFeature('plus') as any, (req: AuthenticatedRequest, res) => {
  const bot = Database.getBotByUserId(req.user!.userId);
  if (!bot) {
    res.json({ analytics: [] });
    return;
  }
  const data = Database.getAnalytics(bot.botId);
  res.json({ analytics: data });
});

router.get('/analytics/chart', authenticateToken as any, requireFeature('plus') as any, (req: AuthenticatedRequest, res) => {
  const bot = Database.getBotByUserId(req.user!.userId);
  if (!bot) {
    res.json({ chart: [] });
    return;
  }
  const data = Database.getAnalytics(bot.botId);
  res.json({ chart: data });
});

// ===================================================================
// API KEY WORKFLOWS (Plus Tier Exclusive)
// ===================================================================

router.get('/keys', authenticateToken as any, requireFeature('plus') as any, (req: AuthenticatedRequest, res) => {
  const keys = Database.getApiKeys(req.user!.userId);
  res.json({ keys });
});

router.post('/keys/create', authenticateToken as any, requireFeature('plus') as any, (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.body;
    if (!name) {
       res.status(400).json({ error: 'Nama label API key diperlukan.' });
       return;
    }

    const newKey: ApiKey = {
      id: 'key-' + Math.random().toString(36).substring(2, 10),
      userId: req.user!.userId,
      key: 'hhost_live_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12),
      name,
      permissions: ['read', 'write', 'webhook'],
      createdAt: new Date().toISOString()
    };

    Database.saveApiKey(newKey);
    res.status(201).json({ message: 'API Key berhasil digenerate!', apiKey: newKey });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat API key.' });
  }
});

router.delete('/keys/:id', authenticateToken as any, requireFeature('plus') as any, (req: AuthenticatedRequest, res) => {
  try {
    Database.deleteApiKey(req.params.id, req.user!.userId);
    res.json({ message: 'API Key dicabut!' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mereduksi API key.' });
  }
});

// ===================================================================
// ADMIN PORTAL
// ===================================================================

router.get('/admin/users', authenticateToken as any, requireAdmin as any, (req, res) => {
  const users = Database.getUsers();
  res.json({ users });
});

router.put('/admin/user/:id/status', authenticateToken as any, requireAdmin as any, (req, res) => {
  try {
    const { role } = req.body;
    const users = Database.getUsers();
    const targetedUser = users.find(u => u.userId === req.params.id);
    
    if (!targetedUser) {
      res.status(404).json({ error: 'User target tidak ditemukan.' });
      return;
    }

    targetedUser.role = role || targetedUser.role;
    Database.saveUser(targetedUser);
    res.json({ message: 'Role user diperbarui oleh Admin!', user: targetedUser });
  } catch (err) {
    res.status(500).json({ error: 'Error modifying user.' });
  }
});

router.get('/admin/payments', authenticateToken as any, requireAdmin as any, (req, res) => {
  const payments = Database.getPayments();
  res.json({ payments });
});

router.get('/admin/stats', authenticateToken as any, requireAdmin as any, (req, res) => {
  const users = Database.getUsers();
  const subs = Database.getSubscriptions();
  const payments = Database.getPayments();
  const bots = Database.getBots();

  const totalRev = payments.filter(p => p.status === 'paid').reduce((total, cur) => total + cur.amount, 0);

  res.json({
    stats: {
      totalUsers: users.length,
      activeBots: bots.filter(b => b.status === 'connected').length,
      trialBots: subs.filter(s => s.package === 'basic' && s.status === 'active').length,
      premiumBots: subs.filter(s => s.package === 'premium' && s.status === 'active').length,
      plusBots: subs.filter(s => s.package === 'plus' && s.status === 'active').length,
      revenue: totalRev
    }
  });
});

export default router;
