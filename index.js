import fetch from 'node-fetch'; // لتحميل الملفات من Dropbox
import XLSX from 'xlsx'; // لتحليل ملفات Excel
import { Telegraf } from 'telegraf'; // مكتبة بوت تلجرام
import express from 'express'; // مكتبة express لإنشاء خادم HTTP
import { Dropbox } from 'dropbox'; // مكتبة Dropbox لإدارة الملفات

// إعداد التوكنات وروابط Dropbox
const TELEGRAM_BOT_TOKEN = '7560955160:AAGE29q9IxG8JlFy_WAXlTkLJB-h9QcZRRc'; // توكن التلجرام
const DROPBOX_ACCESS_TOKEN = 'sl.CBExzCw1apADaDPQGzPtyCGVw6g5rIw4wVWAM2adGqAz7I5USYdigIBwoRi2_k6jb4QLh4WdqtEPjyRGTUNbbRsivLm6hMFd0wbKzZypS0AcDp8jxg2sUMlj06lXKY2i6nY_N-ouDrYI'; // توكن Dropbox
const DROPBOX_FILE_PATH = '/Apps/gazatest/upload.xlsx'; // اسم الملف الرئيسي على Dropbox

// إعداد البوت وDropbox
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN });

// إنشاء خادم Express
const app = express();
const port = process.env.PORT || 3000;

// دالة لتحميل البيانات من Dropbox وقراءة الملف
async function fetchExcelData() {
  try {
    const response = await dbx.filesDownload({ path: DROPBOX_FILE_PATH });
    const buffer = response.result.fileBinary;
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 });
  } catch (error) {
    console.error('❌ Error fetching Excel file:', error);
    throw new Error('❌ تعذر تحميل ملف البيانات. يرجى رفع ملف جديد.');
  }
}

// دالة للبحث عن البيانات في الملف
async function searchByIdOrName(query) {
  try {
    const data = await fetchExcelData();
    const headers = data[0];
    const rows = data.slice(1);

    const result = rows.find(row =>
      row[0]?.toString() === query || row[1]?.toString().toLowerCase() === query.toLowerCase()
    );

    if (result) {
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
    return `⚠️ ${error.message}`;
  }
}

// التعامل مع الرسائل والأوامر
bot.start((ctx) => {
  ctx.reply('👋 مرحبًا!\n\n📄 أرسل رقم الهوية أو اسم الشخص للحصول على المعلومات.\n📤 لرفع ملف جديد، أرسل الأمر /upload_file.');
});

bot.command('upload_file', (ctx) => {
  ctx.reply('📤 أرسل ملف Excel الجديد الذي تريد رفعه.');
});

bot.on('document', async (ctx) => {
  try {
    const fileId = ctx.message.document.file_id;
    const fileUrl = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileUrl.href);
    const fileBuffer = await response.buffer();

    // رفع الملف إلى Dropbox واستبداله بالقديم
    await dbx.filesUpload({
      path: DROPBOX_FILE_PATH,
      contents: fileBuffer,
      mode: { ".tag": "overwrite" },
    });

    ctx.reply('✅ تم رفع الملف الجديد بنجاح وهو الآن قيد الاستخدام!');
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    ctx.reply('❌ حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.');
  }
});

app.get('/', (req, res) => {
  res.send('✅ البوت يعمل في الخلفية.');
});

// بدء تشغيل الخادم
app.listen(port, () => {
  console.log(`🚀 خادم Express يعمل على المنفذ ${port}`);
});

// بدء تشغيل البوت
bot.launch().then(() => {
  console.log('🤖 بوت تلجرام يعمل الآن!');
}).catch((error) => {
  console.error('❌ Failed to launch the bot:', error);
});
