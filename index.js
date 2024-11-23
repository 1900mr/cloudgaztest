const TelegramBot = require('node-telegram-bot-api');
const ExcelJS = require('exceljs'); // استيراد مكتبة exceljs
const express = require('express'); // إضافة Express لتشغيل السيرفر
const axios = require('axios'); // لإجراء استدعاء API
const fs = require('fs'); // للتعامل مع الملفات بشكل مؤقت

// إعداد سيرفر Express (لتشغيل التطبيق على Render أو في بيئة محلية)
const app = express();
const port = 4000; // المنفذ الافتراضي
app.get('/', (req, res) => {
    res.send('The server is running successfully.');
});

// استبدل بالتوكن الخاص بك
const token = '7859625373:AAEFlMbm3Sfagj4S9rx5ixbfqItE1jNpDos';

// API Keys مباشرة في الكود
const WEATHER_API_KEY = '2fb04804fafc0c123fe58778ef5d878b'; // ضع مفتاح API الخاص بالطقس
const CURRENCY_API_KEY = '5884bd60fbdb6ea892ed9b76'; // ضع مفتاح API الخاص بالعملات

// إنشاء البوت
const bot = new TelegramBot(token, { polling: true });

// تخزين البيانات من Excel
let data = [];

// حفظ معرفات المستخدمين الذين يتفاعلون مع البوت
let userIds = new Set(); // Set للحفاظ على المعرفات الفريدة للمستخدمين

// دالة لتحميل البيانات من عدة ملفات Excel باستخدام روابط Dropbox
async function loadDataFromExcelFiles(fileUrls) {
    data = []; // إعادة تعيين المصفوفة لتجنب التكرار
    try {
        for (const fileUrl of fileUrls) {
            // تحميل الملف من Dropbox
            const response = await axios({
                method: 'get',
                url: fileUrl,
                responseType: 'arraybuffer' // لتحميل الملف كـ array buffer
            });

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(response.data); // تحميل البيانات من الملف

            const worksheet = workbook.worksheets[0]; // أول ورقة عمل

            // الحصول على تاريخ آخر تعديل للملف (يمكنك استخدام timestamp من API أو تركه بدون تعديل)
            const lastModifiedDate = new Date().toISOString().split('T')[0]; // استخدام التاريخ الحالي لتوضيح آخر تعديل

            worksheet.eachRow((row, rowNumber) => {
                const idNumber = row.getCell(1).value?.toString().trim(); // رقم الهوية
                const name = row.getCell(2).value?.toString().trim(); // اسم المواطن
                const province = row.getCell(3).value?.toString().trim(); // المحافظة
                const district = row.getCell(4).value?.toString().trim(); // المدينة
                const area = row.getCell(5).value?.toString().trim(); // الحي/المنطقة
                const distributorId = row.getCell(6).value?.toString().trim(); // هوية الموزع
                const distributorName = row.getCell(7).value?.toString().trim(); // اسم الموزع
                const distributorPhone = row.getCell(8).value?.toString().trim(); // رقم جوال الموزع
                const status = row.getCell(9).value?.toString().trim(); // الحالة

                // إضافة البيانات مع تاريخ آخر تعديل كـ "تاريخ تسليم الجرة"
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
                        deliveryDate: lastModifiedDate, // تاريخ تسليم الجرة بناءً على تاريخ تعديل الملف
                    });
                }
            });
        }

        console.log('📁 تم تحميل البيانات من جميع الملفات بنجاح.');

        // إرسال تنبيه للمسؤولين
        sendMessageToAdmins("📢 تم تحديث البيانات من جميع الملفات بنجاح! يمكنك الآن البحث في البيانات المحدثة.");
    } catch (error) {
        console.error('❌ حدث خطأ أثناء قراءة ملفات Excel:', error.message);
    }
}

// استبدل بروابط Dropbox الخاصة بك
const dropboxFiles = [
    'https://www.dropbox.com/scl/fi/cdoawhmor12kz9vash45z/upload.xlsx?rlkey=b9rcfe3ell1e5tpgimc71sa5m&st=x5mwvyzm&dl=1',
    'https://www.dropbox.com/scl/fi/5eu49co5t4adlwcuf31cb/kan.xlsx?rlkey=uxcigf215rg0xojcpq73olyf7&st=l2ak33gq&dl=1',
    'https://www.dropbox.com/scl/fi/wzr3ixwn9cvxwnh3k2x85/rfh.xlsx?rlkey=25ty5w4p9iw01pr37lo3l028f&st=39ikyxsg&dl=1',
];

// استدعاء الدالة مع روابط Dropbox
loadDataFromExcelFiles(dropboxFiles);

// قائمة معرفات المسؤولين
const adminIds = process.env.ADMIN_IDS?.split(',') || ['7719756994']; // إضافة المعرفات الفعلية للمسؤولين

