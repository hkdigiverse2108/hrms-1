from datetime import datetime, timedelta
import os
from typing import Optional, Any
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status, Header
from passlib.context import CryptContext
import passlib.handlers.bcrypt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-very-secure-fallback-secret-key-change-this-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user_token(authorization: Optional[str] = Header(None)):
    """Verify JWT token and return payload. Raises 401 if missing/invalid."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not authorization or not authorization.startswith("Bearer "):
        raise credentials_exception

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception

# Alias: require any authenticated user
require_auth = get_current_user_token

async def require_admin(token_payload: dict = Depends(get_current_user_token)):
    """
    Dependency: Only allow Admin role users.
    Returns 403 Forbidden if the authenticated user is NOT an admin.
    This prevents employees from calling sensitive endpoints even if they
    somehow know the API URL.
    """
    role = str(token_payload.get("role", "")).lower()
    if role != "admin":
        # Fallback: query database in case token doesn't contain role
        from database import db
        user_id = token_payload.get("sub")
        if user_id:
            from bson import ObjectId
            user = await db.employees.find_one({"_id": ObjectId(user_id) if len(user_id) == 24 else user_id})
            if user and str(user.get("role", "")).lower() == "admin":
                return token_payload
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required. You do not have permission to perform this action.",
        )
    return token_payload
