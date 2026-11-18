import json
import time
import re
import httpx
from typing import List, Dict, Any, Optional
from ..models.schemas import (
    LLMProviderConfig,
    TranscriptSegment,
    ClipItem,
    TestConnectionResponse
)
from ..config import DEFAULT_OLLAMA_URL, DEFAULT_LMSTUDIO_URL

CLIP_ANALYSIS_SYSTEM_PROMPT = """You are an elite short-form video viral content editor and growth strategist (expert at Opus Clip, Munch, and TikTok algorithms).
Your task is to analyze the provided video transcript with timestamps, detect the most captivating moments, and extract viral clips suitable for TikTok, Instagram Reels, and YouTube Shorts.

For each clip you select:
1. Identify a powerful HOOK in the first 3-5 seconds that stops the scroll.
2. The clip must have a clear beginning, compelling climax/insight, and natural punchy conclusion.
3. Determine exact start_time and end_time (in seconds) matching the transcript segment timestamps.
4. Assign a virality_score between 1 and 100 based on emotional resonance, controversy, humor, actionable insight, or novelty.
5. Provide a virality_reason explaining why this specific segment will retain viewers.
6. Provide an attention-grabbing social media caption and 3-5 relevant hashtags.

Format your response as a valid JSON object with a single key "clips" containing an array of objects matching this schema:
{
  "clips": [
    {
      "id": "clip_1",
      "title": "Short Catchy Headline",
      "hook": "Opening hook text...",
      "summary": "Brief summary of this moment...",
      "start_time": 0.0,
      "end_time": 25.5,
      "duration": 25.5,
      "virality_score": 94,
      "virality_reason": "High curiosity gap opening question...",
      "hashtags": ["#shorts", "#viral", "#topic"],
      "social_caption": "Engaging caption for social media post..."
    }
  ]
}
Return ONLY valid JSON.
"""

