from pydantic import BaseModel
from typing import List, Optional


class Message(BaseModel):
    role: str
    content: str


class CartItem(BaseModel):
    product_id: str
    name: Optional[str] = None
    quantity: int = 1
    price: Optional[float] = None
    size: Optional[str] = None        # chosen variant/weight, e.g. "2KG"
    icing_text: Optional[str] = None


class ChatRequest(BaseModel):
    messages: List[Message]
    cart: Optional[List[CartItem]] = []
    language_preference: Optional[str] = "auto"


class DetectLangRequest(BaseModel):
    text: str


class DetectLangResponse(BaseModel):
    detected_lang: str


class VoiceResponse(BaseModel):
    transcript: str
    transcription: str   # backward-compat alias
    detected_lang: str
    status: str = "success"


class GiftMessageRequest(BaseModel):
    recipient_name: Optional[str] = None
    sender_name: Optional[str] = None
    occasion: Optional[str] = None
    relationship: Optional[str] = None
    items: Optional[List[str]] = None       # product names in the cart, for context
    language: Optional[str] = "auto"        # AUTO | EN | SI | TA
    anonymous: Optional[bool] = False


class GiftMessageResponse(BaseModel):
    message: str
