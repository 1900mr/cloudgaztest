import { Telegraf } from 'telegraf';  // استخدام مكتبة Telegraf بدلاً من node-telegram-bot-api
import ExcelJS from 'exceljs';  // استيراد مكتبة ExcelJS
import fetch from 'node-fetch';  // لتحميل الملفات من Dropbox
import dotenv from 'dotenv';  // لتحميل المتغيرات البيئية
import express from 'express';  // لتشغيل السيرفر باستخدام Express

dotenv.config();  // تحميل المتغيرات البيئية من ملف .env

// إعداد سيرفر Express (لتشغيل التطبيق على Render أو في بيئة محلية)
const app = express();
const port = process.env.PORT || 4000;  // المنفذ الافتراضي
app.get('/', (req, res) => {
    res.send('The server is running successfully.');
});

// استبدال بـ توكن البوت الخاص بك
const token = process.env.TELEGRAM_BOT_TOKEN || '7560955160:AAHakMcFzXTDTd6wJpdqw2WNFdSW46w0524';  // استبدل هذا بـ توكن البوت الخاص بك

// إنشاء البوت باستخدام Telegraf
const bot = new Telegraf(token);

// تخزين البيانات من Excel
let data = [];

// حفظ معرفات المستخدمين الذين يتفاعلون مع البوت
let userIds = new Set(); // Set للحفاظ على المعرفات الفريدة للمستخدمين

// روابط ملفات Excel في Dropbox
const DROPBOX_FILE_URLS = [
    'https://www.dropbox.com/scl/fi/cdoawhmor12kz9vash45z/upload.xlsx?rlkey=b9rcfe3ell1e5tpgimc71sa5m&st=x5mwvyzm&dl=1',
    'https://www.dropbox.com/scl/fi/5eu49co5t4adlwcuf31cb/kan.xlsx?rlkey=uxcigf215rg0xojcpq73olyf7&st=l2ak33gq&dl=1',
    'https://www.dropbox.com/scl/fi/wzr3ixwn9cvxwnh3k2x85/rfh.xlsx?rlkey=25ty5w4p9iw01pr37lo3l028f&st=39ikyxsg&dl=1',
];

// دالة لتحميل البيانات من عدة ملفات Excel من Dropbox
async function fetchExcelData() {
    try {
        for (const fileUrl of DROPBOX_FILE_URLS) {
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error('⚠️ فشل تحميل الملف من Dropbox');
            }
            const buffer = await response.buffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0];
            worksheet.eachRow((row) => {
                const idNumber = row.getCell(1).value?.toString().trim();
                const name = row.getCell(2).value?.toString().trim();
                const province = row.getCell(3).value?.toString().trim();
                const district = row.getCell(4).value?.toString().trim();
                const area = row.getCell(5).value?.toString().trim();
                const distributorId = row.getCell(6).value?.toString().trim();
                const distributorName = row.getCell(7).value?.toString().trim();
                const distributorPhone = row.getCell(8).value?.toString().trim();
                const status = row.getCell(9).value?.toString().trim();

                if (idNumber && name) {
                    data.push({
                        idNumber,
                        name,
                        province: province || "غير متوفر",
                        district: district || "غير متوفر",
                        area: area || "غير متوفر",
                        distributorId: distributorId || "غير متوفر",
                        distributorName: distributorName || "غير متوفر",
                        distributorPhone: distributorPhone || "غير متوفر",
                        status: status || "غير متوفر",
                    });
                }
            });
        }

        console.log('📁 تم تحميل البيانات من Dropbox بنجاح.');
    } catch (error) {
        console.error('❌ حدث خطأ أثناء تحميل أو معالجة الملفات من Dropbox:', error.message);
    }
}

// تحميل البيانات من Dropbox عند بدء التشغيل
fetchExcelData();

// قائمة معرفات المسؤولين
const adminIds = process.env.ADMIN_IDS?.split(',') || ['7719756994'];  // إضافة المعرفات الفعلية للمسؤولين

// الرد على أوامر البوت
bot.start((ctx) => {
    const chatId = ctx.chat.id;
    userIds.add(chatId);  // حفظ معرف المستخدم

    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "🔍 البحث برقم الهوية أو الاسم" }],
                [{ text: "📞 معلومات الاتصال" }, { text: "📖 معلومات عن البوت" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
        },
    };

    if (adminIds.includes(chatId.toString())) {
        options.reply_markup.keyboard.push([{ text: "📢 إرسال رسالة للجميع" }]);
    }

    ctx.reply("مرحبًا بك! اختر أحد الخيارات التالية:", options);
});

// التعامل مع الرسائل من المستخدمين
bot.on('text', (ctx) => {
    const chatId = ctx.chat.id;
    const input = ctx.message.text.trim();  // مدخل المستخدم

    if (input === '/start' || input.startsWith('/')) return;  // تجاهل الأوامر الأخرى

    if (input === "🔍 البحث برقم الهوية أو الاسم") {
        ctx.reply("📝 أدخل رقم الهوية أو الاسم للبحث:");
    } else if (input === "📞 معلومات الاتصال") {
        const contactMessage = `
📞 **معلومات الاتصال:**
للمزيد من الدعم أو الاستفسار، يمكنك التواصل معنا عبر:

- 📧 البريد الإلكتروني: [mrahel1991@gmail.com]
- 📱 جوال : [0598550144]
- 💬 تلغرام : [https://t.me/AhmedGarqoud]
        `;
        ctx.reply(contactMessage, { parse_mode: 'Markdown' });
    } else if (input === "📖 معلومات عن البوت") {
        const aboutMessage = `
🤖 **معلومات عن البوت:**
هذا البوت يتيح لك البحث عن المواطنين باستخدام رقم الهوية أو الاسم.

- يتم عرض تفاصيل المواطن بما في ذلك بيانات الموزع وحالة الطلب.
- هدفنا هو تسهيل الوصول إلى البيانات.

🔧 **التطوير والصيانة**: تم تطوير هذا البوت بواسطة [احمد محمد ابو غرقود].
        `;
        ctx.reply(aboutMessage, { parse_mode: 'Markdown' });
    } else {
        const user = data.find((entry) => entry.idNumber === input || entry.name === input);

        if (user) {
            const response = `
🔍 **تفاصيل الطلب:**

👤 **الاسم**: ${user.name}
🏘️ **الحي / المنطقة**: ${user.area}
🏙️ **المدينة**: ${user.district}
📍 **المحافظة**: ${user.province}

📛 **اسم الموزع**: ${user.distributorName}
📞 **رقم جوال الموزع**: ${user.distributorPhone}
🆔 **هوية الموزع**: ${user.distributorId}

📜 **الحالة**: ${user.status}
            `;
            ctx.reply(response, { parse_mode: 'Markdown' });
        } else {
            ctx.reply("⚠️ لم أتمكن من العثور على بيانات للمدخل المقدم.");
        }
    }
});

// إرسال رسالة جماعية
async function sendBroadcastMessage(message, adminChatId) {
    userIds.forEach(userId => {
        bot.telegram.sendMessage(userId, message);
    });
    bot.telegram.sendMessage(adminChatId, "✅ تم إرسال الرسالة للجميع بنجاح.");
}

// إرسال تنبيه للمسؤولين
function sendMessageToAdmins(message) {
    adminIds.forEach(adminId => {
        bot.telegram.sendMessage(adminId, message);
    });
}

// تشغيل السيرفر
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
