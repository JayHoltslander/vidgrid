![Logo](https://capsule-render.vercel.app/api?type=waving&height=300&color=gradient&customColorList=12&text=🎬%20VidGrid&section=header&fontAlign=50&fontAlignY=40&animation=fadeIn&fontSize=100&desc=Minimal,%20zero-UI%20multi-video%20playlist%20player&descAlignY=63&descSize=25)

<div align="center">
  <p>
    <a href="#key-features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#configuration-examples">Examples</a>
  </p>

  <br />

  [![](https://img.shields.io/badge/Demo_Video_Page-0072ff?style=for-the-badge&logoColor=white)](https://jayholtslander.github.io/vidgrid/)
  
</div>


<br />

# VidGrid
VidGrid is a lightweight browser application designed to autoplay multiple independent, randomly shuffled video playlists in a highly responsive grid. Optimized for digital signage, ambient rooms, and Raspberry Pi kiosks, VidGrid maintains custom aspect ratios and dynamically packs tiles to occupy 100% of the viewport with zero overflow or scrollbars.

<img src="https://skillicons.dev/icons?i=html,js,css" />

## Common Use Cases

* **Digital Signage & Video Walls**: Create a seamless wall of synchronized or independent video displays.
* **Ambient Rooms & Screensavers**: Play relaxing atmospheric loops or digital art installations on wall-mounted TVs.
* **Hardware Kiosks**: Set up a dedicated Raspberry Pi loop player in museums, exhibition spaces, or retail displays.
* **Multi-Stream Feeds**: Monitor multiple local camera streams or preview video folders simultaneously.
* **Prop Displays & Set Design**: Simulate complex computer consoles, sci-fi server stacks, command control centers, or diagnostic monitors for theater, film sets, and escape rooms.

---

## Key Features

- **Zero-UI Aesthetic**: No control bars, hover menus, or playback overlays. Just raw, borderless video grids that let the content take center stage.
- **Parameter-Based Display Options**: Customize player counts, custom/preset video aspect ratios, gaps/gutter widths, and corner rounding on-the-fly using simple URL query strings (e.g., `?videos=6&aspect=16:9&gutter=20&corners=8`).
- **Dynamic Grid Packing**: A JavaScript layout-packing algorithm automatically computes the optimal grid dimensions (columns, rows, widths, and heights) on window resize to maximize screen real-estate usage.
- **Self-Healing Playlist Discovery**: 
  - On launch, VidGrid fetches the local `/videos` directory structure, automatically parsing and playing any supported video files (e.g., `.mp4`, `.mov`, `.webm`, `.mkv`) on-the-fly.
  - **404 Skipping**: If a video is renamed or deleted while the grid is running, players automatically skip the broken file, remove it from memory, and advance to the next valid video in the shuffled playlist within 800ms.
- **Focus Lightbox Mode**: Clicking any active player smoothly floats, scales, and centers it to fill 80% of the screen (or edge-to-edge if `?focus-full=true` is used). You can also configure the focused player to adopt a different aspect ratio (e.g., `?focus-aspect=16:9`) or disable the focus feature entirely with `?disable-focus=true`. The rest of the grid is blurred and dimmed in the background. If configured with `?unmuting=true`, the focused player **automatically unmutes its audio** when zoomed and **mutes again** when returned to the grid. Pressing `Escape`, clicking the backdrop, or clicking the player again instantly slides it back to its original grid cell.

---

## Quick Start

VidGrid is ready to use out of the box! You do **not** need to build the project unless you want to modify the source code.

### 1. Structure the Videos Folder
Place your video files inside the `dist/videos/` directory:

```bash
vidgrid/
├── build.js
├── dist/
│   ├── app.js
│   ├── index.html
│   ├── styles.css
│   └── videos/
│       ├── video1.mp4
│       ├── video2.mov
│       └── clip3.webm
├── package.json
├── readme.md
└── src/
    ├── app.js
    ├── index.html
    └── styles.css
```

### 2. Launch a Local Web Server
Because browser security sandboxes block direct local filesystem access (`file://`), you must serve the files through a local HTTP server to enable the auto-discovery directory listing.

To serve the pre-built production assets (`/dist`), run the Python 3 server from the root directory by specifying the `--directory dist` option:

```bash
python3 -m http.server 8080 --directory dist
```
*(Serving `/dist` ensures the web browser loads the minified HTML, CSS, and JS, along with the contents of the `/dist/videos/` directory.)*

### 3. Open in Browser
Navigate to the server in your browser:

* **[http://localhost:8080](http://localhost:8080)**

### (Optional) Modifying and Building the Project
If you want to edit the source code in the `/src` directory, you can re-build the production assets into the `/dist` directory by running:

```bash
npm install
npm run build
```

---

## Hosting on GitHub Pages

VidGrid includes native support for GitHub Pages hosting, completely bypassing the browser security and directory-listing limitations of static hosts. 

**To deploy your own live example:**
1. Fork or push this repository to your own GitHub account.
2. Place your sample video files into the `dist/videos/` directory and commit them.
3. The included GitHub Actions workflow will automatically trigger. It runs the build script (which safely pre-generates a static JSON playlist manifest of your videos) and publishes the `/dist` directory directly to your `gh-pages` branch.
4. Your grid is now live at `https://[your-username].github.io/[repo-name]/`!

---

## Customizing display with parameters

Customize the player count, grid layout spacing, video aspect ratios, and card rounding directly through URL query strings:

| Parameter | Description | Examples | Default |
| :--- | :--- | :--- | :--- |
| **`videos`** | Total number of player windows to render (capped at a maximum of `32`). | `?videos=1`, `?videos=9`, `?videos=32` | `6` |
| **`aspect`** | Forces aspect ratio on players. Supports presets and custom values. | `?aspect=1:1` (presets: `11`, `43`, `169`), `?aspect=16:9`, `?aspect=2.39:1` | `1:1` |
| **`gutter`** | Gaps between players in pixels. Enforces an equal minimum border padding. | `?gutter=0` (seamless wall), `?gutter=32` | `48` |
| **`corners`** | Border radius in pixels to apply to the video player cards. | `?corners=16`, `?corners=8` | `24` |
| **`unmuting`** | Enables audio in Focus Lightbox mode. Video unmutes on zoom, and mutes on exit. | `?unmuting=true` | `false` |
| **`disable-focus`** | Completely disables the lightbox zoom focus capability, making all players unclickable. | `?disable-focus=true` | `false` |
| **`focus-full`** | Forces the focused player to take up 100% viewport width and height (edge-to-edge), borderless/padding-less with sharp corners. | `?focus-full=true` | `false` |
| **`focus-aspect`** | Configures the focused video to transition to a specific aspect ratio when clicked, instead of maintaining the grid's aspect ratio. Supports presets and custom values. | `?focus-aspect=16:9`, `?focus-aspect=4:5` (presets: `11`, `43`, `169`) | `16:9` |
| **`cursor`** | Sets mouse cursor style on cards. Options: `default`, `pointer`, `crosshair`, or `zoom` (`zoom-in` on grid, `zoom-out` when focused). | `?cursor=zoom`, `?cursor=crosshair` | `pointer` / `zoom-out` legacy mix |

### Configuration Examples

#### Default Configuration (6 players, 1:1 grid aspect, 48px gutter, 24px corners, transitions to 16:9 when focused):
[https://jayholtslander.github.io/vidgrid/](https://jayholtslander.github.io/vidgrid/)
#### Edge-to-Edge full-screen zoom with borderless/padding-less focus:
[https://jayholtslander.github.io/vidgrid/?focus-full=true](https://jayholtslander.github.io/vidgrid/?focus-full=true)
#### Completely disabled focus (non-clickable grid with default cursors):
[https://jayholtslander.github.io/vidgrid/?disable-focus=true](https://jayholtslander.github.io/vidgrid/?disable-focus=true)
#### Widescreen Cinematic Grid (24px spacing, 12px rounded corners):
[https://jayholtslander.github.io/vidgrid/?aspect=16:9&gutter=24&corners=12](https://jayholtslander.github.io/vidgrid/?aspect=16:9&gutter=24&corners=12)
#### Seamless Video Wall (9 Players, no gaps, sharp corners):
[https://jayholtslander.github.io/vidgrid/?gutter=0&corners=0&videos=9](https://jayholtslander.github.io/vidgrid/?gutter=0&corners=0&videos=9)
#### Classic 4:3 TV Grid (4 Players, 16px gutter, sharp corners):
[https://jayholtslander.github.io/vidgrid/?aspect=4:3&gutter=16&corners=0&videos=4](https://jayholtslander.github.io/vidgrid/?aspect=4:3&gutter=16&corners=0&videos=4)
#### Cinematic Grid with Focused Audio (4 Players, 16px gutter, unmuting enabled):
[https://jayholtslander.github.io/vidgrid/?videos=4&aspect=16:9&gutter=16&unmuting=true](https://jayholtslander.github.io/vidgrid/?videos=4&aspect=16:9&gutter=16&unmuting=true)


## Remote Web Server Deployment (Without Python)

Since VidGrid consists of static `index.html`, `styles.css`, and `app.js` files, it can be hosted on any remote web server (Nginx, Apache, Caddy, IIS) without requiring Python.

> [!TIP]
> VidGrid automatically looks for a static `playlist.json` manifest first. If you are deploying to a static host that does not support HTML directory listing (like AWS S3, Vercel, Netlify), simply run `npm run build` locally before uploading your files. This automatically generates a `dist/videos/playlist.json` manifest of your videos, entirely bypassing the need for server-side indexing!

If you prefer **not** to run the build script and want to rely on live auto-discovery (where you just drop MP4s into a folder via FTP and they instantly appear in your grid), your web server **must have directory listing (auto-indexing) enabled** for the `/videos/` folder.

### Directory Listing Configurations

#### 1. Nginx
Enable `autoindex` inside your location block in your Nginx config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/vidgrid;

    location / {
        try_files $uri $uri/ =404;
    }

    # Enable directory listing for the videos folder
    location /videos/ {
        autoindex on;
        autoindex_format html; # Standard HTML list format
    }
}
```

#### 2. Apache
An `.htaccess` file is already included inside your `/videos/` directory containing:

```apache
Options +Indexes
```

#### 3. Caddy
Enable browsing in Caddy's `file_server` directive:

```caddy
yourdomain.com {
    root * /path/to/vidgrid
    file_server browse
}
```

## Running on a Raspberry Pi (Fullscreen Kiosk Mode)

VidGrid is perfect for setting up a dedicated video wall or ambient display using a Raspberry Pi. You can configure it to boot directly into a fullscreen browser, hiding browser bars and the mouse cursor.

### 1. Install Dependencies
Ensure you have the required packages installed for hiding the cursor:

```bash
sudo apt update
sudo apt install xdotool unclutter chromium-browser
```

### 2. Configure Chromium Autostart
Configure your desktop environment to launch Chromium in kiosk mode on startup.

Edit the LXDE autostart configuration:

```bash
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
```
*(Note: If you are using a newer Debian/Raspberry Pi OS with Wayland/Wayfire, add this to your startup scripts instead).*

Add the following configuration lines:

```bash
# Disable screensaver and power management
@xset s off
@xset s noblank
@xset -dpms

# Hide the mouse cursor after 3 seconds of inactivity
@unclutter -idle 3 -root

# Launch Chromium in kiosk mode (pointing to your server)
@chromium-browser --noerrdialogs --disable-infobars --check-for-update-interval=31536000 --kiosk "http://localhost:8080?videos=4&aspect=16:9&gutter=12"
```

### 3. Automatically Serve Files on Boot
You can serve the directory on the Pi by running a lightweight background daemon (like a systemd service running Python's server or Node's `http-server`) on boot.

Create a systemd service:

```bash
sudo nano /etc/systemd/system/vidgrid.service
```

Add the service configuration:

```ini
[Unit]
Description=VidGrid Local Web Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/pi/vidgrid
ExecStart=/usr/bin/python3 -m http.server 8080 --directory dist
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vidgrid.service
sudo systemctl start vidgrid.service
```
Now, whenever the Raspberry Pi boots up, it will start the local HTTP server in the background and open Chromium in fullscreen kiosk mode, displaying your dynamically generated video grid.

## Video Encoding & Performance Guidelines

To prevent CPU/GPU decoding starvation and lag (especially on lower-powered devices like a Raspberry Pi or single-board computer running multiple concurrent players), follow these video optimization guidelines:

* **Resolution Capping**: Limit video files to **720p (1280x720)** or **480p (854x480)**. Since grid layouts partition screen space into smaller cells, high-resolution 1080p or 4K streams waste decoding power on downscaled pixels.
* **H.264 Codec**: Encode files using the **H.264 Baseline** or **Main Profile** (avoid HEVC/H.265 or H.264 High Profile, which demand more intensive processing power).
* **Bitrate Budgeting**: Keep bitrates low—ideally between **500 kbps** and **1500 kbps**.
* **Audio Track Optimization**: 
  - If you are **not** using the `?unmuting=true` layout feature, strip audio tracks entirely from the files (e.g., using `ffmpeg -i input.mp4 -an -c:v copy output.mp4`). This saves substantial network bandwidth and audio decoding overhead.
  - If you *are* using `?unmuting=true`, compress the audio stream to a low-bitrate AAC profile.

## Credits & Citations

The sample animations included in this project are courtesy of **The HAL Project**. 

- **Official Website**: [http://www.halproject.com/](http://www.halproject.com/)
- **Support & Donations**: [https://ko-fi.com/joecreative](https://ko-fi.com/joecreative)

I encourage you to visit The HAL Project to check out his full-resolution 1080p and 4K video downloads, and consider supporting his creative work by donating to his Ko-fi page!

## License

This project is open-sourced under the [MIT License](LICENSE). 

You are free to use, modify, and distribute this software in personal or commercial projects. In accordance with the MIT License, the original copyright notice must be included in any copies or substantial portions of the software. 

If you use VidGrid in your own projects, **I kindly ask that you provide a public credit** (such as a link back to this repository or a mention in your project's README/credits section) so that others can find and benefit from it as well!

*(Note: The sample videos provided in the `samples/` directory are owned by The HAL Project and may be subject to their own respective copyright terms.)*

![Footer](https://capsule-render.vercel.app/api?type=waving&height=100&color=gradient&customColorList=12&section=footer&animation=fadeIn)
