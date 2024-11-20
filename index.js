const fetch = require('node-fetch'); // لتحميل الملفات من Dropbox
const XLSX = require('xlsx'); // لتحليل ملفات Excel
const { Telegraf } = require('telegraf'); // مكتبة بوت تلجرام

// توكن البوت ورابط ملف Excel على Dropbox
const TELEGRAM_BOT_TOKEN = 'your_telegram_bot_token'; // استبدلها بتوكن البوت الخاص بك
const DROPBOX_FILE_URL = 'https://www.dropbox.com/scl/fi/cdoawhmor12kz9vash45z/upload.xlsx?rlkey=b9rcfe3ell1e5tpgimc71sa5m&st=x5mwvyzm&dl=1'; // استبدلها برابط ملف Excel الخاص بك

// إنشاء البوت باستخدام توكن تلجرام
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// دالة لتحميل البيانات من Dropbox وقراءة الملف
async function fetchExcelData() {
  const response = await fetch(DROPBOX_FILE_URL); // تحميل الملف من Dropbox
  const buffer = await response.buffer(); // تحويل البيانات إلى بايتات
  const workbook = XLSX.read(buffer, { type: 'buffer' }); // قراءة الملف باستخدام xlsx
  const sheet = workbook.Sheets[workbook.SheetNames[0]]; // الحصول على الورقة الأولى
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // تحويل الورقة إلى مصفوفة
  return data;
}

// دالة للبحث عن الشخص في البيانات بناءً على رقم الهوية أو الاسم
async function searchByIdOrName(query) {
  const data = await fetchExcelData(); // تحميل البيانات
  const result = data.find(row =>
    row[0].toString() === query || row[1].toString().toLowerCase() === query.toLowerCase()
  ); // البحث عن تطابق رقم الهوية أو الاسم

  if (result) {
    return `معلومات الشخص:\n${result.join(' | ')}`; // تنسيق النتائج
  } else {
    return 'لم يتم العثور على الشخص في البيانات.';
  }
}

// التعامل مع الرسائل الواردة من المستخدمين
bot.on('text', async (ctx) => {
  const query = ctx.message.text.trim(); // استخراج النص من الرسالة
  if (query) {
    const result = await searchByIdOrName(query); // البحث عن الشخص
    ctx.reply(result); // إرسال النتيجة للمستخدم
  } else {
    ctx.reply('يرجى إدخال رقم الهوية أو اسم الشخص.'); // في حالة عدم وجود نص في الرسالة
  }
});

// بدء تشغيل البوت
bot.launch().then(() => {
  console.log('بوت تلجرام يعمل الآن!');
});
