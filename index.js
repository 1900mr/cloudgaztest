// استيراد المكتبات المطلوبة
const TelegramBot = require('node-telegram-bot-api');
const ExcelJS = require('exceljs');
const { Dropbox } = require('dropbox'); // مكتبة Dropbox
const fetch = require('node-fetch'); // مكتبة Fetch لتنزيل الملفات
require('dotenv').config(); 
const express = require('express');

const app = express();
const port = process.env.PORT || 4000;

// نقطة اختبار للسيرفر
app.get('/', (req, res) => {
    res.send('The server is running successfully.');
});

// توكنات Telegram وDropbox
const token = '7560955160:AAGE29q9IxG8JlFy_WAXlTkLJB-h9QcZRRc'; // توكن Telegram (احفظه في ملف .env)
const dropboxAccessToken = 'sl.CA9xqOoGVMEoMF-Bju6lIusZVsD0YriZSWgt8S-QdiMVxUg6bOhRbu0bdP9mFSZ_w44jfmlC0l0M2OjX8hTn3GEJPQ6hQ4GU54e2iMlBABM_ahBBKWzlZOHCN9MUeMXHjjs0-R-QjCPk'; // توكن Dropbox (احفظه في ملف .env)

// إنشاء البوت
const bot = new TelegramBot(token, { polling: true });

// إعداد Dropbox
const dbx = new Dropbox({ accessToken: dropboxAccessToken });

// تخزين البيانات من Excel
let data = [];

// ===========================================
// 🟢 تحميل البيانات من ملف Excel
// ===========================================
async function loadDataFromExcel(filePath = 'gas18-11-2024.xlsx') {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];

        data = []; // إعادة تعيين البيانات
        worksheet.eachRow((row, rowNumber) => {
            const idNumber = row.getCell(1).value?.toString().trim();
            const name = row.getCell(2).value?.toString().trim();
            const province = row.getCell(3).value?.toString().trim();
            const district = row.getCell(4).value?.toString().trim();
            const area = row.getCell(5).value?.toString().trim();
            const distributorId = row.getCell(6).value?.toString().trim();
            const distributorName = row.getCell(7).value?.toString().trim();
            const distributorPhone = row.getCell(8).value?.toString().trim();
            const status = row.getCell(9).value?.toString().trim();
            const orderDate = row.getCell(12).value?.toString().trim();

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
                    orderDate: orderDate || "غير متوفر",
                });
            }
        });

        console.log('تم تحميل البيانات بنجاح.');
    } catch (error) {
        console.error('حدث خطأ أثناء قراءة ملف Excel:', error.message);
    }
}

// تحميل البيانات عند بدء التشغيل
loadDataFromExcel();

// ===========================================
// 🟢 قائمة الأوامر الخاصة بالبوت
// ===========================================
bot.onText(/\/start/, (msg) => {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🔍 البحث برقم الهوية أو الاسم", callback_data: 'search' }],
                [{ text: "📂 رفع ملف Excel", callback_data: 'upload_excel' }],
                [{ text: "📋 قائمة الأوامر", callback_data: 'help' }],
                [{ text: "📖 معلومات عن البوت", callback_data: 'about' }],
                [{ text: "📋 عرض الملفات", callback_data: 'list_files' }]
            ],
        },
    };
    bot.sendMessage(msg.chat.id, "مرحبًا بك! اختر أحد الخيارات التالية:", options);
});

// ===========================================
// 🟢 رفع ملف Excel إلى Dropbox
// ===========================================
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.document.file_id;
    const fileName = msg.document.file_name;

    try {
        // الحصول على رابط التنزيل من Telegram
        const fileLink = await bot.getFileLink(fileId);

        // تحميل الملف من Telegram
        const response = await fetch(fileLink);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const fileBuffer = await response.buffer();

        // رفع الملف إلى Dropbox
        await dbx.filesUpload({
            path: `/apps/gazatest/${fileName}`,
            contents: fileBuffer,
        });

        bot.sendMessage(chatId, `✅ تم رفع الملف "${fileName}" إلى Dropbox بنجاح.`);
    } catch (error) {
        console.error('حدث خطأ أثناء رفع الملف:', error);
        bot.sendMessage(chatId, `⚠️ حدث خطأ أثناء رفع الملف. التفاصيل: ${error.message}`);
    }
});

// ===========================================
// 🟢 عرض قائمة الملفات في Dropbox
// ===========================================
bot.onText(/\/list_files/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const response = await dbx.filesListFolder({ path: '/apps/gazatest' });
        if (response.result.entries.length === 0) {
            bot.sendMessage(chatId, "📂 لا توجد ملفات حاليًا في Dropbox.");
            return;
        }

        const fileList = response.result.entries.map((file) => `- ${file.name}`).join('\n');
        bot.sendMessage(chatId, `📋 الملفات المتوفرة في Dropbox:\n${fileList}`);
    } catch (error) {
        console.error('خطأ أثناء استرداد الملفات:', error);
        bot.sendMessage(chatId, "⚠️ حدث خطأ أثناء استرداد قائمة الملفات.");
    }
});

// ===========================================
// 🟢 حذف ملف معين من Dropbox
// ===========================================
bot.onText(/\/delete_file (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fileName = match[1];

    try {
        await dbx.filesDeleteV2({ path: `/apps/gazatest/${fileName}` });
        bot.sendMessage(chatId, `✅ تم حذف الملف "${fileName}" بنجاح من Dropbox.`);
    } catch (error) {
        console.error('خطأ أثناء حذف الملف:', error);
        bot.sendMessage(chatId, `⚠️ حدث خطأ أثناء حذف الملف "${fileName}".`);
    }
});

// ===========================================
// 🟢 تشغيل السيرفر
// ===========================================
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
