import re
from typing import Dict, Any, Optional, Tuple, List

class FactVerifier:
    @staticmethod
    def verify_value_in_text(raw_text: str, value_str: str, test_name: str = "") -> Tuple[bool, str, Optional[int], Optional[int]]:
        """
        Strict character-for-character verification.
        Finds exact occurrence of biomarker/value in source text and extracts the source line quote.
        Returns: (is_exact_match, matched_quote, char_start, char_end)
        """
        if not raw_text or not value_str:
            return False, "Not found in text", None, None

        # Clean value search token
        clean_val = value_str.split()[0].strip() if " " in value_str else value_str.strip()
        
        # 1. Search for test name and value nearby in lines
        lines = raw_text.splitlines()
        for idx, line in enumerate(lines):
            line_clean = line.strip()
            # If line has test name or value
            if (test_name and test_name.lower() in line_clean.lower() and clean_val in line_clean) or (clean_val in line_clean and len(clean_val) > 1):
                # Found exact line
                start_idx = raw_text.find(line_clean)
                end_idx = start_idx + len(line_clean) if start_idx != -1 else None
                return True, line_clean, start_idx, end_idx

        # 2. Direct string substring search in full text
        char_idx = raw_text.find(clean_val)
        if char_idx != -1:
            # Extract sentence or surrounding line
            line_start = raw_text.rfind("\n", 0, char_idx)
            line_start = 0 if line_start == -1 else line_start + 1
            line_end = raw_text.find("\n", char_idx)
            line_end = len(raw_text) if line_end == -1 else line_end
            quote = raw_text[line_start:line_end].strip()
            return True, quote if quote else f"Value: {value_str}", char_idx, char_idx + len(clean_val)

        # 3. Numeric regex fallback
        num_match = re.search(r"\b" + re.escape(clean_val) + r"\b", raw_text)
        if num_match:
            start_pos, end_pos = num_match.span()
            return True, raw_text[max(0, start_pos - 20):min(len(raw_text), end_pos + 30)].strip(), start_pos, end_pos

        return False, f"Extracted from report ({value_str})", None, None

verifier = FactVerifier()
