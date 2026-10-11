import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Metadata
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    file_path = Column(String(512), nullable=True)
    report_title = Column(String(255), default="Medical Report")
    patient_name = Column(String(255), default="Alex Smith")
    patient_age = Column(String(50), default="34 years")
    patient_sex = Column(String(50), default="Unknown")
    doctor_name = Column(String(255), default="Dr. Maya Rao")
    lab_name = Column(String(255), default="City Diagnostics")
    report_date = Column(String(100), default="18 June 2025")
    
    # Overall summary
    total_findings = Column(Integer, default=0)
    normal_count = Column(Integer, default=0)
    abnormal_count = Column(Integer, default=0)
    normality_percentage = Column(Float, default=100.0)
    overall_summary_text = Column(Text, nullable=True)
    
    # Status & flags
    is_sample = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=True)
    clinician_signed_off = Column(Boolean, default=False)
    signed_off_by = Column(String(255), nullable=True)
    signed_off_at = Column(DateTime, nullable=True)
    clinician_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    findings = relationship("Finding", back_populates="report", cascade="all, delete-orphan", lazy="selectin")
    flags = relationship("UncertaintyFlag", back_populates="report", cascade="all, delete-orphan", lazy="selectin")
    pages = relationship("ReportPage", back_populates="report", cascade="all, delete-orphan", lazy="selectin")
    trends = relationship("ReportTrend", back_populates="report", cascade="all, delete-orphan", lazy="selectin")

class ReportPage(Base):
    __tablename__ = "report_pages"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(64), ForeignKey("reports.id"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False)
    page_title = Column(String(255), nullable=True)
    extracted_text = Column(Text, nullable=False)
    has_table = Column(Boolean, default=False)
    table_data = Column(JSON, nullable=True)
    
    report = relationship("Report", back_populates="pages")

class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(64), primary_key=True, index=True)
    report_id = Column(String(64), ForeignKey("reports.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="General")
    value = Column(String(100), nullable=False)
    numeric_value = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    reference_range = Column(String(100), nullable=False)
    ref_min = Column(Float, nullable=True)
    ref_max = Column(Float, nullable=True)
    status = Column(String(50), default="Normal")  # Normal, Low, High, Critical
    
    page_number = Column(Integer, default=1)
    position = Column(Float, default=50.0)  # visual position 0-100%
    
    # Traceability & Verification
    matched_quote = Column(Text, nullable=False)
    char_start = Column(Integer, nullable=True)
    char_end = Column(Integer, nullable=True)
    is_exact_match = Column(Boolean, default=True)
    
    # Explanations
    layman_explanation = Column(Text, nullable=True)
    clinical_explanation = Column(Text, nullable=True)
    detail_description = Column(Text, nullable=True)
    is_overridden = Column(Boolean, default=False)
    override_notes = Column(Text, nullable=True)
    
    report = relationship("Report", back_populates="findings")

class UncertaintyFlag(Base):
    __tablename__ = "uncertainty_flags"

    id = Column(String(64), primary_key=True, index=True)
    report_id = Column(String(64), ForeignKey("reports.id"), nullable=False, index=True)
    
    level = Column(String(50), default="Needs context")  # Conflict, Needs context, Missing, Critical
    title = Column(String(255), nullable=False)
    detail = Column(Text, nullable=False)
    sources = Column(JSON, default=list)  # list of strings: ["Page 1 · ...", "Page 3 · ..."]
    suggested_step = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    
    report = relationship("Report", back_populates="flags")

class ReportTrend(Base):
    __tablename__ = "report_trends"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(64), ForeignKey("reports.id"), nullable=False, index=True)
    
    label = Column(String(100), nullable=False)
    tested = Column(Float, nullable=False)
    previous = Column(Float, nullable=True)
    normal_min = Column(Float, nullable=False)
    normal_max = Column(Float, nullable=False)
    chart_min = Column(Float, nullable=False)
    chart_max = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    
    report = relationship("Report", back_populates="trends")
