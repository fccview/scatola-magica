# Torrents Guide

This guide explains how to use Scatola Magica's built-in BitTorrent functionality to download, seed, and create torrents.

## Overview

Scatola Magica provides full BitTorrent support with these features:

1. **Download Torrents** - Add magnet links or .torrent files to download content
2. **Create Torrents** - Generate .torrent files and magnet links from your files/folders
3. **Seed Torrents** - Share your downloaded or created torrents with others
4. **Manage Downloads** - Pause, resume, and monitor all your torrents in one place

All torrent functionality requires encryption to be configured first for security.

---

## Prerequisites: Encryption Setup

**Before using any torrent features, you must configure encryption.**

### Why is encryption required?

Scatola Magica requires encryption for torrent operations to ensure:
- Your download activity is protected
- Your created torrents are tracked securely
- Your torrent metadata is stored safely

### How to set up encryption

1. Go to **Settings** → **Encryption** tab
2. Click **Generate Key Pair**
3. Enter a strong password (minimum 8 characters)
4. Choose key size (2048-bit recommended)
5. Click **Generate**

Once encryption is configured, you can access all torrent features.

---

## Downloading Torrents

### Adding a Magnet Link

1. Navigate to the **Torrents** page or any folder in the file browser
2. Click the **Add** (+) button in the bottom-right corner
3. Select **Magnet Link**
4. Paste your magnet URI (starts with `magnet:?`)
5. Click **Next** to fetch metadata
6. Wait while Scatola Magica connects to the DHT and retrieves file information
7. Select which files you want to download (all selected by default)
8. Choose a download location (optional)
9. Click **Download**

**Loading states:**
- "Connecting to DHT..." - Joining the distributed hash table
- "Finding peers..." - Locating other users sharing the torrent
- "Fetching metadata..." - Retrieving file list and torrent information
- "Metadata received!" - Ready to select files

### Adding a .torrent File

1. Click the **Add** (+) button
2. Select **Torrent File**
3. Choose your `.torrent` file from your computer
4. The file will be parsed automatically
5. Select files to download
6. Click **Download**

### Choosing Download Location

By default, torrents download to:
- `/uploads/{your-username}/` for regular users
- `/uploads/` for admin users
- Your preferred download path (if set in Settings)

You can override this per-torrent by:
1. Clicking the folder icon when adding a torrent
2. Selecting a different destination folder
3. The torrent will download to that location

### Download Progress

Once added, torrents appear in the Torrents page with:
- **Name** - Torrent filename
- **Size** - Total size and download progress
- **Status** - Current state (Downloading, Seeding, Paused, etc.)
- **Peers** - Number of connected peers
- **Speed** - Download/upload speeds
- **Ratio** - Upload/download ratio
- **Progress Bar** - Visual download completion

Status indicators:
- **INITIALIZING** - Connecting to peers
- **DOWNLOADING** - Actively downloading
- **SEEDING** - Download complete, sharing with others
- **PAUSED** - Manually paused
- **STOPPED** - Not active
- **COMPLETED** - Downloaded and reached target seed ratio
- **ERROR** - An error occurred

---

## Creating Torrents

### Create from a File

1. Navigate to the file in the file browser
2. Right-click the file
3. Select **Create Torrent**
4. Choose options:
   - **Private or Public** - Private torrents don't use trackers
   - **Trackers** - Only if creating a public torrent
   - **Comment** - Optional description
5. Click **Create**
6. The torrent file and magnet link will be generated

### Create from a Folder

1. Navigate to the folder
2. Right-click the folder
3. Select **Create Torrent**
4. Configure the same options as above
5. Click **Create**

**Limitations:**
- Maximum file size per torrent (configurable in Settings)
- Maximum folder file count (default: 10,000 files)
- Maximum directory depth (default: 20 levels)
- No symlinks allowed (security)

### Using Created Torrents

After creating a torrent, you can:
1. **Download the .torrent file** - Share with others
2. **Copy the magnet link** - Share via text/email
3. **Start seeding immediately** - Click "Start Seeding" to begin sharing

Created torrents appear in the Torrents page with a special "CREATED" status badge.