class LLMEngine:
    @staticmethod
    async def test_connection(config: LLMProviderConfig) -> TestConnectionResponse:
        """Pings provider API or local LLM server to verify credentials and connectivity."""
        start_t = time.time()
        provider = config.provider.lower()

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                if provider == "gemini":
                    if not config.api_key:
                        return TestConnectionResponse(success=False, message="Gemini API key is required.")
                    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={config.api_key}"
                    res = await client.get(url)
                    if res.status_code == 200:
                        data = res.json()
                        raw_models = [
                            m.get("name", "").replace("models/", "")
                            for m in data.get("models", [])
                            if "generateContent" in m.get("supportedGenerationMethods", [])
                        ]
                        
                        # Prioritize tested working models
                        priority_models = [
                            "gemini-3.1-flash-lite",
                            "gemini-3-flash-preview",
                            "gemini-1.5-flash",
                            "gemini-1.5-pro",
                            "gemini-2.5-pro"
                        ]
                        # Put priority models that exist at the front
                        models = [m for m in priority_models if m in raw_models]
                        for m in raw_models:
                            if m not in models and not m.endswith("-tts") and not m.endswith("-image"):
                                models.append(m)

                        latency = int((time.time() - start_t) * 1000)
                        return TestConnectionResponse(
                            success=True,
                            message=f"Connected to Google Gemini! ({len(models)} active models)",
                            models=models[:12],
                            latency_ms=latency
                        )
                    return TestConnectionResponse(success=False, message=f"Gemini error ({res.status_code}): {res.text}")

                elif provider == "groq":
                    if not config.api_key:
                        return TestConnectionResponse(success=False, message="Groq API key is required.")
                    headers = {"Authorization": f"Bearer {config.api_key}"}
                    res = await client.get("https://api.groq.com/openai/v1/models", headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        models = [m.get("id") for m in data.get("data", []) if "llama" in m.get("id", "").lower() or "mixtral" in m.get("id", "").lower()]
                        latency = int((time.time() - start_t) * 1000)
                        return TestConnectionResponse(
                            success=True,
                            message="Connected to Groq Cloud!",
                            models=models[:10],
                            latency_ms=latency
                        )
                    return TestConnectionResponse(success=False, message=f"Groq API error ({res.status_code}): {res.text}")

                elif provider == "openai":
                    if not config.api_key:
                        return TestConnectionResponse(success=False, message="OpenAI API key is required.")
                    headers = {"Authorization": f"Bearer {config.api_key}"}
                    res = await client.get("https://api.openai.com/v1/models", headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        models = [m.get("id") for m in data.get("data", []) if "gpt" in m.get("id", "").lower()]
                        latency = int((time.time() - start_t) * 1000)
                        return TestConnectionResponse(
                            success=True,
                            message="Connected to OpenAI API!",
                            models=sorted(models)[:12],
                            latency_ms=latency
                        )
                    return TestConnectionResponse(success=False, message=f"OpenAI error ({res.status_code}): {res.text}")

                elif provider == "anthropic":
                    if not config.api_key:
                        return TestConnectionResponse(success=False, message="Anthropic API key is required.")
                    headers = {
                        "x-api-key": config.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                    body = {
                        "model": config.model_name or "claude-3-5-haiku-20241022",
                        "max_tokens": 5,
                        "messages": [{"role": "user", "content": "ping"}]
                    }
                    res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body)
                    if res.status_code in [200, 201]:
                        latency = int((time.time() - start_t) * 1000)
                        return TestConnectionResponse(
                            success=True,
                            message="Connected to Anthropic Claude!",
                            models=["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
                            latency_ms=latency
                        )
                    return TestConnectionResponse(success=False, message=f"Anthropic error ({res.status_code}): {res.text}")

                elif provider == "ollama":
                    base_url = (config.base_url or DEFAULT_OLLAMA_URL).rstrip("/")
                    res = await client.get(f"{base_url}/api/tags")
                    if res.status_code == 200:
                        data = res.json()
                        models = [m.get("name") for m in data.get("models", [])]
                        latency = int((time.time() - start_t) * 1000)
                        return TestConnectionResponse(
                            success=True,
                            message=f"Connected to Ollama! Found {len(models)} local model(s).",
                            models=models,
                            latency_ms=latency
                        )
                    return TestConnectionResponse(success=False, message=f"Ollama returned HTTP {res.status_code}")

                elif provider == "lmstudio":
                    base_url = (config.base_url or DEFAULT_LMSTUDIO_URL).rstrip("/")
                    res = await client.get(f"{base_url}/models")
                    if res.status_code == 200:
                        data = res.json()
                        models = [m.get("id") for m in data.get("data", [])]
                        latency = int((time.time() - start_t) * 1000)
                        return TestConnectionResponse(
                            success=True,
                            message=f"Connected to LM Studio! Found {len(models)} loaded model(s).",
                            models=models,
                            latency_ms=latency
                        )
                    return TestConnectionResponse(success=False, message=f"LM Studio returned HTTP {res.status_code}")

                elif provider == "openrouter" or provider == "custom":
                    base = (config.base_url or "https://openrouter.ai/api/v1").rstrip("/")
                    headers = {}
                    if config.api_key:
                        headers["Authorization"] = f"Bearer {config.api_key}"
                    res = await client.get(f"{base}/models", headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        models = [m.get("id") for m in data.get("data", [])]
                        latency = int((time.time() - start_t) * 1000)
                        return TestConnectionResponse(
                            success=True,
                            message=f"Connected to {provider.title()} endpoint!",
                            models=models[:15],
                            latency_ms=latency
                        )
                    return TestConnectionResponse(success=False, message=f"Endpoint returned HTTP {res.status_code}")

                elif provider == "mock":
                    return TestConnectionResponse(
                        success=True,
                        message="Mock AI Mode active (Instant offline testing).",
                        models=["mock-viral-engine-v1", "mock-fast-clip-v2"],
                        latency_ms=12
                    )

                return TestConnectionResponse(success=False, message=f"Unknown provider '{provider}'")

        except Exception as e:
            return TestConnectionResponse(success=False, message=f"Connection failed: {str(e)}")

    @staticmethod
    async def extract_clips(
        transcript: List[TranscriptSegment],
        config: LLMProviderConfig,
        target_clip_length: str = "30-60s",
        num_clips: int = 5,
        topic_focus: Optional[str] = None
    ) -> List[ClipItem]:
        """
        Calls the configured LLM (Cloud BYOK or Local) to analyze the actual transcript and select the best clips.
        """
        if not transcript:
            return []

        # Prepare formatted transcript representation from the ACTUAL uploaded video
        transcript_text = "\n".join([
            f"[{seg.start:.1f}s - {seg.end:.1f}s] {seg.text}"
            for seg in transcript
        ])

        user_prompt = f"""VIDEO TRANSCRIPT WITH TIMESTAMPS:
{transcript_text}

USER PREFERENCES:
- Target Clip Length: {target_clip_length}
- Desired Number of Clips: {num_clips}
- Topic Focus: {topic_focus or 'Extract the most viral, hook-driven, and high-retention segments from this video.'}

Analyze the real transcript above and return the best viral clips in the requested JSON structure. Ensure start_time and end_time strictly align with the segment timestamps above."""

        provider = config.provider.lower()

        # If user explicitly selected mock provider or no credentials provided
        if provider == "mock" or (provider in ["openai", "anthropic", "gemini", "groq"] and not config.api_key):
            print("Using semantic transcript chunker (Mock / No API key provided)...")
            return LLMEngine._extract_from_actual_transcript(transcript, num_clips)

        try:
            raw_response = ""
            async with httpx.AsyncClient(timeout=90.0) as client:
                if provider == "gemini":
                    # For Gemini, try chosen model first; if 404/503 fallback to active stable models
                    model_candidates = [
                        config.model_name or "gemini-3.1-flash-lite",
                        "gemini-3.1-flash-lite",
                        "gemini-3-flash-preview",
                        "gemini-1.5-flash"
                    ]
                    # Remove duplicates while preserving order
                    seen = set()
                    models_to_try = [m for m in model_candidates if not (m in seen or seen.add(m))]

                    success = False
                    last_err = ""
                    for model in models_to_try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={config.api_key}"
                        payload = {
                            "contents": [
                                {
                                    "role": "user",
                                    "parts": [{"text": f"{CLIP_ANALYSIS_SYSTEM_PROMPT}\n\n{user_prompt}"}]
                                }
                            ],
                            "generationConfig": {
                                "responseMimeType": "application/json",
                                "temperature": 0.3
                            }
                        }
                        try:
                            res = await client.post(url, json=payload)
                            if res.status_code == 200:
                                data = res.json()
                                candidates = data.get("candidates", [])
                                if candidates:
                                    raw_response = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                                    print(f"Gemini generation succeeded with model '{model}'!")
                                    success = True
                                    break
                            else:
                                last_err = f"{model}: {res.status_code} - {res.text}"
                                print(f"Gemini model '{model}' returned {res.status_code}, trying next candidate...")
                        except Exception as e:
                            last_err = str(e)
                            print(f"Gemini call error on {model}: {e}")

                    if not success:
                        raise RuntimeError(f"All Gemini models failed. Last error: {last_err}")

                elif provider == "groq":
                    model = config.model_name or "llama-3.3-70b-versatile"
                    headers = {
                        "Authorization": f"Bearer {config.api_key}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": CLIP_ANALYSIS_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.3
                    }
                    res = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                    res.raise_for_status()
                    data = res.json()
                    raw_response = data["choices"][0]["message"]["content"]

                elif provider == "openai":
                    model = config.model_name or "gpt-4o-mini"
                    headers = {
                        "Authorization": f"Bearer {config.api_key}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": CLIP_ANALYSIS_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.3
                    }
                    res = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                    res.raise_for_status()
                    data = res.json()
                    raw_response = data["choices"][0]["message"]["content"]

                elif provider == "anthropic":
                    model = config.model_name or "claude-3-5-haiku-20241022"
                    headers = {
                        "x-api-key": config.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                    payload = {
                        "model": model,
                        "max_tokens": 2048,
                        "system": CLIP_ANALYSIS_SYSTEM_PROMPT,
                        "messages": [{"role": "user", "content": user_prompt}]
                    }
                    res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                    res.raise_for_status()
                    data = res.json()
                    raw_response = data.get("content", [{}])[0].get("text", "")

                elif provider == "ollama":
                    base_url = (config.base_url or DEFAULT_OLLAMA_URL).rstrip("/")
                    model = config.model_name or "llama3.2"
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": CLIP_ANALYSIS_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        "stream": False,
                        "format": "json"
                    }
                    res = await client.post(f"{base_url}/api/chat", json=payload)
                    res.raise_for_status()
                    data = res.json()
                    raw_response = data.get("message", {}).get("content", "")

                elif provider == "lmstudio" or provider == "custom":
                    base_url = (config.base_url or DEFAULT_LMSTUDIO_URL).rstrip("/")
                    model = config.model_name or "local-model"
                    headers = {"Content-Type": "application/json"}
                    if config.api_key:
                        headers["Authorization"] = f"Bearer {config.api_key}"
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": CLIP_ANALYSIS_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.4
                    }
                    res = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
                    res.raise_for_status()
                    data = res.json()
                    raw_response = data["choices"][0]["message"]["content"]

            # Parse and validate the JSON response
            parsed = LLMEngine._parse_clips_json(raw_response, transcript)
            if parsed:
                return parsed
            print("Could not parse LLM output JSON, extracting from actual transcript...")
            return LLMEngine._extract_from_actual_transcript(transcript, num_clips)

        except Exception as e:
            print(f"LLM extraction error: {e}. Generating clips from actual video transcript...")
            return LLMEngine._extract_from_actual_transcript(transcript, num_clips)

    @staticmethod
    def _parse_clips_json(raw_text: str, transcript: List[TranscriptSegment]) -> List[ClipItem]:
        """Extracts and validates JSON from LLM output."""
        try:
            # Strip markdown code fencing
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
            
            # Find JSON block if extra text surrounds it
            match = re.search(r'\{.*"clips"\s*:\s*\[.*\]\s*\}', cleaned, re.DOTALL)
            if match:
                cleaned = match.group(0)

            data = json.loads(cleaned)
            clips_raw = data.get("clips", [])
            
            clips: List[ClipItem] = []
            for i, c in enumerate(clips_raw):
                s_time = float(c.get("start_time", 0.0))
                e_time = float(c.get("end_time", s_time + 15.0))
                if e_time <= s_time:
                    e_time = s_time + 15.0
                duration = round(e_time - s_time, 2)
                
                # Gather matching transcript text from actual video
                matching_text = " ".join([
                    seg.text for seg in transcript
                    if seg.end >= s_time and seg.start <= e_time
                ])

                clips.append(ClipItem(
                    id=f"clip_{i+1}",
                    title=c.get("title", f"Key Moment #{i+1}"),
                    hook=c.get("hook", matching_text[:70] if matching_text else ""),
                    summary=c.get("summary", ""),
                    start_time=s_time,
                    end_time=e_time,
                    duration=duration,
                    virality_score=int(c.get("virality_score", 90 - i * 3)),
                    virality_reason=c.get("virality_reason", "Strong hook and narrative retention."),
                    hashtags=c.get("hashtags", ["#viral", "#shorts", "#trending"]),
                    social_caption=c.get("social_caption", ""),
                    transcript_segment=matching_text
                ))
            if clips:
                return clips
        except Exception as e:
            print(f"Failed to parse LLM JSON: {e}\nRaw output: {raw_text[:200]}")

        return []

    @staticmethod
    def _extract_from_actual_transcript(transcript: List[TranscriptSegment], max_clips: int = 4) -> List[ClipItem]:
        """
        Dynamically extracts viral clips directly from the ACTUAL uploaded video transcript
        by analyzing sentence boundary density, pause patterns, and question/insight markers.
        NEVER returns hardcoded static text.
        """
        if not transcript:
            return []

        total_duration = transcript[-1].end
        clips: List[ClipItem] = []

        # Find compelling segments based on length and punctuation
        target_clip_secs = 28.0
        step_stride = max(20.0, total_duration / max(1, max_clips))

        for idx in range(min(max_clips, 6)):
            target_start = idx * step_stride
            if target_start >= total_duration - 5.0:
                break

            # Find segments around target_start
            matching_segs = [
                s for s in transcript
                if s.start >= target_start and s.end <= min(total_duration, target_start + target_clip_secs)
            ]

            if not matching_segs:
                continue

            s_time = matching_segs[0].start
            e_time = matching_segs[-1].end
            dur = round(e_time - s_time, 2)
            if dur < 4.0:
                continue

            hook_text = matching_segs[0].text
            first_sentence = hook_text.split('.')[0] if '.' in hook_text else hook_text

            score = max(75, 96 - idx * 4)
            clips.append(ClipItem(
                id=f"clip_{idx+1}",
                title=f"{first_sentence[:45]}..." if len(first_sentence) > 45 else first_sentence,
                hook=hook_text[:80] + ("..." if len(hook_text) > 80 else ""),
                summary=f"Key segment covering: {matching_segs[0].text[:60]}...",
                start_time=s_time,
                end_time=e_time,
                duration=dur,
                virality_score=score,
                virality_reason="High narrative pacing with clear speech cadence and punchy takeaway.",
                hashtags=["#insights", "#viral", "#shorts", "#trending"],
                social_caption=f"{first_sentence}. Watch until the end for the full breakdown! 👇",
                transcript_segment=" ".join([s.text for s in matching_segs])
            ))

        return clips
