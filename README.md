# Telegram to GitHub Downloader

یک سیستم خودکار برای دانلود فایل‌ها از تلگرام و آپلود در GitHub Releases با پنل وب زیبا.

## ویژگی‌ها

- ✅ دانلود موازی (همزمان ۲ فایل)
- ✅ پشتیبانی از رنج پیام‌ها (مثلاً 100-150)
- ✅ ورودی چند خطی لینک‌ها
- ✅ پنل وب با طراحی مدرن (Apple-like)
- ✅ حالت شب/روز
- ✅ دو زبانه (فارسی/انگلیسی)
- ✅ جستجو و فیلتر پیشرفته
- ✅ آمار لحظه‌ای
- ✅ بدون نیاز به سرور (GitHub Pages)

## ساختار پروژه

```
/
├── .github/workflows/
│   └── downloader.yml      # پایپ‌لاین اصلی
├── src/
│   ├── downloader.py       # اسکریپت دانلود
│   └── requirements.txt    # وابستگی‌ها
├── data/
│   └── history.json        # تاریخچه دانلودها
├── web/
│   ├── index.html          # پنل وب
│   ├── style.css           # استایل‌ها
│   └── app.js              # منطق پنل
└── README.md
```

## تنظیمات Secrets

در ریپازیتوری GitHub، Secrets زیر را تنظیم کنید:

| نام | توضیح | مقدار نمونه |
|-----|-------|-------------|
| `TELEGRAM_API_ID` | API ID از my.telegram.org | `12345678` |
| `TELEGRAM_API_HASH` | API Hash از my.telegram.org | `abc123def456...` |
| `TELEGRAM_SESSION` | Session String کلاینت Pyrogram | `1BVtsOKcBu7...` |
| `BOT_TOKEN` | توکن ربات تلگرام (برای checkout) | `123456:ABC-DEF...` |

**نکته:** برای `BOT_TOKEN` می‌توانید از توکن ربات تلگرام خود استفاده کنید. اگر ندارید:
1. در تلگرام به @BotFather پیام دهید
2. دستور `/newbot` را بزنید
3. نام و یوزرنیم ربات را وارد کنید
4. توکن دریافتی را در Secret ذخیره کنید

یا می‌توانید یک Personal Access Token با دسترسی `repo` بسازید:
1. به https://github.com/settings/tokens بروید
2. Generate new token (classic) را بزنید
3. دسترسی `repo` را انتخاب کنید
4. توکن را کپی و ذخیره کنید

### دریافت Session String

یک بار محلی اجرا کنید:

```python
from pyrogram import Client

app = Client("my_session", api_id=YOUR_API_ID, api_hash="YOUR_API_HASH")

async def main():
    await app.start()
    print(await app.export_session_string())

app.run(main())
```

## استفاده

1. به صفحه **Actions** در ریپازیتوری بروید
2. ورکفلو **Telegram Batch Downloader** را انتخاب کنید
3. دکمه **Run workflow** را بزنید
4. اطلاعات را وارد کنید:

### فرمت‌های ورودی پشتیبانی شده

#### ۱. رنج پیام‌ها
```
100-150
```

#### ۲. لینک‌های تکی (هر خط یک لینک)
```
t.me/channel_name/123
t.me/channel_name/124
t.me/c/1234567890/100
```

#### ۳. ترکیبی
```
100-120
t.me/channel/125
130
```

### Chat ID

- برای کانال عمومی: `@channelname` یا `channelname`
- برای کانال خصوصی: `-1001234567890`

## پنل وب

برای فعال‌سازی پنل وب:

1. به **Settings > Pages** در ریپازیتوری بروید
2. Source را روی **main branch** و پوشه **/web** قرار دهید
3. پس از چند دقیقه، پنل در آدرس `https://username.github.io/repo-name` قابل دسترسی است

## محدودیت‌ها

- سقف هر فایل: ۲ گیگابایت (محدودیت GitHub Releases)
- زمان حداکثر اجرای ورکفلو: ۶۰ دقیقه
- دانلود همزمان: ۲ فایل

## تکنولوژی‌ها

- **Backend**: Python, Pyrogram, GitHub Actions
- **Frontend**: Vanilla JS, CSS Variables
- **Storage**: GitHub Releases + JSON

## مجوز

MIT License