---

## Seeding

### What is Seeding?

Seeding means sharing files you've downloaded (or created) with other users. This is how BitTorrent works - everyone shares to help each other download faster.

### Seed Ratio

The **seed ratio** determines how long you seed:
- Ratio = Total Uploaded ÷ Total Downloaded
- Default ratio: **1.0** (upload as much as you downloaded)
- Example: If you download 1GB, you'll seed until you've uploaded 1GB

You can configure your target seed ratio in **Settings** → **Torrents**.

### Automatic Seeding

When a torrent completes downloading:
1. Status changes to **SEEDING**
2. Scatola Magica continues sharing the files
3. Upload/download ratio increases over time
4. When ratio reaches your target, status becomes **COMPLETED**
5. The torrent automatically pauses

### Manual Seeding Control

You can control seeding at any time:
- **Pause** - Temporarily stop seeding
- **Resume** - Continue seeding
- **Stop** - Fully stop the torrent (can be resumed later)

### Seeding Created Torrents

For torrents you've created:
1. Go to the **Torrents** page
2. Find your created torrent
3. Click **Start Seeding**
4. The torrent will begin sharing immediately

Since you already have the complete files, created torrents start at 100% progress and go straight to seeding.

---

## Managing Torrents

### Torrents Page

Access the Torrents page via:
- Navigation menu → **Torrents**
- Direct URL: `/torrents`

The page shows two sections:
1. **Downloads** - Torrents you're downloading or seeding
2. **Created Torrents** - Torrents you've created

### Torrent Actions

For each torrent, you can:
- **Pause** ⏸ - Pause download/upload
- **Resume** ▶ - Continue download/upload
- **Stop** ⏹ - Stop the torrent completely
- **Remove** 🗑️ - Remove from list
  - Choose to keep or delete files
  - Removes torrent metadata

### Rate Limiting

To prevent abuse, Scatola Magica enforces:
- **5 torrents per minute** - Rate limit for adding new torrents
- **Maximum active torrents** - Default 5 (configurable in Settings)

If you hit the rate limit, wait 60 seconds and try again.

---

## Settings

Configure torrent behavior in **Settings** → **Torrents**.

### Available Settings

**Seed Ratio**
- Default: 1.0
- How much to upload relative to download
- Set to 0 to disable automatic seeding stop
- Higher values = more sharing

**Preferred Download Path**
- Default download location for all torrents
- Overrides the default `/uploads/{username}/` path
- Must be within your uploads directory
- Can be overridden per-torrent

**Auto-Start Torrents**
- Default: Enabled
- Automatically start downloading when adding a torrent
- If disabled, torrents are added in STOPPED state

**Maximum Active Torrents**
- Default: 5
- Maximum number of simultaneously active torrents
- Prevents resource exhaustion
- Pause/remove torrents to add more

**Download Speed Limit**
- Default: Unlimited
- Maximum download speed in KB/s
- Set to 0 for unlimited

**Upload Speed Limit**
- Default: Unlimited
- Maximum upload speed in KB/s
- Set to 0 for unlimited

**Trackers** (for public torrents)
- List of tracker URLs to include in created torrents
- One per line
- Used only when creating public torrents

**File Size Limits**
- Maximum single file size for torrent creation
- Maximum total torrent size
- Maximum torrent file size for uploads

---

## Protocol Handlers

Scatola Magica supports opening magnet links directly from your browser.

### Magnet Link Support

When you click a magnet link:
1. Your browser asks to open with Scatola Magica
2. Click "Allow" or "Open"
3. You're redirected to the Torrents page
4. The magnet link is automatically loaded
5. Select files and start downloading

### Browser Configuration

**Chrome/Edge:**
1. Click a magnet link
2. Choose "Scatola Magica" from the app list
3. Check "Remember my choice"
4. Click "Open link"

**Firefox:**
1. Click a magnet link
2. Choose "Use Scatola Magica (default)"
3. Click "Open link"

**Safari:**
1. Go to Safari → Preferences → Websites
2. Find "magnet" protocol handler
3. Select Scatola Magica

---

## Security & Privacy

