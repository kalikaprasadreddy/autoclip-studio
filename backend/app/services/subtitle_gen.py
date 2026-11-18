import os
from typing import List, Dict, Any, Optional
from ..models.schemas import SubtitleStyle, TranscriptSegment

def format_ass_time(seconds: float) -> str:
    """Format seconds into ASS timestamp: H:MM:SS.cs"""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds - int(seconds)) * 100))
    if centis >= 100:
        centis = 99
    return f"{hrs}:{mins:02d}:{secs:02d}.{centis:02d}"

def hex_to_ass_color(hex_color: str, alpha: str = "00") -> str:
    """Convert #RRGGBB to ASS &HAABBGGRR format."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 6:
        r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
        return f"&H{alpha}{b}{g}{r}"
    return f"&H{alpha}FFFFFF"

class SubtitleGenerator:
    @staticmethod
    def generate_ass(
        segments: List[TranscriptSegment],
        clip_start: float,
        clip_end: float,
        style: SubtitleStyle,
        output_ass_path: str
    ) -> str:
        """
        Generates an ASS subtitle file tailored to the clip's time range and desired styling.
        """
        # Choose font and styling based on preset
        font_name = "Montserrat"
        primary_color_ass = hex_to_ass_color(style.primary_color)
        highlight_color_ass = hex_to_ass_color(style.highlight_color)
        stroke_color_ass = hex_to_ass_color(style.stroke_color)
        font_size = style.font_size
        bold = -1  # ASS bold is -1 or 1
        outline = 3.5
        shadow = 1.0
        margin_v = 60 if style.position == "bottom" else 180

        if style.preset == "hormozi":
            font_name = "Montserrat"
            primary_color_ass = hex_to_ass_color("#FFFFFF")
            highlight_color_ass = hex_to_ass_color("#FFE600")
            stroke_color_ass = hex_to_ass_color("#000000")
            font_size = max(font_size, 32)
            outline = 4.5
            shadow = 2.0
            margin_v = 75
        elif style.preset == "neon":
            font_name = "Arial"
            primary_color_ass = hex_to_ass_color("#00FFFF")
            highlight_color_ass = hex_to_ass_color("#FF00FF")
            stroke_color_ass = hex_to_ass_color("#1A0033")
            font_size = max(font_size, 28)
            outline = 3.0
            shadow = 3.0
        elif style.preset == "minimal":
            font_name = "Helvetica"
            primary_color_ass = hex_to_ass_color("#FFFFFF")
            stroke_color_ass = hex_to_ass_color("#111827")
            outline = 1.8
            shadow = 0.5
            margin_v = 50

        ass_content = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color_ass},&H000000FF,{stroke_color_ass},&H80000000,{bold},0,0,0,100,100,0,0,1,{outline},{shadow},2,30,30,{margin_v},1
Style: Highlight,{font_name},{font_size + 4},{highlight_color_ass},&H000000FF,{stroke_color_ass},&H80000000,{bold},0,0,0,105,105,0,0,1,{outline + 1},{shadow + 1},2,30,30,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        events = []
        for seg in segments:
            # Check overlap with clip range
            if seg.end < clip_start or seg.start > clip_end:
                continue

            # Check if segment has word-level timestamps
            if seg.words and len(seg.words) > 0 and style.show_karaoke:
                # Group words into chunks of 3-5 words for fast-paced short-form subtitle cards
                chunk_size = 4
                words_in_clip = [w for w in seg.words if w.end >= clip_start and w.start <= clip_end]
                for i in range(0, len(words_in_clip), chunk_size):
                    chunk = words_in_clip[i:i+chunk_size]
                    if not chunk:
                        continue
                    c_start = max(0.0, chunk[0].start - clip_start)
                    c_end = max(c_start + 0.3, chunk[-1].end - clip_start)
                    
                    # For punchy style, highlight current active word or capitalize
                    words_text = " ".join([w.word.upper() if style.uppercase else w.word for w in chunk])
                    start_str = format_ass_time(c_start)
                    end_str = format_ass_time(c_end)
                    events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{words_text}")
            else:
                # Fallback to sentence segment
                s_start = max(0.0, seg.start - clip_start)
                s_end = max(s_start + 0.5, min(clip_end - clip_start, seg.end - clip_start))
                text = seg.text.strip()
                if style.uppercase:
                    text = text.upper()
                start_str = format_ass_time(s_start)
                end_str = format_ass_time(s_end)
                events.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{text}")

        # If no events matched (e.g. slight timestamp mismatch), generate a sample title subtitle
        if not events:
            events.append(f"Dialogue: 0,0:00:00.00,0:00:05.00,Highlight,,0,0,0,,AI CLIP PREVIEW")

        full_ass = ass_content + "\n".join(events) + "\n"
        with open(output_ass_path, "w", encoding="utf-8") as f:
            f.write(full_ass)

        return output_ass_path
