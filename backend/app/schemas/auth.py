from typing import Optional
from pydantic import BaseModel, EmailStr

class UserRegisterRequest(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    password: str
    role: Optional[str] = "patient" # "patient" or "doctor"
    specialty: Optional[str] = None
    license_number: Optional[str] = None
    hospital_affiliation: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None # Optional role verification ("patient" or "doctor")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: Optional[str] = None
    role: str
    is_active: bool
    specialty: Optional[str] = None
    license_number: Optional[str] = None
    hospital_affiliation: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None

    class Config:
        from_attributes = True

TokenResponse.model_rebuild()
