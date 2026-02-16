"""File parsers for PDF, DOCX, and TXT resumes."""

import io


def parse_pdf(content: bytes) -> str:
    import pdfplumber

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages).strip()


def parse_docx(content: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def parse_txt(content: bytes) -> str:
    for encoding in ("utf-8", "cp1251", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def parse_file(content: bytes, filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return parse_pdf(content)
    elif lower.endswith(".docx"):
        return parse_docx(content)
    elif lower.endswith(".txt"):
        return parse_txt(content)
    else:
        raise ValueError(f"Unsupported file type: {filename}")
