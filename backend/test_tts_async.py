import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

async def main():
    client = genai.Client()
    try:
        response = await client.aio.models.generate_content(
            model="gemini-3.1-flash-tts-preview",
            contents="ඔබේ යාළුවාට තෑගි කරන්න ඔරලෝසුවක් තෝරන එක හරිම හොඳ අදහසක්!",
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
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                print("Got audio async:", part.inline_data.mime_type)
                return
    except Exception as e:
        print(f"Async Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