### Encryption Requirement

All torrent operations require encryption for:
- **Secure metadata storage** - Your torrent list is protected
- **Audit logging** - All actions are tracked securely
- **PGP key verification** - Ensures you have proper security setup

### Path Security

Scatola Magica prevents:
- **Path traversal** - Can't download outside allowed directories
- **Symlink attacks** - Symlinks are rejected
- **Directory escaping** - All paths are validated and normalized

### Audit Logging

All torrent actions are logged:
- `torrent:add` - Adding a new torrent
- `torrent:create` - Creating a torrent file
- `torrent:pause` - Pausing a torrent
- `torrent:resume` - Resuming a torrent
- `torrent:stop` - Stopping a torrent
- `torrent:remove` - Removing a torrent
- `torrent:complete` - Download completed
- `torrent:seed-complete` - Reached target seed ratio
- `torrent:error` - Any errors that occur

View logs in **Settings** → **Audit Logs**.

### Privacy Considerations

**What Scatola Magica tracks:**
- Torrents you add/create
- Download/upload statistics
- Seed ratios and completion status

**What Scatola Magica does NOT track:**
- Torrent content or file names (beyond metadata)
- Which peers you connect to
- Your IP address in torrent swarms

**Network Privacy:**
- Your IP is visible to peers in the swarm (standard BitTorrent behavior)
- Use a VPN if you need IP privacy
- Private torrents don't announce to public trackers

---

## Troubleshooting

### "Encryption must be configured"

**Problem:** Can't add or create torrents.

**Solution:**
1. Go to Settings → Encryption
2. Generate a PGP key pair
3. Return to Torrents page

### Stuck on "INITIALIZING"

**Problem:** Torrent stays in INITIALIZING status.

**Possible causes:**
- No peers available (rare/unpopular torrent)
- Firewall blocking connections
- Invalid magnet link

**Solutions:**
- Wait 2-5 minutes for peer discovery
- Check your network/firewall settings
- Try a different magnet link or .torrent file
- Check server logs for errors

### "Rate limit exceeded"

**Problem:** Can't add more torrents.

**Solution:**
- Wait 60 seconds
- Maximum 5 torrents per minute
- This is a security measure

### "Maximum active torrents reached"

**Problem:** Can't start a new torrent.

**Solutions:**
- Pause or remove existing torrents
- Increase limit in Settings → Torrents → Max Active Torrents
- Wait for downloads to complete

### Slow download speeds

**Possible causes:**
- Few peers seeding
- Slow peers
- Network congestion

**Solutions:**
- Wait for more peers to connect
- Check your internet connection
- Try a different torrent with more seeders
- Adjust upload/download limits in Settings

### Files not appearing after download

**Problem:** Download shows 100% but files aren't in the folder.

**Solutions:**
- Check the download path (shown in torrent details)
- Refresh the file browser
- Check for disk space issues
- Look in Settings → Torrents → Preferred Download Path

---

## Best Practices

### For Downloaders

1. **Seed what you download** - Help the community by seeding to at least 1.0 ratio
2. **Choose the right files** - Only download what you need to save bandwidth
3. **Monitor disk space** - Ensure you have enough space before starting large torrents
4. **Use preferred paths** - Set a default download location in Settings

### For Creators

1. **Use descriptive names** - Make it easy for others to identify your torrent
2. **Add comments** - Include helpful information in the comment field
3. **Choose appropriate trackers** - Use well-known trackers for public torrents
4. **Seed your creations** - Always seed torrents you create
5. **Test before sharing** - Download your own torrent first to verify it works

### For Everyone

1. **Keep encryption enabled** - Required for security
2. **Monitor your ratio** - Be a good peer and maintain healthy ratios
3. **Don't share copyrighted content** - Only share files you have rights to distribute
4. **Check audit logs** - Review your torrent activity periodically
5. **Back up important torrents** - Keep .torrent files for content you want to preserve

---

## Technical Details

### BitTorrent Implementation

