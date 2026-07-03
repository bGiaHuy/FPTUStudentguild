import sys
import io
from docx import Document

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
doc_path = r"flow3_rawdata\Mô tả website nhà trường (data luồng 3).docx"
try:
    doc = Document(doc_path)
    for i, p in enumerate(doc.paragraphs[:100]):
        text = p.text.strip()
        if text:
            print(f"[{p.style.name}] {text}")
except Exception as e:
    print(f"Error: {e}")
