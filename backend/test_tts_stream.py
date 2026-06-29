import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types
import time

load_dotenv()

async def main():
    client = genai.Client()
    start_time = time.time()
    try:
        response_stream = await client.aio.models.generate_content_stream(
            model="gemini-3.1-flash-tts-preview",
            contents="ඔබේ යාළුවාට තෑගි කරන්න ඔරලෝසුවක් තෝරන එක හරිම හොඳ අදහසක්! ඔහුට ගැලපෙනම තෑග්ගක් තෝරගන්න මට උදව් කරන්න පුළුවන්. ඔහුගේ කැමැත්තට ගැලපෙන විවිධ වර්ගයේ ඔරලෝසු සොයාගන්න මම උදව් කරන්නම්. ඒ සඳහා මම මේ දැන් පවතින ඔරලෝසු වර්ග ටිකක් සොයා බලන්නද? එසේම, ඔහු සඳහා යම් විශේෂිත බජට් එකක් (budget) හෝ ඔහු කැමති විලාසිතාවක් (උදාහරණයක් ලෙස: leather strap, metal, sport watch) තිබේද? ඔබ ඒ ගැන කිව්වොත් මට වඩාත් හොඳින් ඔබට උදව් කරන්න පුළුවන්.",
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name="Aoede",
                        )
                    )
                )
            )
        )
        async for chunk in response_stream:
            for part in chunk.candidates[0].content.parts:
                if part.inline_data:
                    print(f"Got chunk at {time.time() - start_time:.2f}s, size: {len(part.inline_data.data)}")
    except Exception as e:
        print(f"Async Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
