import os
import io
import pymupdf
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger("medcorpus.extractor")

class PDFExtractor:
    @staticmethod
    def extract_from_bytes(file_bytes: bytes, file_name: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Extracts structured text, tables, and metadata per page from PDF bytes using PyMuPDF.
        """
        pages_data = []
        doc_metadata = {
            "file_name": file_name,
            "total_pages": 0,
            "title": "Medical Diagnostic Report",
            "author": "",
        }

        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            doc_metadata["total_pages"] = len(doc)
            if doc.metadata:
                if doc.metadata.get("title"):
                    doc_metadata["title"] = doc.metadata.get("title")
                if doc.metadata.get("author"):
                    doc_metadata["author"] = doc.metadata.get("author")

            for page_idx in range(len(doc)):
                page = doc[page_idx]
                page_num = page_idx + 1
                text = page.get_text("text")
                
                # Check for tables using fitz find_tables if available
                table_rows = []
                has_table = False
                try:
                    tabs = page.find_tables()
                    if tabs.tables:
                        has_table = True
                        for tab in tabs.tables:
                            df_table = tab.extract()
                            if df_table:
                                # First row headers
                                headers = [str(h or f"col_{i}").strip() for i, h in enumerate(df_table[0])]
                                for row in df_table[1:]:
                                    row_dict = {}
                                    for i, cell in enumerate(row):
                                        col_name = headers[i] if i < len(headers) else f"col_{i}"
                                        row_dict[col_name] = str(cell or "").strip()
                                    table_rows.append(row_dict)
                except Exception as table_err:
                    logger.debug(f"Table parsing fallback for page {page_num}: {table_err}")

                page_title = f"Report Page {page_num}"
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                if lines:
                    for first_line in lines[:3]:
                        if any(term in first_line.upper() for term in ["COUNT", "PANEL", "PROFILE", "DETAILS", "SUMMARY", "TEST", "PATHOLOGY"]):
                            page_title = first_line[:50]
                            break

                # Horizontal reconstruction of words into true aligned lines
                words = page.get_text("words")
                lines_by_y = {}
                for w in words:
                    y_approx = round(w[1] / 6) * 6
                    lines_by_y.setdefault(y_approx, []).append(w)
                
                horizontal_lines = []
                for y in sorted(lines_by_y.keys()):
                    w_list = sorted(lines_by_y[y], key=lambda x: x[0])
                    horizontal_lines.append(" ".join(w[4] for w in w_list).strip())

                pages_data.append({
                    "page_number": page_num,
                    "page_title": page_title,
                    "extracted_text": text,
                    "horizontal_lines": horizontal_lines,
                    "has_table": has_table or len(table_rows) > 0,
                    "table_data": table_rows
                })


            doc.close()
        except Exception as e:
            logger.error(f"PyMuPDF extraction error: {e}")
            # Text or image fallback
            pages_data.append({
                "page_number": 1,
                "page_title": "Uploaded Document",
                "extracted_text": f"Extracted from {file_name}. File contains binary content or scanned format.",
                "has_table": False,
                "table_data": []
            })
            doc_metadata["total_pages"] = 1

        return pages_data, doc_metadata

extractor = PDFExtractor()
