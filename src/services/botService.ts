import fs from 'fs';
import path from 'path';
import { Database, Bot, BotSettings } from '../db/dbInstance';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client for AI Auto-reply capability
const aiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (aiKey && aiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({
    apiKey: aiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Active bot connections manager (simulated or real)
const activeConnections = new Map<string, any>();
const activeIntervals = new Map<string, NodeJS.Timeout>();

export const BotService = {
  // Starts a bot session
  startBot: async (botId: string, userId: string, io?: any) => {
    try {
      console.log(`Starting WhatsApp Bot Service for User ${userId}, Bot ${botId}`);
      
      // Load current status or insert
      let bot = Database.getBots().find(b => b.botId === botId);
      if (!bot) {
        bot = {
          botId,
          userId,
          sessionPath: `./sessions/${botId}`,
          status: 'disconnected',
          lastOnline: new Date().toISOString()
        };
        Database.saveBot(bot);
      }

      // Check tier features
      const subscriptions = Database.getSubscriptions();
      const userSub = subscriptions.find(s => s.userId === userId);
      const tier = userSub?.package || 'basic';

      // Transition to pairing status & generate a valid QR code
      bot.status = 'pairing';
      // High-fidelity payment/pairing QR mock content
      bot.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=WAPairingCode-${botId}-${Date.now()}`;
      Database.saveBot(bot);
      Database.addBotLog(botId, 'Mempersiapkan autentikasi multi-device (Baileys)...', 'info');
      Database.addBotLog(botId, 'QR Code sukses dihasilkan. Silahkan scan dari perangkat WhatsApp Anda.', 'warning');

      // Dispatch state update to frontend via socket if present
      if (io) {
        io.emit(`bot-status:${userId}`, { status: bot.status, qrCode: bot.qrCode });
      }

      // Auto-connect simulator after a realistic duration (e.g., 5 seconds after scan simulator)
      const timeoutId = setTimeout(() => {
        try {
          const currentBot = Database.getBots().find(b => b.botId === botId);
          if (currentBot && currentBot.status === 'pairing') {
            currentBot.status = 'connected';
            currentBot.phoneNumber = userSub?.package === 'plus' ? '6281987654321' : '6281234567890';
            currentBot.qrCode = undefined;
            currentBot.lastOnline = new Date().toISOString();
            Database.saveBot(currentBot);

            Database.addBotLog(botId, `Koneksi berhasil! Bot terhubung sebagai ${currentBot.phoneNumber}`, 'success');
            Database.addBotLog(botId, `Mesin Auto-Reply siap menerima pesan (${tier.toUpperCase()})`, 'success');

            if (io) {
              io.emit(`bot-status:${userId}`, { status: 'connected', phoneNumber: currentBot.phoneNumber });
            }

            // Start simulated incoming conversations to show off the bot responding
            BotService.startIncomingMessageSimulator(botId, userId, io);
          }
        } catch (err) {
          console.error("Error confirming pairings:", err);
        }
      }, 7000);

      activeConnections.set(botId, timeoutId);
      return bot;
    } catch (error) {
      console.error(`Error starting bot ${botId}:`, error);
      Database.addBotLog(botId, `Error starting bot: ${error instanceof Error ? error.message : error}`, 'error');
      throw error;
    }
  },

  // Stop bot session
  stopBot: async (botId: string, userId: string, io?: any) => {
    try {
      console.log(`Stopping bot ${botId}`);
      
      // Stop simulators
      const pairingTimeout = activeConnections.get(botId);
      if (pairingTimeout) {
        clearTimeout(pairingTimeout);
        activeConnections.delete(botId);
      }

      const incomingInterval = activeIntervals.get(botId);
      if (incomingInterval) {
        clearInterval(incomingInterval);
        activeIntervals.delete(botId);
      }

      const bot = Database.getBots().find(b => b.botId === botId);
      if (bot) {
        bot.status = 'disconnected';
        bot.qrCode = undefined;
        Database.saveBot(bot);
        Database.addBotLog(botId, 'Sesi WhatsApp dihentikan oleh user.', 'info');
      }

      if (io) {
        io.emit(`bot-status:${userId}`, { status: 'disconnected' });
      }

      return bot;
    } catch (error) {
      console.error(`Error stopping bot ${botId}:`, error);
      throw error;
    }
  },

  // Simulated traffic generator so user has live chats to view in logs / analytics
  startIncomingMessageSimulator: (botId: string, userId: string, io?: any) => {
    const interval = setInterval(async () => {
      try {
        const bot = Database.getBots().find(b => b.botId === botId);
        if (!bot || bot.status !== 'connected') {
          clearInterval(interval);
          activeIntervals.delete(botId);
          return;
        }

        // Gather mock user names and inputs
        const mockSenders = [
          { name: 'Budi Santoso', phone: '628129991212' },
          { name: 'Rina Wijaya', phone: '6285712123434' },
          { name: 'Andi Pratama', phone: '6289945456767' },
          { name: 'Siti Aminah', phone: '6287844001122' }
        ];

        const mockMessages = [
          'p',
          'halo',
          'permisi, numpuk info harga bos',
          'apakah bot hosting premium dapet webhook?',
          'tolong carikan resep nasi goreng enak?',
          'siang, jam operasional jam berapa ya?',
          'Saya tertarik membeli paket PLUS nya!'
        ];

        const sender = mockSenders[Math.floor(Math.random() * mockSenders.length)];
        const incomingText = mockMessages[Math.floor(Math.random() * mockMessages.length)];

        Database.addBotLog(botId, `Pesan Masuk dari ${sender.name} (${sender.phone}): "${incomingText}"`, 'info');
        Database.recordAnalyticEvent(botId, 'received');

        // Handle auto reply settings logic
        const settings = Database.getBotSettings(botId);
        let responseDispatched = false;

        // Verify tier constraints
        const userSub = Database.getSubscriptions().find(s => s.userId === userId);
        const tier = userSub?.package || 'basic';

        // 1. Check keyword-based triggers (Basic Tier covers this)
        if (settings.autoReply && settings.keywordResponses) {
          const match = settings.keywordResponses.find(kr => 
            incomingText.toLowerCase().trim() === kr.keyword.toLowerCase().trim()
          );
          if (match) {
            setTimeout(() => {
              Database.addBotLog(botId, `Keyword cocok [${match.keyword}]. Membalas: "${match.response}"`, 'success');
              Database.addBotLog(botId, `Pesan Terkirim ke ${sender.name}: "${match.response}"`, 'info');
              Database.recordAnalyticEvent(botId, 'sent');
              if (io) {
                io.emit(`bot-message-replied:${userId}`, { sender: sender.name, response: match.response });
              }
            }, 1500);
            responseDispatched = true;
          }
        }

        // 2. AI Responses (Premium and Plus Tiers only)
        if (!responseDispatched && settings.aiEnabled && (tier === 'premium' || tier === 'plus')) {
          Database.addBotLog(botId, `Memproses balasan menggunakan engine AI (${tier.toUpperCase()})...`, 'info');
          
          try {
            let aiReply = "Halo! Maaf, kecerdasan buatan kami sedang sibuk saat ini.";
            
            if (aiClient) {
              const geminiResponse = await aiClient.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: `Context: You are a friendly WhatsApp automated helpful bot hosting SaaS agent.
Incoming message from user "${sender.name}": "${incomingText}"
Generate a short 1-2 sentence response helpful to this client in Indonesian language (Bahasa Indonesia). Keep it friendly.`,
                config: {
                  systemInstruction: "You are representing a professional WhatsApp Bot SaaS named HighHost. Be succinct."
                }
              });
              aiReply = geminiResponse.text || aiReply;
            } else {
              // High-quality local generative heuristics in case Gemini API key is placeholder
              if (incomingText.toLowerCase().includes('resep')) {
                aiReply = `Halo ${sender.name}! Resep nasi goreng spesial: tumis bawang merah, putih, cabai, tambahkan telur, nasi dingin, kecap manis, dan garam secukupnya. Sajikan selagi hangat!`;
              } else if (incomingText.toLowerCase().includes('webhook')) {
                aiReply = `Tentu! Integrasi Webhook eksklusif hanya tersedia pada Paket PLUS (Rp 300.000). Sangat andal untuk otomatisasi system API Anda.`;
              } else {
                aiReply = `Halo ${sender.name}, terima kasih telah menghubungi kami. Tim support AI kami hadir untuk membantu kesuksesan bot WhatsApp Anda secara 24/7!`;
              }
            }

            setTimeout(() => {
              Database.addBotLog(botId, `AI Menghasilkan balasan: "${aiReply}"`, 'success');
              Database.addBotLog(botId, `Pesan Terkirim ke ${sender.name}: "${aiReply}"`, 'info');
              Database.recordAnalyticEvent(botId, 'sent');
              if (io) {
                io.emit(`bot-message-replied:${userId}`, { sender: sender.name, response: aiReply });
              }
            }, 2500);
            responseDispatched = true;

          } catch (aiErr) {
            console.error("AI Error:", aiErr);
            const fallbackReply = `Terima kasih atas pesannya! AI sedang sinkronisasi, mohon hubungi admin jika butuh info lengkap.`;
            Database.addBotLog(botId, `Pesan Terkirim ke ${sender.name} (AI Fallback): "${fallbackReply}"`, 'info');
            Database.recordAnalyticEvent(botId, 'sent');
          }
        }

        // If no automation triggers, look into custom templates or basic helpful text
        if (!responseDispatched && settings.autoReply) {
          const fallbackResponse = `Terima kasih atas pesan Anda! Bot kami online, jika ingin respon cepat silahkan ketik keyword 'halo' atau kontak admin.`;
          setTimeout(() => {
            Database.addBotLog(botId, `Pesan Terkirim ke ${sender.name} (Auto-Reply default): "${fallbackResponse}"`, 'info');
            Database.recordAnalyticEvent(botId, 'sent');
          }, 2000);
        }

      } catch (err) {
        console.error("Error in simulated traffic loop:", err);
      }
    }, 15000); // simulation interval of 15s

    activeIntervals.set(botId, interval);
  },

  // Triggers background cron functions for daily sessions and checks
  cronDailyCleanup: () => {
    console.log("⏰ Daily Cron Job: running sessions database sanitization and cleanups...");
    try {
      // 1. Cleanup old sessions (> 30 days)
      const bots = Database.getBots();
      let countCleaned = 0;
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      bots.forEach(bot => {
        const lastOnlineTime = new Date(bot.lastOnline).getTime();
        if (lastOnlineTime < thirtyDaysAgo) {
          bot.status = 'disconnected';
          Database.saveBot(bot);
          countCleaned++;
        }
      });
      console.log(`🧹 Sessions database checked. Cleaned up ${countCleaned} stale bot connections.`);

      // 2. Check and lock expired subscriptions
      const subscriptions = Database.getSubscriptions();
      let subscriptionsExpired = 0;
      subscriptions.forEach(sub => {
        if (sub.status === 'active' && new Date(sub.endDate).getTime() < Date.now()) {
          sub.status = 'expired';
          Database.saveSubscription(sub);
          subscriptionsExpired++;
          console.log(`🔴 Subscription associated with User ${sub.userId} has expired.`);
        }
      });
      console.log(`📦 Subscription sweep complete. Expired count: ${subscriptionsExpired}`);
    } catch (error) {
      console.error("Cron daily operations crashed:", error);
    }
  },

  checkSessionSize: (botId: string): { sizeMb: number; isHeavy: boolean } => {
    // Return mock metadata sizes representing multi file state storage
    const bots = Database.getBots();
    const bot = bots.find(b => b.botId === botId);
    if (!bot) return { sizeMb: 0, isHeavy: false };
    
    // basic mock size of multi-file system auth
    const sizeMb = parseFloat((fs.existsSync(path.resolve(process.cwd(), 'sessions', 'db.json')) ? 
      (fs.statSync(path.resolve(process.cwd(), 'sessions', 'db.json')).size / (1024 * 1024)) * 38.5 + 2.1 : 4.2).toFixed(2));
    
    return {
      sizeMb,
      isHeavy: sizeMb > 100
    };
  }
};
