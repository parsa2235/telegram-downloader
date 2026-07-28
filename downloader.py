import os
import sys
import time
import requests
from pyrogram import Client

API_ID = int(os.environ["TELEGRAM_API_ID"])
API_HASH = os.environ["TELEGRAM_API_HASH"]
SESSION_STRING = os.environ["TELEGRAM_SESSION"]
BOT_TOKEN = os.environ["BOT_TOKEN"]
CHAT_ID = os.environ["CHAT_ID"]
TG_LINK = os.environ.get("TELEGRAM_LINK")

bot_url = f"https://api.telegram.org/bot{BOT_TOKEN}"

def send_telegram_message(text):
    res = requests.post(f"{bot_url}/sendMessage", json={"chat_id": CHAT_ID, "text": text, "parse_mode": "Markdown"})
    return res.json().get("result", {}).get("message_id")

def edit_telegram_message(msg_id, text):
    requests.post(f"{bot_url}/editMessageText", json={"chat_id": CHAT_ID, "message_id": msg_id, "text": text, "parse_mode": "Markdown"})

last_update_time = 0

def progress_callback(current, total, msg_id, file_name):
    global last_update_time
    now = time.time()
    if now - last_update_time >= 10 or current == total:
        last_update_time = now
        percent = (current / total) * 100
        mb_current = current / (1024 * 1024)
        mb_total = total / (1024 * 1024)
        status_text = (
            f"📥 **در حال دانلود از تلگرام...**\n\n"
            f"📁 فایل: `{file_name}`\n"
            f"📊 پیشرفت: `{percent:.1f}%`\n"
            f"💾 حجم: `{mb_current:.1f} MB` از `{mb_total:.1f} MB`"
        )
        try:
            edit_telegram_message(msg_id, status_text)
        except Exception:
            pass

def parse_telegram_link(link):
    link = link.strip()
    if "/c/" in link:
        parts = link.split("/c/")[1].split("/")
        return int(f"-100{parts[0]}"), int(parts[1])
    else:
        parts = link.split("t.me/")[1].split("/")
        return parts[0], int(parts[1])

def main():
    if not TG_LINK:
        print("ارور: لینکی دریافت نشد!")
        sys.exit(1)

    status_msg_id = send_telegram_message("⏳ **درخواست دریافت شد. در حال اتصال به تلگرام...**")

    app = Client("downloader", api_id=API_ID, api_hash=API_HASH, session_string=SESSION_STRING, in_memory=True)
    
    with app:
        try:
            target_chat, msg_id = parse_telegram_link(TG_LINK)
            message = app.get_messages(target_chat, msg_id)
        except Exception as e:
            edit_telegram_message(status_msg_id, f"❌ **ارور در یافتن پیام:**\n`{str(e)}`")
            sys.exit(1)
        
        if not message or not message.media:
            edit_telegram_message(status_msg_id, "❌ این پیام حاوی هیچ فایل یا رسانه‌ای نیست!")
            sys.exit(1)

        media_obj = getattr(message, message.media.value)
        file_name = getattr(media_obj, "file_name", None) or f"file_{msg_id}"
        
        edit_telegram_message(status_msg_id, f"🚀 **دانلود شروع شد:** `{file_name}`")

        file_path = app.download_media(
            message,
            progress=progress_callback,
            progress_args=(status_msg_id, file_name)
        )
        
        edit_telegram_message(status_msg_id, f"✅ **دانلود کامل شد!**\n📦 در حال آپلود به GitHub Release...")
        
        with open("downloaded_file.txt", "w", encoding="utf-8") as f:
            f.write(file_path)

if __name__ == "__main__":
    main()
