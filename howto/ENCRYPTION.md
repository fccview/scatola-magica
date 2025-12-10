# Encryption Guide

This guide explains how Scatola Magica protects your data using different encryption methods.

## Overview

Scatola Magica supports three types of encryption to protect your files:

1. **PGP Encryption** - Permanently encrypts files stored on the server
2. **Transfer Encryption** - Encrypts file data during upload (temporary protection)
3. **Path Encryption** - Automatically encrypts folder paths in URLs

Each method serves a different purpose and can be used independently or together.

---

## PGP Encryption

### What is it?

PGP (Pretty Good Privacy) encryption lets you permanently encrypt files on your server. Once encrypted, files remain protected and can only be decrypted with your private key password.

**Key features:**

- Uses industry-standard RSA encryption (2048 or 4096-bit)
- Files are stored encrypted on the server as `.gpg` files
- Only you (or someone with your private key) can decrypt them
- Works for individual files and entire folders

**When to use it:**

- For sensitive files you want to keep encrypted on the server
- When sharing files with others using their public key
- For long-term secure storage

### How to set it up

1. Go to **Settings** and click the **Encryption** tab
2. Click **Generate Key Pair**
3. Enter a strong password (minimum 8 characters)
4. Choose your key size:
   - **2048-bit**: Faster, suitable for most users
   - **4096-bit**: More secure, slightly slower
5. Optionally enter your email address
6. Click **Generate**

Your keys will be created and stored securely. The private key is encrypted with your password.

**Important:** Back up your keys by clicking **Export Public Key** and **Export Private Key**. Store them somewhere safe. Without your private key and password, you cannot decrypt your files.

### How to use it

**Encrypting a file:**

1. Right-click any file
2. Select **Encrypt**
3. Choose to use your own key or a custom public key
4. The file will be encrypted and saved as `filename.gpg`
5. Optionally delete the original file

**Encrypting a folder:**

1. Right-click any folder
2. Select **Encrypt**
3. The folder is archived and encrypted as `foldername.folder.gpg`

**Decrypting a file:**

1. Right-click a `.gpg` file
2. Select **Decrypt**
3. Enter your private key password
4. Choose where to save the decrypted file
5. Optionally delete the encrypted file

**Decrypting a folder:**

1. Right-click a `.folder.gpg` file
2. Select **Decrypt**
3. Enter your private key password
4. The folder will be extracted to its original structure

---

## Transfer Encryption

### What is it?

Transfer Encryption encryption protects your files during upload. Files are encrypted on your device before being sent to the server, then decrypted when they arrive.

**Key features:**

- Uses AES-256-GCM encryption (industry standard)
- Encrypts each file chunk before it leaves your device
- Server never sees unencrypted data during transfer
- Files are stored unencrypted on the server after upload

**When to use it:**

- When uploading over untrusted networks
- For extra security during the upload process
- When you want transfer-time protection

**Important:** This is transfer-only protection. Files are stored unencrypted on the server after upload. For permanent encryption, use PGP encryption.

### How to set it up

**Prerequisites:**

- You must first set up PGP encryption (see above)
- Transfer Encryption uses your PGP key password

**Enable Transfer Encryption:**

1. Go to **Settings** and click the **Encryption** tab
2. Toggle on **End-to-End Encryption on Transfer**
3. That's it - E2E is now active for all uploads

### How to use it

1. Click **Upload** and select files as normal
2. Before upload starts, you'll be prompted for your private key password
3. Optionally check **Remember for this session** to avoid re-entering the password
4. Files are encrypted on your device and uploaded
5. The server decrypts them and stores them normally

The password is only stored - encrypted - in your browser's session (cleared when you close the tab).

---

## Path Encryption

### What is it?

Path encryption automatically encrypts folder paths in URLs. This prevents others from seeing your folder structure if they intercept a URL.

**Key features:**

- Happens automatically - no setup required
- Each user has their own encryption key
- You cannot decrypt other users' paths

**Example:**

- Real path: `/files/path/to/folder`
- Encrypted in URL: `/files/x7k9mP2qR...`

This is enabled by default and requires no action from you.

**Someone else is hosting this and I am just uploading my files. Are they safe from the server administrator?**

- **PGP encrypted files**: Yes, they're encrypted on the server and cannot be read without your private key password, which is NEVER stored on the server. NOTE: The server admin will have access to your private keys if you generate them via the app. You can always only use an external public key to encrypt files, but decryption can only happens if the private key is stored on the server. The choice is entirely yours.
- **E2E transfer encryption**: Protects during upload only; files are stored unencrypted after upload
- **Regular files**: No encryption - stored as-is on the server

For maximum privacy from server administrators, use PGP encryption for all sensitive files.