Scatola Magica uses [WebTorrent](https://webtorrent.io/) for BitTorrent functionality:
- Pure JavaScript implementation
- Works in both Node.js and browsers
- Supports DHT for peer discovery
- Compatible with standard BitTorrent clients

### Piece Size

- Default piece size: **256 KB** (262,144 bytes)
- Optimal for most file sizes
- Affects torrent file size and verification speed

### Hash Algorithm

- Info hash: **SHA-1**
- Piece hash: **SHA-1**
- Standard BitTorrent v1 protocol

### Supported Protocols

- **DHT** (Distributed Hash Table) - Decentralized peer discovery
- **Trackers** - HTTP/HTTPS/UDP trackers (for public torrents)
- **PEX** (Peer Exchange) - Discover peers from other peers
- **Magnet URIs** - `magnet:?xt=urn:btih:...`

### File Storage

Torrent metadata is stored in:
- `data/config/torrents/{username}-sessions.json` - Active downloads
- `data/config/torrents/{username}-created.json` - Created torrents
- `data/config/torrents/{infohash}.torrent` - .torrent files

Downloads are stored in:
- `data/uploads/{username}/` (default)
- Or your configured preferred download path

---

## API Integration

Advanced users can integrate torrent functionality via server actions.

### Adding a Torrent

```typescript
import { addTorrent } from "@/app/_server/actions/manage-torrents";

const result = await addTorrent(
  "magnet:?xt=urn:btih:...",  // Magnet URI or Buffer
  "/custom/path",              // Optional download path
  "folder-id"                  // Optional folder ID
);

if (result.success) {
  console.log("Added torrent:", result.data.infoHash);
}
```

### Creating a Torrent

```typescript
import { createTorrentFromFile } from "@/app/_server/actions/make-torrents";

const result = await createTorrentFromFile(
  "path/to/file",
  {
    name: "My File",
    isAnnounced: false,  // Private torrent
    comment: "Created with Scatola Magica"
  }
);

if (result.success) {
  console.log("Magnet URI:", result.data.magnetURI);
  console.log("Torrent file:", result.data.torrentFile);
}
```

### Managing Torrents

```typescript
import {
  pauseTorrent,
  resumeTorrent,
  removeTorrent
} from "@/app/_server/actions/manage-torrents";

// Pause
await pauseTorrent(infoHash);

// Resume
await resumeTorrent(infoHash);

// Remove (with files)
await removeTorrent(infoHash, true);
```

---

## FAQ

**Q: Can I use Scatola Magica with other BitTorrent clients?**

A: Yes! Torrents created in Scatola Magica work with any BitTorrent client (qBittorrent, Transmission, etc.). You can also add .torrent files or magnet links from other clients to Scatola Magica.

**Q: How many torrents can I have active at once?**

A: Default is 5 active torrents. You can increase this in Settings → Torrents → Max Active Torrents. However, too many active torrents may slow down your server.

**Q: What happens if I delete a torrent?**

A: You can choose to either:
1. Remove just the torrent (keeps files)
2. Remove torrent and delete files

**Q: Can I seed torrents 24/7?**

A: Yes, as long as your Scatola Magica server is running. Torrents will continue seeding until they reach your target ratio or you manually stop them.

**Q: Are torrents encrypted?**

A: The torrent metadata is encrypted (requires PGP keys). However, the actual torrent protocol does not encrypt data by default. Use a VPN for network privacy.

**Q: Can I download multiple files from a torrent?**

A: Yes! When adding a torrent, you can select exactly which files to download. Uncheck files you don't want.

**Q: What's the difference between COMPLETED and SEEDING?**

A:
- **SEEDING** - Download finished, actively seeding, haven't reached target ratio yet
- **COMPLETED** - Reached your target seed ratio, automatically paused

**Q: Can I change the seed ratio for a specific torrent?**

A: No, the seed ratio is global for all torrents. However, you can manually pause a torrent whenever you want, regardless of ratio.

---

## Support

If you encounter issues with torrents:

1. Check this guide's Troubleshooting section
2. Review audit logs for error details (Settings → Audit Logs)
3. Check server console for detailed error messages
4. Ensure encryption is properly configured
5. Verify network connectivity and firewall settings

For bugs or feature requests, please report them to the Scatola Magica maintainers.
