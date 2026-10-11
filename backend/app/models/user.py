import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="patient")  # patient, doctor, clinician, admin
    is_active = Column(Boolean, default=True)
    
    # Doctor specific metadata
    specialty = Column(String(255), nullable=True)
    license_number = Column(String(100), nullable=True)
    hospital_affiliation = Column(String(255), nullable=True)
    
    # Patient specific metadata
    age = Column(Integer, nullable=True)
    blood_group = Column(String(20), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
