import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import google.auth.transport.requests

# Environment variables for OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
# The redirect URI must exactly match what is registered in the Google Cloud Console
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/google/callback")
SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_client_config():
    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "project_id": "hrms-calendar-integration",  # Placeholder, not strictly required for flow
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uris": [REDIRECT_URI]
        }
    }

import urllib.parse
import requests

def get_authorization_url(state: str):
    """
    Generates the Google OAuth authorization URL manually to avoid stateful PKCE issues.
    The state parameter is typically the employee ID so we know who logged in.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise ValueError("Google Client ID and Secret are not configured.")
        
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'response_type': 'code',
        'scope': ' '.join(SCOPES),
        'access_type': 'offline',
        'include_granted_scopes': 'true',
        'prompt': 'consent',
        'state': state
    }
    return "https://accounts.google.com/o/oauth2/auth?" + urllib.parse.urlencode(params)

def fetch_tokens(code: str, state: str):
    """
    Exchanges the authorization code for access and refresh tokens.
    """
    data = {
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code'
    }
    response = requests.post('https://oauth2.googleapis.com/token', data=data)
    if not response.ok:
        raise Exception(f"Failed to fetch tokens from Google: {response.text}")
        
    tokens = response.json()
    
    return {
        "access_token": tokens.get('access_token'),
        "refresh_token": tokens.get('refresh_token'),
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "scopes": SCOPES
    }

def get_credentials(token_data: dict):
    """
    Returns a tuple of (google.oauth2.credentials.Credentials, updated_token_dict_or_None).
    If the token was refreshed, the second element contains the updated token data
    that should be persisted back to the database.
    """
    if not token_data:
        return None, None
        
    creds = Credentials(
        token=token_data.get('access_token'),
        refresh_token=token_data.get('refresh_token'),
        token_uri=token_data.get('token_uri', 'https://oauth2.googleapis.com/token'),
        client_id=token_data.get('client_id', GOOGLE_CLIENT_ID),
        client_secret=token_data.get('client_secret', GOOGLE_CLIENT_SECRET),
        scopes=token_data.get('scopes', SCOPES)
    )
    
    # Refresh the token if it has expired
    refreshed_token_data = None
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(google.auth.transport.requests.Request())
        # Build updated token data to persist back to database
        refreshed_token_data = {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": list(creds.scopes) if creds.scopes else SCOPES
        }
        
    return creds, refreshed_token_data
