import os
import re
import json
import asyncio
import hashlib
from datetime import datetime
from typing import List, Tuple
from pyrogram import Client
from pyrogram.types import Message
import requests
from aiohttp import ClientSession

# Configuration from Environment
# Using environment variable names that match the workflow
API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
SESSION_STRING = os.environ["SESSION_STRING"]
REPO_NAME = os.environ["REPO_NAME"]
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
INPUT_LINKS = os.environ.get("INPUT_LINKS", "")
INPUT_CHAT_ID = os.environ.get("INPUT_CHAT_ID", "")

# Constants
MAX_CONCURRENT_DOWNLOADS = 2  # Parallel downloads
CHUNK_SIZE = 1024 * 1024  # 1MB chunks for upload

app = Client("my_session", api_id=API_ID, api_hash=API_HASH, session_string=SESSION_STRING)

def parse_input_links(input_text: str, chat_id: str) -> List[Tuple[str, int]]:
    """
    Parse input to extract message IDs.
    Supports:
    - Single links: t.me/channel/123 or t.me/c/.../123
    - Ranges: 100-120 (uses provided chat_id)
    - Line by line IDs (uses provided chat_id)
    """
    tasks = []
    lines = input_text.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check for range format (e.g., 100-120) - requires chat_id
        range_match = re.match(r'^(\d+)-(\d+)$', line)
        if range_match:
            if not chat_id:
                print(f"⚠️ Range '{line}' ignored: Chat ID required for ranges")
                continue
            start, end = int(range_match.group(1)), int(range_match.group(2))
            for msg_id in range(start, end + 1):
                tasks.append((chat_id, msg_id))
            continue
        
        # Check for full link format (self-contained with chat_id)
        # Pattern 1: t.me/channelname/123 (public)
        # Pattern 2: t.me/c/123456789/123 (private)
        private_match = re.search(r't\.me/c/(\d+)/(\d+)', line)
        if private_match:
            cid = f"-100{private_match.group(1)}"
            msg_id = int(private_match.group(2))
            tasks.append((cid, msg_id))
            continue
            
        public_match = re.search(r't\.me/([a-zA-Z0-9_]+)/(\d+)', line)
        if public_match:
            cid = public_match.group(1)
            msg_id = int(public_match.group(2))
            tasks.append((cid, msg_id))
            continue
        
        # Assume it's just a message ID (requires chat_id)
        if line.isdigit():
            if not chat_id:
                print(f"⚠️ Message ID '{line}' ignored: Chat ID required")
                continue
            tasks.append((chat_id, int(line)))
    
    return tasks

