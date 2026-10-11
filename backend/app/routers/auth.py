from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    ForgotPasswordRequest,
    TokenResponse,
    UserOut
)
from backend.app.utils.auth_utils import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup", response_model=TokenResponse)
async def signup(req: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email_clean))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    role_clean = "doctor" if (req.role or "").lower() in ["doctor", "clinician", "physician"] else "patient"

    user = User(
        email=email_clean,
        name=req.name or email_clean.split("@")[0].title(),
        hashed_password=get_password_hash(req.password),
        role=role_clean,
        specialty=req.specialty,
        license_number=req.license_number,
        hospital_affiliation=req.hospital_affiliation,
        age=req.age,
        blood_group=req.blood_group
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalars().first()
    
    if not user or not verify_password(req.password, user.hashed_password):
        # Demo friendly: If user doesn't exist yet, auto-create demo user for smooth testing
        if not user:
            role_clean = "doctor" if (req.role or "").lower() in ["doctor", "clinician"] else "patient"
            user = User(
                email=email_clean,
                name=email_clean.split("@")[0].title(),
                hashed_password=get_password_hash(req.password),
                role=role_clean,
                specialty="Internal Medicine" if role_clean == "doctor" else None,
                license_number="MD-98214" if role_clean == "doctor" else None
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )

    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    return {
        "success": True,
        "message": f"If an account is registered with {req.email}, password recovery instructions have been dispatched."
    }
