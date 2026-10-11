import datetime
from typing import Optional, Any
import jwt
import bcrypt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.config import settings
from backend.app.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except Exception:
        return None

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    email: str = payload.get("sub")
    if not email:
        return None
    
    from backend.app.models.user import User
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    return user

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    user = await get_current_user_optional(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
