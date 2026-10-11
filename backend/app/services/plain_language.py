from typing import Dict, Any, Optional
from backend.app.services.ai_client import ai_client

DICTIONARY: Dict[str, Dict[str, Dict[str, str]]] = {
    "vitamin": {
        "English": {
            "layman": "Vitamin D supports bone and muscle health. A result below the report’s expected range may be worth discussing with a healthcare professional.",
            "clinical": "Serum 25-hydroxyvitamin D is below the laboratory reference interval. Interpret alongside symptoms, history, and clinician assessment."
        },
        "Hindi": {
            "layman": "विटामिन D हड्डियों और मांसपेशियों के स्वास्थ्य में मदद करता है। कम स्तर के बारे में स्वास्थ्य विशेषज्ञ से चर्चा करें।",
            "clinical": "सीरम 25-हाइड्रॉक्सीविटामिन D प्रयोगशाला संदर्भ सीमा से कम है। नैदानिक संदर्भ के साथ मूल्यांकन आवश्यक है।"
        },
        "Kannada": {
            "layman": "ವಿಟಮಿನ್ D ಮೂಳೆ ಮತ್ತು ಸ್ನಾಯುಗಳ ಆರೋಗ್ಯಕ್ಕೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಕಡಿಮೆ ಮಟ್ಟದ ಬಗ್ಗೆ ವೈದ್ಯರೊಂದಿಗೆ ಚರ್ಚಿಸಿ.",
            "clinical": "ಸೀರಮ್ 25-ಹೈಡ್ರಾಕ್ಸಿವಿಟಮಿನ್ D ಪ್ರಯೋಗಾಲಯದ ಉಲ್ಲೇಖ ಶ್ರೇಣಿಗಿಂತ ಕಡಿಮೆಯಾಗಿದೆ. ಕ್ಲಿನಿಕಲ್ ಮೌಲ್ಯಮಾಪನ ಅಗತ್ಯ."
        },
        "Spanish": {
            "layman": "La vitamina D ayuda a la salud de los huesos y músculos. Conviene comentar un nivel bajo con un profesional de salud.",
            "clinical": "La 25-hidroxivitamina D sérica está por debajo del intervalo de referencia del laboratorio. Se recomienda correlación clínica."
        },
        "French": {
            "layman": "La vitamine D soutient la santé des os et des muscles. Un résultat en dessous de la normale mérite d'être abordé avec un médecin.",
            "clinical": "Le taux sérique de 25-hydroxyvitamine D est inférieur à l'intervalle de référence du laboratoire."
        },
        "German": {
            "layman": "Vitamin D unterstützt die Knochen- und Muskelgesundheit. Besprechen Sie niedrige Werte mit Ihrem Arzt.",
            "clinical": "Serum-25-Hydroxyvitamin D liegt unter dem Referenzintervall des Labors. Klinische Korrelation erforderlich."
        }
    },
    "hemoglobin": {
        "English": {
            "layman": "Hemoglobin carries oxygen through your blood. A value inside the report’s range is generally not marked abnormal by the laboratory.",
            "clinical": "Hemoglobin concentration falls within the laboratory-defined reference interval. Correlate with red-cell indices and clinical context."
        },
        "Hindi": {
            "layman": "हीमोग्लोबिन रक्त में ऑक्सीजन पहुंचाता है। रिपोर्ट की सामान्य सीमा में परिणाम को प्रयोगशाला असामान्य नहीं मानती।",
            "clinical": "हीमोग्लोबिन सांद्रता प्रयोगशाला संदर्भ सीमा के भीतर है। अन्य रक्त संकेतकों के साथ मूल्यांकन करें।"
        },
        "Kannada": {
            "layman": "ಹೀಮೋಗ್ಲೋಬಿನ್ ರಕ್ತದಲ್ಲಿ ಆಮ್ಲಜನಕವನ್ನು ಸಾಗಿಸುತ್ತದೆ. ವರದಿಯ ಸಾಮಾನ್ಯ ಶ್ರೇಣಿಯಲ್ಲಿರುವ ಮೌಲ್ಯವನ್ನು ಅಸಹಜ ಎಂದು ಗುರುತಿಸಲಾಗುವುದಿಲ್ಲ.",
            "clinical": "ಹೀಮೋಗ್ಲೋಬಿನ್ ಸಾಂದ್ರತೆಯು ಪ್ರಯೋಗಾಲಯದ ಉಲ್ಲೇಖ ಶ್ರೇಣಿಯಲ್ಲಿದೆ. ಇತರ ರಕ್ತ ಸೂಚ್ಯಂಕಗಳೊಂದಿಗೆ ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ."
        },
        "Spanish": {
            "layman": "La hemoglobina transporta oxígeno en la sangre. Un valor dentro del rango del informe no suele marcarse como anormal.",
            "clinical": "La concentración de hemoglobina está dentro del intervalo de referencia del laboratorio. Correlacionar con índices eritrocitarios."
        },
        "French": {
            "layman": "L'hémoglobine transporte l'oxygène dans le sang. Une valeur normale reflète une bonne oxygénation des tissus.",
            "clinical": "Concentration d'hémoglobine dans les limites physiologiques de référence du laboratoire."
        },
        "German": {
            "layman": "Hämoglobin transportiert Sauerstoff im Blut. Ein Wert im Normbereich zeigt eine ausreichende Sauerstoffversorgung.",
            "clinical": "Hämoglobinkonzentration liegt im physiologischen Referenzbereich des Labors."
        }
    },
    "glucose": {
        "English": {
            "layman": "Glucose is the main sugar your body uses for energy. Whether a result is expected can depend on whether the sample was taken while fasting.",
            "clinical": "Interpret plasma glucose against the stated fasting or non-fasting reference interval and confirm specimen conditions."
        },
        "Hindi": {
            "layman": "ग्लूकोज़ शरीर की मुख्य ऊर्जा शर्करा है। परिणाम का अर्थ इस बात पर निर्भर कर सकता है कि नमूना खाली पेट लिया गया था या नहीं।",
            "clinical": "प्लाज़्मा ग्लूकोज़ को उपवास स्थिति और प्रयोगशाला संदर्भ सीमा के अनुसार समझें।"
        },
        "Kannada": {
            "layman": "ಗ್ಲೂಕೋಸ್ ದೇಹದ ಮುಖ್ಯ ಶಕ್ತಿಯ ಸಕ್ಕರೆ. ಮಾದರಿಯನ್ನು ಉಪವಾಸದಲ್ಲಿ ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆಯೇ ಎಂಬುದರ ಮೇಲೆ ಫಲಿತಾಂಶ ಅವಲಂಬಿಸಬಹುದು.",
            "clinical": "ಪ್ಲಾಸ್ಮಾ ಗ್ಲೂಕೋಸ್ ಅನ್ನು ಉಪವಾಸ ಸ್ಥಿತಿ ಮತ್ತು ಪ್ರಯೋಗಾಲಯದ ಉಲ್ಲೇಖ ಶ್ರೇಣಿಯೊಂದಿಗೆ ಅರ್ಥೈಸಿ."
        },
        "Spanish": {
            "layman": "La glucosa es el azúcar principal que el cuerpo usa como energía. El resultado depende de si la muestra fue tomada en ayunas.",
            "clinical": "Interpretar la glucosa plasmática según el estado de ayuno y el intervalo de referencia indicado."
        },
        "French": {
            "layman": "Le glucose est la principale source d'énergie du corps. Sa valeur normale dépend du jeûne lors du prélèvement.",
            "clinical": "Glycémie plasmatique à interpréter selon le statut à jeun et l'intervalle de référence."
        },
        "German": {
            "layman": "Glukose ist der wichtigste Energieträger. Der Normalwert hängt davon ab, ob Sie nüchtern waren.",
            "clinical": "Nüchternglukose-Konzentration im Plasma im Rahmen des Referenzintervalls."
        }
    },
    "tsh": {
        "English": {
            "layman": "Thyroid stimulating hormone (TSH) controls how fast your body burns energy. A level in the normal range suggests a balanced thyroid.",
            "clinical": "Serum TSH level reflecting pituitary-thyroid axis regulation within reference parameters."
        },
        "Hindi": {
            "layman": "टी.एस.एच (TSH) थायरॉयड ग्रंथि को नियंत्रित करता है। सामान्य स्तर संतुलित थायरॉयड कार्यप्रणाली को दर्शाता है।",
            "clinical": "सीरम टीएसएच पिट्यूटरी-थायरॉयड अक्ष के सामान्य संदर्भ में है।"
        },
        "Kannada": {
            "layman": "ಟಿಎಸ್‌ಎಚ್ ಥೈರಾಯ್ಡ್ ಗ್ರಂಥಿಯನ್ನು ನಿಯಂತ್ರಿಸುತ್ತದೆ. ಸಾಮಾನ್ಯ ಮಟ್ಟವು ಸಮತೋಲಿತ ಥೈರಾಯ್ಡ್ ಕಾರ್ಯವನ್ನು ಸೂಚಿಸುತ್ತದೆ.",
            "clinical": "ಸೀರಮ್ ಟಿಎಸ್ಎಚ್ ಪಿಟ್ಯುಟರಿ-ಥೈರಾಯ್ಡ್ ಅಕ್ಷದ ಸಾಮಾನ್ಯ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ."
        },
        "Spanish": {
            "layman": "La hormona estimulante de la tiroides (TSH) regula el metabolismo. Un nivel normal indica buen equilibrio tiroideo.",
            "clinical": "TSH sérica dentro de los parámetros de regulación tiroidea."
        },
        "French": {
            "layman": "La TSH régule le fonctionnement de votre glande thyroïde. Un taux normal indique un bon équilibre métabolique.",
            "clinical": "TSH sérique dans les limites de l'axe thyréotrope normal."
        },
        "German": {
            "layman": "TSH steuert die Schilddrüsenfunktion. Ein Wert im Normbereich zeigt eine ausgeglichene Stoffwechsellage.",
            "clinical": "Serum-TSH im Rahmen der physiologischen Regelung der Schilddrüsenachse."
        }
    },
    "general": {
        "English": {
            "layman": "This wording describes a medical result. Compare the value with the range printed on the report and ask a healthcare professional what it means for you.",
            "clinical": "Interpret the reported finding using its stated unit, laboratory reference interval, specimen conditions, and relevant clinical context."
        },
        "Hindi": {
            "layman": "यह शब्दावली एक चिकित्सा परिणाम बताती है। रिपोर्ट की सीमा से मूल्य की तुलना करें और स्वास्थ्य विशेषज्ञ से इसका अर्थ पूछें।",
            "clinical": "दिए गए परिणाम को इकाई, प्रयोगशाला संदर्भ सीमा और नैदानिक संदर्भ के साथ समझें।"
        },
        "Kannada": {
            "layman": "ಈ ಪದಗಳು ವೈದ್ಯಕೀಯ ಫಲಿತಾಂಶವನ್ನು ವಿವರಿಸುತ್ತವೆ. ವರದಿಯ ಶ್ರೇಣಿಯೊಂದಿಗೆ ಮೌಲ್ಯವನ್ನು ಹೋಲಿಸಿ ಮತ್ತು ವೈದ್ಯರನ್ನು ಕೇಳಿ.",
            "clinical": "ವರದಿ ಮಾಡಿದ ಫಲಿತಾಂಶವನ್ನು ಘಟಕ, ಪ್ರಯೋಗಾಲಯದ ಉಲ್ಲೇಖ ಶ್ರೇಣಿ ಮತ್ತು ಕ್ಲಿನಿಕಲ್ ಸಂದರ್ಭದೊಂದಿಗೆ ಅರ್ಥೈಸಿ."
        },
        "Spanish": {
            "layman": "Este texto describe un resultado médico. Compara el valor con el rango del informe y consulta su significado con un profesional.",
            "clinical": "Interpretar el hallazgo según su unidad, intervalo de referencia, condiciones de la muestra y contexto clínico."
        },
        "French": {
            "layman": "Ce terme décrit un résultat médical. Comparez la valeur à l'intervalle de référence du laboratoire et consultez votre médecin.",
            "clinical": "Interprétation du biomarqueur selon l'intervalle de référence et le contexte clinique."
        },
        "German": {
            "layman": "Dieser Begriff beschreibt einen medizinischen Befund. Vergleichen Sie den Wert mit dem Laborreferenzbereich.",
            "clinical": "Interpretation des Laborparameters anhand des Referenzbereichs und der klinischen Anamnese."
        }
    }
}

