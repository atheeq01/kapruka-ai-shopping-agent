from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    icing_text: Optional[str] = None

class Recipient(BaseModel):
    name: str
    phone: str

class Delivery(BaseModel):
    address: str
    city: str
    location_type: str = "house"
    date: str  # YYYY-MM-DD
    instructions: Optional[str] = None

class CreateOrderInput(BaseModel):
    cart: List[CartItem] = Field(max_length=30)
    recipient: Recipient
    delivery: Delivery
    sender: Dict[str, Any]
    gift_message: Optional[str] = Field(None, max_length=300)
    currency: str = "LKR"

class SearchProductsInput(BaseModel):
    query: str
    category: Optional[str] = None
    limit: int = 10

class GetProductInput(BaseModel):
    product_id: str

class CheckDeliveryInput(BaseModel):
    city: str
    date: str
