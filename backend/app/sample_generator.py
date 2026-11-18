import os
import subprocess
from pathlib import Path
from .config import FFMPEG_BIN, UPLOADS_DIR

SAMPLE_VIDEO_PATH = UPLOADS_DIR / "sample_podcast.mp4"

class SampleGenerator:
    @staticmethod
    def ensure_sample_video() -> str:
        """
        Creates or returns a high-quality demonstration 16:9 video (~36 seconds)
        for instant testing of the AI clipping and reframing pipeline.
        """
        if SAMPLE_VIDEO_PATH.exists() and os.path.getsize(SAMPLE_VIDEO_PATH) > 10000:
            return str(SAMPLE_VIDEO_PATH)

        print("Generating demo video with FFmpeg testsrc2...")
        cmd = [
            FFMPEG_BIN, "-y",
            "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30:duration=36",
            "-f", "lavfi", "-i", "sine=f=440:beep_factor=4:duration=36",
            "-c:v", "libx264", "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-shortest",
            str(SAMPLE_VIDEO_PATH)
        ]

        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            print("Demo video generated successfully!")
            return str(SAMPLE_VIDEO_PATH)
        except Exception as e:
            print(f"Error creating demo video: {e}")
            minimal_cmd = [
                FFMPEG_BIN, "-y",
                "-f", "lavfi", "-i", "color=c=#1e1b4b:s=1920x1080:d=36",
                "-f", "lavfi", "-i", "sine=f=500:d=36",
                "-c:v", "libx264", "-c:a", "aac", "-shortest",
                str(SAMPLE_VIDEO_PATH)
            ]
            subprocess.run(minimal_cmd, capture_output=True)
            return str(SAMPLE_VIDEO_PATH)
