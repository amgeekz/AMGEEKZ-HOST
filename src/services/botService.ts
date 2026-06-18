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
  startBot: async (botId: string, userId: string, io?: any, method?: 'qr' | 'pairing', phoneNumber?: string) => {
    try {
      console.log(`Starting WhatsApp Bot Service for User ${userId}, Bot ${botId} via ${method || 'qr'}`);
      
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

      // Transition to pairing status & generate pairing info or QR code
      const connectMethod = method || 'qr';
      bot.status = 'pairing';

      if (connectMethod === 'pairing') {
        const formattedNum = phoneNumber || '6281234567890';
        const chunk1 = Math.random().toString(36).substring(3, 7).toUpperCase();
        const chunk2 = Math.random().toString(36).substring(3, 7).toUpperCase();
        const generatedCode = `${chunk1}-${chunk2}`;
        bot.pairingCode = generatedCode;
        bot.qrCode = undefined;
        Database.saveBot(bot);

        Database.addBotLog(botId, `Mempersiapkan autentikasi Baileys via Kode Pairing...`, 'info');
        Database.addBotLog(botId, `Kode Pairing sukses dihasilkan untuk nomor ${formattedNum}: ${generatedCode}`, 'warning');
        Database.addBotLog(botId, `Silakan buka WhatsApp di HP Anda -> Perangkat Tertaut -> Tautkan dengan nomor telepon, kemudian masukkan kode di atas.`, 'info');
      } else {
        bot.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=WAPairingCode-${botId}-${Date.now()}`;
        bot.pairingCode = undefined;
        Database.saveBot(bot);

        Database.addBotLog(botId, 'Mempersiapkan autentikasi multi-device (Baileys)...', 'info');
        Database.addBotLog(botId, 'QR Code sukses dihasilkan. Silahkan scan dari perangkat WhatsApp Anda.', 'warning');
      }

      // Dispatch state update to frontend via socket if present
      if (io) {
        io.emit(`bot-status:${userId}`, { 
          status: bot.status, 
          qrCode: bot.qrCode, 
          pairingCode: bot.pairingCode, 
          phoneNumber: phoneNumber 
        });
      }

      // Auto-connect simulator after a realistic duration (e.g., 7 seconds)
      const timeoutId = setTimeout(() => {
        try {
          const currentBot = Database.getBots().find(b => b.botId === botId);
          if (currentBot && currentBot.status === 'pairing') {
            currentBot.status = 'connected';
            currentBot.phoneNumber = phoneNumber || (userSub?.package === 'plus' ? '6281987654321' : '6281234567890');
            currentBot.qrCode = undefined;
            currentBot.pairingCode = undefined;
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
        bot.pairingCode = undefined;
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

        // Check Daily Hit limit constraint
        const dateStr = new Date().toISOString().split('T')[0];
        const analyticsList = Database.getAnalytics(botId);
        const todayRecord = analyticsList.find(a => a.date === dateStr);
        const outgoingToday = todayRecord ? todayRecord.messagesSent : 0;
        
        let hitLimit = 100; // default BASIC
        if (tier === 'premium') hitLimit = 1000;
        if (tier === 'plus') hitLimit = 10000;

        if (outgoingToday >= hitLimit) {
          const warnMsg = `⚠️ Batas Hit Harian Terlampaui untuk Paket ${tier.toUpperCase()} (${outgoingToday}/${hitLimit}). Mengabaikan respon chat dari ${sender.name}.`;
          Database.addBotLog(botId, warnMsg, 'warning');
          return;
        }

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
            let aiReply = "Halo Kak! Maaf, kecerdasan buatan kami sedang sibuk saat ini.";

            // Log attempt to retrieve & sync catalog
            let syncedProducts: any[] = [];
            if (settings.productSyncUrl) {
              try {
                Database.addBotLog(botId, `Menghubungi URL Sinkronisasi Produk: ${settings.productSyncUrl}`, 'info');
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout limit
                const response = await fetch(settings.productSyncUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                  const data = await response.json();
                  if (Array.isArray(data)) {
                    syncedProducts = data.map((item: any) => {
                      const s = item.data || item;
                      return {
                        nama_layanan: s.nama_layanan || s.name || "Produk",
                        brand: s.brand || process.env.VITE_BRAND_NAME || "GeekzCS",
                        status: s.status || "Tersedia",
                        price: s.price || s.harga || "Hubungi Admin"
                      };
                    });
                    Database.addBotLog(botId, `Sinkronisasi Katalog Berhasil! Memuat ${syncedProducts.length} layanan live.`, 'success');
                  }
                }
              } catch (fetchErr) {
                // Silently bypass to custom statically saved catalog
                Database.addBotLog(botId, `Sinkronisasi URL offline, menggunakan data produk kustom tersimpan.`, 'warning');
              }
            }

            // Fallback to static JSON settings if URL fetch did not produce results
            if (syncedProducts.length === 0 && settings.customProductData) {
              try {
                syncedProducts = JSON.parse(settings.customProductData);
              } catch (parseEx) {
                console.error("Failed to parse custom static products", parseEx);
              }
            }

            // Final fallback default services catalog
            if (syncedProducts.length === 0) {
              const bName = process.env.VITE_BRAND_NAME || 'GeekzCS';
              syncedProducts = [
                { nama_layanan: `${bName} VPS Premium`, brand: bName, status: "Tersedia", price: "Rp 75,000" },
                { nama_layanan: "Bot WhatsApp Gateway Basic", brand: bName, status: "Tersedia", price: "Rp 50,000" }
              ];
            }

            const formattedProducts = syncedProducts.map((p: any) => 
              `- *${p.nama_layanan || p.name}* (${p.brand || 'Brand'}): Status: ${p.status || 'Tersedia'} - Harga: ${p.price || p.harga || 'Hubungi Admin'}`
            ).join('\n');

            let activeAgentName = settings.agentName || process.env.VITE_BRAND_NAME || 'GeekzCS';
            let activeAgentPrompt = settings.systemPrompt || 'Kamu adalah customer service untuk website kami.';
            let modeLabel = 'SINGLE CS';
            const adminContacts = settings.adminContacts || 'Inod: +62 856-4945-5626\nMichael: +62 812-4809-5727';

            if (settings.aiMode === 'multi') {
              const textLower = incomingText.toLowerCase();
              if (textLower.includes('vps') || textLower.includes('connect') || textLower.includes('error') || textLower.includes('setup') || textLower.includes('config') || textLower.includes('webhook') || textLower.includes('mati') || textLower.includes('down') || textLower.includes('sand') || textLower.includes('teknis')) {
                activeAgentName = settings.techAgentName || 'GeekzTech';
                activeAgentPrompt = settings.techAgentPrompt || '';
                modeLabel = 'MULTI-AGENT 🔧 TECH SUPPORT';
                Database.addBotLog(botId, `🤖 [Multi-Agent Router] Deteksi topik: [TEKNIS]. Mengarahkan chat ke Agen Spesialis: [${activeAgentName}]`, 'info');
              } else if (textLower.includes('bayar') || textLower.includes('harga') || textLower.includes('invoice') || textLower.includes('beli') || textLower.includes('paket') || textLower.includes('premium') || textLower.includes('plus') || textLower.includes('basic') || textLower.includes('refund') || textLower.includes('kembal') || textLower.includes('uang') || textLower.includes('qris') || textLower.includes('rekening') || textLower.includes('tarif') || textLower.includes('promo') || textLower.includes('biaya')) {
                activeAgentName = settings.billingAgentName || 'GeekzBilling';
                activeAgentPrompt = settings.billingAgentPrompt || '';
                modeLabel = 'MULTI-AGENT 💳 BILLING & SALES';
                Database.addBotLog(botId, `🤖 [Multi-Agent Router] Deteksi topik: [BILLING & SALES]. Mengarahkan chat ke Agen Spesialis: [${activeAgentName}]`, 'info');
              } else {
                activeAgentName = settings.salesAgentName || 'GeekzSales';
                activeAgentPrompt = settings.salesAgentPrompt || '';
                modeLabel = 'MULTI-AGENT 📣 PROMO CS';
                Database.addBotLog(botId, `🤖 [Multi-Agent Router] Deteksi topik: [UMUM/PROMO]. Mengarahkan chat ke Agen Spesialis: [${activeAgentName}]`, 'info');
              }
            }

            // Compile settings placeholders
            const compiledPrompt = activeAgentPrompt
              .replace(/{AGENT_NAME}/g, activeAgentName)
              .replace(/{ADMIN_CONTACTS}/g, adminContacts);

            const promptInput = `
## TENTANG AGEN/PROFIL CS
${compiledPrompt}

## PRODUK & LAYANAN LIVE YANG TERSEDIA
${formattedProducts}

## KONTAK ADMIN WHATSAPP TAMBAHAN
${adminContacts}

## INFORMASI PENGIRIM
Nama Pengirim: ${sender.name}
Nomor WhatsApp Pengirim: ${sender.phone}

## PERTANYAAN MASUK DARI KONSUMEN
"${incomingText}"

TUGAS:
Hasilkan balasan responsif, ramah, dan solutif mengikuti petunjuk tentang agen di atas. Panggil dia dengan "Kak" (bukan "Anda"). Berbahasa Indonesia yang akrab dan santun. Berikan jawaban yang padat dan jelas (maksimal 2 atau 3 kalimat).`;

            if (aiClient) {
              const geminiResponse = await aiClient.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: promptInput,
                config: {
                  systemInstruction: `You are a helpful Automated Customer Service representative named ${activeAgentName} (Role: ${modeLabel}). Be polite and speak in conversational Indonesian.`
                }
              });
              aiReply = geminiResponse.text || aiReply;
            } else {
              // High-quality local heuristics if Gemini key isn't loaded yet
              if (incomingText.toLowerCase().includes('resep')) {
                aiReply = `Halo Kak ${sender.name}! Resep nasi goreng praktis ala ${activeAgentName}: tumis cincang bawang, masukkan telur orak-arik, disusul nasi dingin & kecap. Silahkan dicoba ya Kak!`;
              } else if (incomingText.toLowerCase().includes('webhook') || incomingText.toLowerCase().includes('premium')) {
                aiReply = `Tentu Kak ${sender.name}! Paket PREMIUM atau PLUS sudah terintegrasi fitur Auto-Reply AI ${activeAgentName} & Webhook handal untuk otomatisasi maksimal.`;
              } else {
                aiReply = `Halo Kak ${sender.name}! Saya ${activeAgentName} (${modeLabel}), asisten CS siap membantu. Ada produk atau kendala apa yang bisa saya layani hari ini?`;
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

          } catch (aiErr: any) {
            console.error("AI Error:", aiErr);
            const fallbackReply = `Terima kasih atas pesannya Kak! AI kami sedang melakukan pemeliharaan rutin, silakan ketik keyword atau hubungi Admin `;
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