class PlainLanguageService:
    @staticmethod
    def identify_topic(text: str) -> str:
        norm = text.lower()
        if any(w in norm for w in ["vitamin", "25-oh", "hydroxyvitamin"]):
            return "vitamin"
        if any(w in norm for w in ["hemoglobin", "haemoglobin", "hgb", "hb"]):
            return "hemoglobin"
        if any(w in norm for w in ["glucose", "sugar", "fasting plasma"]):
            return "glucose"
        if any(w in norm for w in ["thyroid", "tsh", "thyrotropin"]):
            return "tsh"
        return "general"

    @classmethod
    async def explain(cls, text: str, language: str = "English", mode: str = "layman") -> Dict[str, Any]:
        topic = cls.identify_topic(text)
        lang_key = language if language in ["English", "Hindi", "Kannada", "Spanish", "French", "German"] else "English"
        mode_key = mode if mode in ["layman", "clinical"] else "layman"

        # Check dictionary
        topic_dict = DICTIONARY.get(topic, DICTIONARY["general"])
        lang_dict = topic_dict.get(lang_key, topic_dict.get("English", DICTIONARY["general"]["English"]))
        default_explanation = lang_dict.get(mode_key, lang_dict.get("layman", ""))

        # Try LLM if available for customized explanation
        prompt = (
            f"Explain the following medical text in {lang_key} using a {mode_key} tone (simple plain language for patient, or concise clinical terminology for clinicians). "
            f"Medical excerpt: '{text}'. Keep it under 2 sentences and emphasize that it is not a diagnosis."
        )
        meta = await ai_client.generate_with_metadata(
            prompt,
            system_prompt="You are MedCorpus AI, translating medical terminology into clear patient-verifiable explanations."
        )
        
        explanation = meta.get("text", "").strip() or default_explanation

        return {
            "selected_text": text,
            "topic": topic,
            "language": lang_key,
            "mode": mode_key,
            "explanation": explanation,
            "clinical_note": lang_dict.get("clinical"),
            "provider": meta.get("provider"),
            "model": meta.get("model"),
            "latency_ms": meta.get("latency_ms"),
            "is_simulated": meta.get("is_simulated"),
            "disclaimer": "AI-assisted explanation · Verify against the original report · Not a medical diagnosis"
        }


plain_language_service = PlainLanguageService()