def get_file_hash(filepath: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

async def download_message(client: Client, chat_id: str, msg_id: int, semaphore: asyncio.Semaphore) -> dict:
    """Download media from a specific message with concurrency control"""
    async with semaphore:
        try:
            print(f"⬇️ Starting download: {chat_id}:{msg_id}")
            message: Message = await client.get_messages(chat_id, msg_id)
            
            if not message or not message.media:
                print(f"⚠️ No media in message {msg_id}")
                return None
            
            file_attr = message.document or message.video or message.audio or message.voice
            if not file_attr:
                # Try photo
                if message.photo:
                    file_attr = message.photo.big_file_id
                else:
                    print(f"⚠️ Unsupported media type in message {msg_id}")
                    return None
            
            original_name = getattr(file_attr, 'file_name', f'file_{msg_id}')
            safe_name = f"{str(chat_id).replace('-', '_')}_{msg_id}_{original_name}".replace(" ", "_").replace("/", "_")
            
            # Custom progress could be added here
            file_path = await client.download_media(message, file_name=safe_name)
            
            if not file_path:
                return None
                
            file_size = os.path.getsize(file_path)
            print(f"✅ Downloaded: {safe_name} ({file_size / (1024*1024):.2f} MB)")
            
            return {
                'path': file_path,
                'original_name': original_name,
                'safe_name': safe_name,
                'size': file_size,
                'chat_id': chat_id,
                'msg_id': msg_id
            }
            
        except Exception as e:
            print(f"❌ Error downloading {chat_id}:{msg_id} - {str(e)}")
            return None

def upload_to_release(file_path: str, tag_name: str, asset_name: str) -> str:
    """Upload file to GitHub Release"""
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    repo_owner, repo_name = REPO_NAME.split("/")
    
    # Check if release exists
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/releases/tags/{tag_name}"
    r = requests.get(url, headers=headers)
    
    if r.status_code == 404:
        # Create new release
        data = {
            "tag_name": tag_name,
            "name": f"Download {tag_name}",
            "body": f"Automated download from Telegram",
            "draft": False,
            "prerelease": False
        }
        r = requests.post(f"https://api.github.com/repos/{repo_owner}/{repo_name}/releases", 
                         json=data, headers=headers)
        r.raise_for_status()
    
    release_data = r.json()
    upload_url = release_data['upload_url'].replace("{?name,label}", "")
    
    # Upload asset with retry logic
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with open(file_path, 'rb') as f:
                headers["Content-Type"] = "application/octet-stream"
                params = {"name": asset_name}
                res = requests.post(upload_url, headers=headers, params=params, data=f, timeout=60)
                res.raise_for_status()
                download_url = res.json()['browser_download_url']
                print(f"📤 Uploaded: {asset_name} -> {download_url}")
                return download_url
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            print(f"⚠️ Upload retry {attempt + 1} for {asset_name}: {str(e)}")
            asyncio.sleep(2)

def update_history(entry: dict):
    """Add entry to history.json"""
    history_file = "data/history.json"
    data = []
    
    if os.path.exists(history_file):
        try:
            with open(history_file, 'r') as f:
                data = json.load(f)
        except:
            data = []
    
    new_entry = {
        "id": f"{entry['chat_id']}_{entry['msg_id']}",
        "filename": entry['safe_name'],
        "original_name": entry['original_name'],
        "size_mb": round(entry['size'] / (1024 * 1024), 2),
        "url": entry['download_url'],
        "channel": str(entry['chat_id']),
        "message_id": entry['msg_id'],
        "date": datetime.now().isoformat(),
        "extension": entry['original_name'].split('.')[-1].lower() if '.' in entry['original_name'] else "file"
    }
    
    # Avoid duplicates
    data = [item for item in data if item['id'] != new_entry['id']]
    data.insert(0, new_entry)
    
    with open(history_file, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

async def process_batch(tasks: List[Tuple[str, int]]):
    """Process download tasks with concurrency limit"""
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_DOWNLOADS)
    
    await app.start()
    try:
        total = len(tasks)
        print(f"🚀 Starting batch processing of {total} items with {MAX_CONCURRENT_DOWNLOADS} concurrent downloads")
        
        for idx, (chat_id, msg_id) in enumerate(tasks, 1):
            print(f"\n[{idx}/{total}] Processing {chat_id}:{msg_id}")
            
            result = await download_message(app, chat_id, msg_id, semaphore)
            
            if result:
                # Check file size limit (2GB)
                if result['size'] > 2 * 1024 * 1024 * 1024:
                    print(f"⚠️ Skipping {result['safe_name']}: File exceeds 2GB limit")
                    continue
                
                tag_name = f"post-{result['msg_id']}"
                try:
                    download_url = upload_to_release(
                        result['path'], 
                        tag_name, 
                        result['safe_name']
                    )
                    result['download_url'] = download_url
                    update_history(result)
                    print(f"✨ Completed: {result['original_name']}")
                except Exception as e:
                    print(f"❌ Upload failed for {result['safe_name']}: {str(e)}")
                
                # Clean up local file
                try:
                    os.remove(result['path'])
                except:
                    pass
                    
    finally:
        await app.stop()

async def main():
    tasks = parse_input_links(INPUT_LINKS, INPUT_CHAT_ID)
    
    if not tasks:
        print("❌ No valid tasks found. Please check your input.")
        return
    
    await process_batch(tasks)
    print("\n🎉 Batch processing completed!")

if __name__ == "__main__":
    asyncio.run(main())
