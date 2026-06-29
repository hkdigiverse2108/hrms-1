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
    # Set expiration to 100 years so tokens do not expire on time
    expire = datetime.utcnow() + timedelta(days=36500)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user_token(authorization: Optional[str] = Header(None)):
    """Verify JWT token (ignoring time expiration) and verify user is active."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]

    try:
        # options={"verify_exp": False} removes token time expiration completely
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session token. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if user is turned inactive in database
        from database import db
        from bson import ObjectId
        user = await db.employees.find_one({"_id": ObjectId(user_id) if len(user_id) == 24 else user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer exists.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if str(user.get("status", "")).lower() == "inactive":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your account has been turned inactive. Access revoked.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Alias: require any authenticated user
require_auth = get_current_user_token

async def require_admin(token_payload: dict = Depends(get_current_user_token)):
    """
    Dependency: Only allow Admin role users.
    Returns 403 Forbidden if the authenticated user is NOT an admin.
    This prevents employees from calling sensitive endpoints even if they
    somehow know the API URL.
    """
    admin_roles = {"admin", "super admin", "superadmin", "administrator", "founder"}
    role = str(token_payload.get("role", "")).lower().strip()
    if role not in admin_roles:
        # Fallback: query database in case token doesn't contain role
        from database import db
        user_id = token_payload.get("sub")
        if user_id:
            from bson import ObjectId
            user = await db.employees.find_one({"_id": ObjectId(user_id) if len(user_id) == 24 else user_id})
            if user and str(user.get("role", "")).lower().strip() in admin_roles:
                return token_payload
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required. You do not have permission to perform this action.",
        )
    return token_payload