// الرد على أوامر البوت
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userIds.add(chatId); // حفظ معرف المستخدم

    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "🔍 البحث برقم الهوية أو الاسم" }],
                
                [{ text: "🌤️ أحوال الطقس" }, { text: "💰 أسعار العملات" }],

                [{ text: "📞 معلومات الاتصال" }, { text: "📖 معلومات عن البوت" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
        },
    };

    if (adminIds.includes(chatId.toString())) {
        options.reply_markup.keyboard.push([{ text: "📢 إرسال رسالة للجميع" }]);
    }

    bot.sendMessage(chatId, "مرحبًا بك! اختر أحد الخيارات التالية:", options);
});

// دالة للحصول على حالة الطقس في مدينة غزة فقط
async function getWeather() {
    try {
        const city = "Gaza"; // اسم المدينة ثابت هنا كـ "غزة"
        const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=ar`);
        const data = response.data;
        return `
🌤️ **حالة الطقس في ${data.name}**:
- درجة الحرارة: ${data.main.temp}°C
- حالة السماء: ${data.weather[0].description}
- الرطوبة: ${data.main.humidity}%
- الرياح: ${data.wind.speed} متر/ثانية
        `;
    } catch (error) {
        return "❌ لم أتمكن من الحصول على بيانات الطقس في مدينة غزة. يرجى المحاولة لاحقًا.";
    }
}

// دالة للحصول على أسعار العملات
async function getCurrencyRates() {
    try {
        const response = await axios.get(`https://v6.exchangerate-api.com/v6/${CURRENCY_API_KEY}/latest/USD`);
        const data = response.data;

        // احصل على أسعار العملات المطلوبة
        const usdToIls = data.conversion_rates.ILS; // 1 USD إلى شيكل إسرائيلي
        const ilsToJod = data.conversion_rates.JOD; // 1 ILS إلى دينار أردني
        const ilsToEgp = data.conversion_rates.EGP; // 1 ILS إلى جنيه مصري

        return `
💰 **أسعار العملات الحالية**:
- 1 دولار أمريكي (USD) = ${usdToIls} شيكل إسرائيلي (ILS)
- 1 شيكل إسرائيلي (ILS) = ${ilsToJod} دينار أردني (JOD)
- 1 شيكل إسرائيلي (ILS) = ${ilsToEgp} جنيه مصري (EGP)
        `;
    } catch (error) {
        return "❌ لم أتمكن من الحصول على أسعار العملات. يرجى المحاولة لاحقًا.";
    }
}

// التعامل مع الضغط على الأزرار والبحث
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const input = msg.text.trim(); // مدخل المستخدم

    if (input === '/start' || input.startsWith('/')) return; // تجاهل الأوامر الأخرى

    if (input === "🔍 البحث برقم الهوية أو الاسم") {
        bot.sendMessage(chatId, "📝 أدخل رقم الهوية أو الاسم للبحث:");
    } else if (input === "📞 معلومات الاتصال") {
        const contactMessage = `
📞 **معلومات الاتصال:**
للمزيد من الدعم أو الاستفسار، يمكنك التواصل معنا عبر:

- 📧 البريد الإلكتروني: [mrahel1991@gmail.com]
- 📱 جوال : [0598550144]
- 💬 تلغرام : [https://t.me/AhmedGarqoud]
        `;
        bot.sendMessage(chatId, contactMessage, { parse_mode: 'Markdown' });
    } else if (input === "📖 معلومات عن البوت") {
        const aboutMessage = `
🤖 **معلومات عن البوت:**
هذا البوت يتيح لك البحث عن المواطنين باستخدام رقم الهوية أو الاسم.

- يتم عرض تفاصيل المواطن بما في ذلك بيانات الموزع وحالة الطلب.
- هدفنا هو تسهيل الوصول إلى المعلومات بسرعة وفعالية.
        `;
        bot.sendMessage(chatId, aboutMessage);
    } else if (input === "🌤️ أحوال الطقس") {
        const weatherInfo = await getWeather();
        bot.sendMessage(chatId, weatherInfo);
    } else if (input === "💰 أسعار العملات") {
        const currencyInfo = await getCurrencyRates();
        bot.sendMessage(chatId, currencyInfo);
    } else if (input === "📢 إرسال رسالة للجميع") {
        if (adminIds.includes(chatId.toString())) {
            bot.sendMessage(chatId, "🔠 أرسل رسالتك التي تريد إرسالها لجميع المستخدمين:");
        }
    } else if (input === "📖 عرض البيانات المحدثة") {
        if (data.length > 0) {
            bot.sendMessage(chatId, "📊 البيانات المحدثة موجودة الآن.");
        } else {
            bot.sendMessage(chatId, "❌ لا توجد بيانات محدثة حاليًا.");
        }
    }
});

// ارسال رسالة لجميع المستخدمين
async function sendMessageToAdmins(message) {
    for (const adminId of adminIds) {
        await bot.sendMessage(adminId, message);
    }
}

// بدء السيرفر
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
