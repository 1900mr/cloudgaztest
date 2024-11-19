const TelegramBot = require('node-telegram-bot-api');
const ExcelJS = require('exceljs');
const { Dropbox } = require('dropbox'); // مكتبة Dropbox
require('dotenv').config(); 
const express = require('express');

const app = express();
const port = process.env.PORT || 4000;
app.get('/', (req, res) => {
    res.send('The server is running successfully.');
});

// التوكن الخاص بـ Telegram
const token = '7560955160:AAGE29q9IxG8JlFy_WAXlTkLJB-h9QcZRRc'; // استبدل بقيمة التوكن الحقيقي

// التوكن الخاص بـ Dropbox
const dropboxAccessToken = 'sl.CA9xqOoGVMEoMF-Bju6lIusZVsD0YriZSWgt8S-QdiMVxUg6bOhRbu0bdP9mFSZ_w44jfmlC0l0M2OjX8hTn3GEJPQ6hQ4GU54e2iMlBABM_ahBBKWzlZOHCN9MUeMXHjjs0-R-QjCPk'; // استبدل بقيمة التوكن الحقيقي

// إنشاء البوت
const bot = new TelegramBot(token, { polling: true });

// إعداد Dropbox
const dbx = new Dropbox({ accessToken: dropboxAccessToken });

// تخزين البيانات من Excel
let data = [];

// دالة لتحميل البيانات من Excel
async function loadDataFromExcel() {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile('gas18-11-2024.xlsx'); // اسم الملف
        const worksheet = workbook.worksheets[0];

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

// أوامر البوت
bot.onText(/\/start/, (msg) => {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🔍 البحث برقم الهوية أو الاسم", callback_data: 'search' }],
                [{ text: "📂 رفع ملف Excel", callback_data: 'upload_excel' }],
                [{ text: "📋 قائمة الأوامر", callback_data: 'help' }],
                [{ text: "📖 معلومات عن البوت", callback_data: 'about' }],
            ],
        },
    };
    bot.sendMessage(msg.chat.id, "مرحبًا بك! اختر أحد الخيارات التالية:", options);
});

// استجابة خيار رفع ملف Excel
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;

    if (query.data === 'upload_excel') {
        bot.sendMessage(chatId, "📤 قم بإرسال ملف Excel الذي تريد رفعه.");
    }
});

// استلام الملف من المستخدم
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.document.file_id;
    const fileName = msg.document.file_name;

    try {
        // الحصول على رابط التنزيل من Telegram
        const fileLink = await bot.getFileLink(fileId);

        // تحميل الملف إلى Dropbox
        const response = await fetch(fileLink);
        const fileBuffer = await response.buffer();

        await dbx.filesUpload({
            path: `/apps/gazatest/${fileName}`,
            contents: fileBuffer,
        });

        bot.sendMessage(chatId, `✅ تم رفع الملف إلى Dropbox بنجاح: ${fileName}`);
    } catch (error) {
        console.error('حدث خطأ أثناء رفع الملف:', error.message);
        bot.sendMessage(chatId, "⚠️ حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.");
    }
});

// تشغيل السيرفر
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});