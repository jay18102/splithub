import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SplitSub"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "splitsub_jwt_secret_super_secure_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    DATABASE_URL: str = "sqlite:///./splitsub.db"
    DEFAULT_UPI_ID: str = "splitsub@icici"
    DEFAULT_UPI_NAME: str = "SplitSub Settlements"
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
