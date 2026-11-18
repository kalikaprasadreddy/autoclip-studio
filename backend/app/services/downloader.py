import os
import uuid
import re
from pathlib import Path
from typing import Dict, Any, Optional
import yt_dlp

from ..config import UPLOADS_DIR, FFMPEG_BIN, FFPROBE_BIN
from .video_processor import VideoProcessor

class VideoDownloader:
    @staticmethod
    def download_url(url: str) -> Dict[str, Any]:
        """
        Downloads a video from a YouTube link or any public URL using yt-dlp.
        Saves into UPLOADS_DIR and extracts video metadata.
        """
        url = url.strip()
        if not url:
            raise ValueError("URL cannot be empty")

        video_id = str(uuid.uuid4())[:8]
        out_template = str(UPLOADS_DIR / f"{video_id}_%(title).50s.%(ext)s")

        # Configure yt-dlp options
        ffmpeg_dir = os.path.dirname(FFMPEG_BIN) if os.path.isabs(FFMPEG_BIN) else None
        if not ffmpeg_dir:
            ffmpeg_dir = "/home/ram-chandra/.gemini/antigravity/bin"

        ydl_opts = {
            # Prefer 1080p or 720p mp4 for smooth browser playback & fast processing
            'format': 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': out_template,
            'ffmpeg_location': ffmpeg_dir,
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'max_filesize': 500 * 1024 * 1024, # 500MB safety limit
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=True)
            except Exception as e:
                # If bestvideo format fails, retry with any available single format
                fallback_opts = {
                    'format': 'best',
                    'outtmpl': out_template,
                    'ffmpeg_location': ffmpeg_dir,
                    'quiet': True,
                    'noplaylist': True,
                }
                with yt_dlp.YoutubeDL(fallback_opts) as fydl:
                    info = fydl.extract_info(url, download=True)

        # Locate downloaded file on disk
        target_file = None
        for file in UPLOADS_DIR.iterdir():
            if file.name.startswith(video_id):
                target_file = file
                break

        if not target_file or not target_file.exists():
            raise RuntimeError("Downloaded video file could not be located on disk.")

        # Probe video metadata using FFprobe
        meta = VideoProcessor.get_video_info(str(target_file))
        raw_title = info.get("title", target_file.name)
        # Clean title
        clean_title = re.sub(r'[\\/*?:"<>|]', "", raw_title)

        return {
            "id": video_id,
            "filename": f"{clean_title}.mp4",
            "file_path": str(target_file),
            "duration": meta["duration"],
            "width": meta["width"],
            "height": meta["height"],
            "fps": meta["fps"],
            "size_bytes": target_file.stat().st_size,
            "has_audio": meta["has_audio"],
            "url": f"/media/uploads/{target_file.name}",
            "transcript": []
        }
