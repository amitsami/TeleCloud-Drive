# TeleCloud Drive

A free, unlimited cloud drive that runs entirely in your browser and stores your files in your own Telegram account.

**Live:** https://amitsami.github.io/TeleCloud-Drive/

## How it works
- Log in with your Telegram account (QR code or phone number).
- A private channel called **TeleCloud Drive** is created in your account; every file you upload lives there.
- No server, no database: the app talks to Telegram directly from your browser. Your session stays on your device.

## Features
- **Shared folders with join codes:** create a shared folder and get a code like `TC-…` (or a `#join=` link). Anyone with the code can join, view, add and download files, and pass the code on to friends. Owners can reset the code or delete the folder; members can leave anytime.
- **Pastel glass design:** soft pastel colors, frosted panels with light that follows your pointer, Inter and Plus Jakarta Sans fonts, a new duotone icon set, and your Telegram profile photo. Light, dark and auto themes, plus reduced-motion and reduced-transparency options.
- **Quick Preview:** opens photos, videos, audio, PDFs and text instantly without saving a copy. Videos stream with seeking.
- **Transfers:** upload and download progress with speed, time remaining, pause, resume and cancel, plus parallel chunked downloads.
- **End-to-end encryption:** optional and passphrase protected. AES-256-GCM encrypts names and metadata, AES-256-CTR encrypts file contents and thumbnails, and the key is derived with PBKDF2 (600k iterations). Telegram only sees ciphertext.
- **Storage Usage:** see what is cached on this device and clear all of it or only some types. Clearing the cache **never** deletes your cloud files.
- **Keep on This Device:** pin files for offline use.
- **Batch actions:** move, favorite, delete and restore many files in parallel. If one item fails, the rest still finish.
- **Duplicate and Copy to…:** server-side copies with no re-upload, for files and whole folders.
- **Download as ZIP:** download folders or multiple selected files as one ZIP. Large ZIPs stream straight to disk.
- **Text notes:** create and edit text or Markdown files in the app (T, Ctrl/⌘+S).
- **Find duplicates:** find files with the same name and size and clean them up.
- **Clean Up Browser Storage:** fully deletes the cache database, the offline app copy and leftovers from older versions in one tap. Your sign-in and cloud files stay. Signing out erases all local data.
- Slideshow for photos, auto-play the next track for music, camera upload on phones, automatic renaming of name conflicts, Restore All.
- Folders, drag to move, rename, favorites, Recently Deleted (auto-purged after 30 days), search with type filters, a Photos timeline, Get Info, Send to Saved Messages, keyboard shortcuts, pull to refresh, and an installable PWA with offline shell.

## Develop
```bash
npm install
npm run dev
npm run build   # output in dist/
```

## Privacy
Your files go only to your own Telegram account. Nothing is sent anywhere else.
