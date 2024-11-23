import fetch from 'node-fetch'; // لتحميل الملفات من Dropbox
import XLSX from 'xlsx'; // لتحليل ملفات Excel
import { Telegraf } from 'telegraf'; // مكتبة بوت تلجرام
import express from 'express'; // مكتبة express لإنشاء خادم HTTP

// توكن البوت ورابط ملف Excel على Dropbox
const TELEGRAM_BOT_TOKEN = '7560955160:AAHakMcFzXTDTd6wJpdqw2WNFdSW46w0524';
const DROPBOX_FILE_URLS = [
  'https://www.dropbox.com/scl/fi/cdoawhmor12kz9vash45z/upload.xlsx?rlkey=b9rcfe3ell1e5tpgimc71sa5m&st=x5mwvyzm&dl=1',
  'https://www.dropbox.com/scl/fi/5eu49co5t4adlwcuf31cb/kan.xlsx?rlkey=uxcigf215rg0xojcpq73olyf7&st=l2ak33gq&dl=1',
  'https://www.dropbox.com/scl/fi/wzr3ixwn9cvxwnh3k2x85/rfh.xlsx?rlkey=25ty5w4p9iw01pr37lo3l028f&st=39ikyxsg&dl=1'
];

// إنشاء البوت باستخدام توكن تلجرام
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// إنشاء خادم express
const app = express();
const port = process.env.PORT || 3000; // استخدام المنفذ المحدد في Render أو 3000 إذا لم يكن محددًا

// دالة لتحميل البيانات من Dropbox وقراءة الملف
async function fetchExcelData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('⚠️ فشل تحميل الملف من Dropbox');
    }
    const buffer = await response.buffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 });
  } catch (error) {
    console.error('❌ Error fetching or processing Excel file:', error);
    throw new Error('❌ تعذر تحميل ملف البيانات. يرجى المحاولة لاحقًا.');
  }
}

// دالة للبحث وتنسيق النتيجة ديناميكيًا
async function searchByIdOrName(query) {
  try {
    // تحميل البيانات من رابط Dropbox واحد (يمكنك التبديل بينهم)
    const data = await fetchExcelData(DROPBOX_FILE_URLS[0]);
    const headers = data[0]; // الصف الأول يعتبر عناوين الأعمدة
    const rows = data.slice(1); // باقي الصفوف هي البيانات

    // البحث عن الصف المطابق
    const result = rows.find(row =>
      row[0]?.toString() === query || row[1]?.toString().toLowerCase() === query.toLowerCase()
    );

    if (result) {
      // تنسيق النتيجة ديناميكيًا
      let formattedResult = `📋 *معلومات الشخص:*\n-----------------------\n`;
      headers.forEach((header, index) => {
        formattedResult += `*${header || `عمود ${index + 1}`}*: ${result[index] || 'غير متوفر'}\n`;
      });
      formattedResult += `-----------------------`;
      return formattedResult;
    } else {
      return '❌ لم يتم العثور على الشخص في البيانات.';
    }
  } catch (error) {
    return `⚠️ ${error.message}`; // رسالة خطأ للمستخدم
  }
}

// التعامل مع الرسائل الواردة من المستخدمين
bot.start((ctx) => {
  ctx.reply('👋 *مرحبًا!*\n\n📄 أرسل رقم الهوية أو اسم الشخص للحصول على المعلومات.', { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
  const query = ctx.message.text.trim(); // استخراج النص من الرسالة
  if (query) {
    const result = await searchByIdOrName(query); // البحث عن الشخص
    ctx.reply(result, { parse_mode: 'Markdown' }); // إرسال النتيجة للمستخدم مع تنسيق Markdown
  } else {
    ctx.reply('❓ يرجى إدخال رقم الهوية أو اسم الشخص.');
  }
});

// ربط البوت بـ Express وجعل البوت يعمل مع منفذ
app.get('/', (req, res) => {
  res.send('✅ البوت يعمل في الخلفية.');
});

// بدء تشغيل الخادم على المنفذ المحدد
app.listen(port, () => {
  console.log(`🚀 خادم Express يعمل على المنفذ ${port}`);
});

// بدء تشغيل البوت
bot.launch().then(() => {
  console.log('🤖 بوت تلجرام يعمل الآن!');
}).catch((error) => {
  console.error('❌ Failed to launch the bot:', error);
});
