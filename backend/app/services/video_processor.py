import asyncio
import json
import os
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional
from ..config import FFMPEG_BIN, FFPROBE_BIN, CLIPS_DIR, RENDERS_DIR, AUDIO_DIR

class VideoProcessor:
    @staticmethod
    def get_video_info(file_path: str) -> Dict[str, Any]:
        """Runs ffprobe to extract rich metadata about the video."""
        cmd = [
            FFPROBE_BIN,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            probe = json.loads(result.stdout)
            
            video_stream = next((s for s in probe.get("streams", []) if s.get("codec_type") == "video"), None)
            audio_stream = next((s for s in probe.get("streams", []) if s.get("codec_type") == "audio"), None)
            
            format_info = probe.get("format", {})
            duration = float(format_info.get("duration", 0.0))
            if duration == 0.0 and video_stream:
                duration = float(video_stream.get("duration", 0.0))
                
            width = int(video_stream.get("width", 1920)) if video_stream else 1920
            height = int(video_stream.get("height", 1080)) if video_stream else 1080
            
            # FPS calculation
            fps = 30.0
            if video_stream and "r_frame_rate" in video_stream:
                r_fr = video_stream["r_frame_rate"]
                if "/" in r_fr:
                    num, den = r_fr.split("/")
                    if float(den) > 0:
                        fps = round(float(num) / float(den), 2)
                else:
                    fps = float(r_fr)

            size_bytes = int(format_info.get("size", os.path.getsize(file_path) if os.path.exists(file_path) else 0))

            return {
                "duration": duration,
                "width": width,
                "height": height,
                "fps": fps,
                "size_bytes": size_bytes,
                "has_audio": audio_stream is not None,
                "codec": video_stream.get("codec_name", "unknown") if video_stream else "unknown"
            }
        except Exception as e:
            print(f"Error probing video {file_path}: {e}")
            # fallback defaults
            return {
                "duration": 30.0,
                "width": 1920,
                "height": 1080,
                "fps": 30.0,
                "size_bytes": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
                "has_audio": True,
                "codec": "h264"
            }

    @staticmethod
    def extract_audio(video_path: str, output_wav_path: str) -> bool:
        """Extracts 16kHz mono audio stream optimized for speech-to-text models."""
        cmd = [
            FFMPEG_BIN,
            "-y",
            "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            output_wav_path
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True)
            return res.returncode == 0
        except Exception as e:
            print(f"Error extracting audio: {e}")
            return False

    @staticmethod
    def detect_silences(video_path: str, noise_threshold: str = "-30dB", min_duration: float = 0.6) -> List[Dict[str, float]]:
        """Detects periods of silence in the video audio using silencedetect filter."""
        cmd = [
            FFMPEG_BIN,
            "-i", video_path,
            "-af", f"silencedetect=noise={noise_threshold}:d={min_duration}",
            "-f", "null",
            "-"
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True)
            stderr = res.stderr
            silences = []
            current_start = None
            for line in stderr.splitlines():
                if "silence_start:" in line:
                    parts = line.split("silence_start:")
                    if len(parts) > 1:
                        try:
                            current_start = float(parts[1].strip().split()[0])
                        except ValueError:
                            pass
                elif "silence_end:" in line and current_start is not None:
                    parts = line.split("silence_end:")
                    if len(parts) > 1:
                        try:
                            end = float(parts[1].strip().split()[0])
                            silences.append({"start": current_start, "end": end, "duration": round(end - current_start, 2)})
                            current_start = None
                        except ValueError:
                            pass
            return silences
        except Exception as e:
            print(f"Error detecting silences: {e}")
            return []

    @staticmethod
    async def render_clip(
        video_path: str,
        output_path: str,
        start_time: float,
        end_time: float,
        aspect_ratio: str = "9:16",
        crop_mode: str = "crop_center",
        subtitle_file: Optional[str] = None,
        remove_silence: bool = False
    ) -> bool:
        """
        Renders a trimmed, reframed, and captioned clip using FFmpeg.
        """
        duration = max(0.5, end_time - start_time)
        filter_complex_parts = []
        
        # Build Video Filter Chain
        vf_filters = []

        # Aspect ratio conversion & cropping
        if aspect_ratio == "9:16":
            if crop_mode == "blur_background":
                # Blurred background + sharp centered foreground
                # scale background to fill 1080x1920 and blur, scale foreground to fit inside 1080x1920
                filter_str = (
                    f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=20[bg];"
                    f"[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
                    f"[bg][fg]overlay=(W-w)/2:(H-h)/2[vframed]"
                )
                filter_complex_parts.append(filter_str)
                vf_source = "[vframed]"
            elif crop_mode == "fit":
                # Pillarbox / letterbox with black bars
                vf_filters.append("scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black")
                vf_source = None
            else:
                # Default "crop_center": smart center crop to 9:16
                vf_filters.append("crop=ih*(9/16):ih:(iw-ih*(9/16))/2:0,scale=1080:1920:flags=lanczos")
                vf_source = None
        elif aspect_ratio == "1:1":
            if crop_mode == "blur_background":
                filter_str = (
                    f"[0:v]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,gblur=sigma=20[bg];"
                    f"[0:v]scale=1080:1080:force_original_aspect_ratio=decrease[fg];"
                    f"[bg][fg]overlay=(W-w)/2:(H-h)/2[vframed]"
                )
                filter_complex_parts.append(filter_str)
                vf_source = "[vframed]"
            else:
                vf_filters.append("crop=ih:ih:(iw-ih)/2:0,scale=1080:1080:flags=lanczos")
                vf_source = None
        else:
            # 16:9 standard landscape
            vf_filters.append("scale=1920:1080:flags=lanczos")
            vf_source = None

        # Subtitle burning
        if subtitle_file and os.path.exists(subtitle_file):
            escaped_sub_path = subtitle_file.replace("\\", "/").replace(":", "\\:")
            # Use subtitles or ass filter
            sub_filter = f"subtitles='{escaped_sub_path}'"
            vf_filters.append(sub_filter)

        cmd = [
            FFMPEG_BIN,
            "-y",
            "-ss", f"{start_time:.3f}",
            "-t", f"{duration:.3f}",
            "-i", video_path
        ]

        if filter_complex_parts:
            # If we used complex filter for background blur
            last_part = filter_complex_parts[-1]
            if vf_filters:
                filter_complex_parts.append(f"{vf_source}{','.join(vf_filters)}[finalv]")
                map_v = "[finalv]"
            else:
                map_v = "[vframed]"
            
            cmd.extend([
                "-filter_complex", ";".join(filter_complex_parts),
                "-map", map_v,
                "-map", "0:a?"
            ])
        else:
            if vf_filters:
                cmd.extend(["-vf", ",".join(vf_filters)])

        cmd.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            output_path
        ])

        print(f"Executing FFmpeg render command: {' '.join(cmd)}")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            print(f"FFmpeg render failed with code {proc.returncode}:\n{stderr.decode('utf-8', errors='ignore')}")
            # Try a graceful fallback without complex filters if failed
            fallback_cmd = [
                FFMPEG_BIN, "-y",
                "-ss", f"{start_time:.3f}",
                "-t", f"{duration:.3f}",
                "-i", video_path,
                "-c:v", "libx264", "-preset", "ultrafast",
                "-c:a", "aac",
                "-movflags", "+faststart",
                output_path
            ]
            fb_proc = await asyncio.create_subprocess_exec(*fallback_cmd)
            await fb_proc.communicate()
            return fb_proc.returncode == 0

        return True
