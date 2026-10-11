# TeleCloud Drive

A free, unlimited cloud drive that runs entirely in your browser and stores your files in your own Telegram account.

**Live:** https://amitsami.github.io/TeleCloud-Drive/

## How it works
- Log in with your Telegram account (QR code or phone number).
- A private channel called **TeleCloud Drive** is created in your account; every file you upload lives there.
- No server, no database: the app talks to Telegram directly from your browser. Your session stays on your device.

## Features
- **Glass interface:** frosted sidebar, toolbar and mobile tab bar, with smooth animations and transitions. Light, dark and auto themes, plus reduced-motion and reduced-transparency options.
- **Quick Preview:** opens photos, videos, audio, PDFs and text instantly without saving a copy. Videos stream with seeking.
- **Transfers:** upload and download progress with speed, time remaining, pause, resume and cancel, plus parallel chunked downloads.
- **End-to-end encryption:** optional and passphrase protected. AES-256-GCM encrypts names and metadata, AES-256-CTR encrypts file contents and thumbnails, and the key is derived with PBKDF2 (600k iterations). Telegram only sees ciphertext.
- **Storage Usage:** see what is cached on this device and clear all of it or only some types. Clearing the cache **never** deletes your cloud files.
- **Keep on This Device:** pin files for offline use.
- Folders, drag to move, rename, favorites, Recently Deleted (auto-purged after 30 days), search with type filters, a Photos timeline, Get Info, Send to Saved Messages, keyboard shortcuts, pull to refresh, and an installable PWA with offline shell.

## Develop
```bash
npm install
npm run dev
npm run build   # output in dist/
```

## Privacy
Your files go only to your own Telegram account. Nothing is sent anywhere else.
