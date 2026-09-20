"""Extract OEM catalogue columns, preserving variants and subassembly quantities.
Usage: python3 scripts/fz6/build_catalogue.py /path/to/FZ6S_2007.pdf
The PDF is a source input; no vendor diagrams are redistributed by this script.
"""
import hashlib, json, re, sys
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
source = Path(sys.argv[1])
reader = PdfReader(source)
assemblies = {}
issues = []
with pdfplumber.open(source) as pdf:
    for index, page in enumerate(pdf.pages):
        text = reader.pages[index].extract_text()
        match = re.search(r'FIG\.\s*(\d+)\s+([^\n]+)', text)
        if not match:
            continue
        figure = int(match[1])
        assembly = assemblies.setdefault(figure, {'figure': figure, 'name': match[2].strip(), 'pages': [], 'entries': []})
        assembly['pages'].append(index + 1)
        rows = {}
        for word in page.extract_words():
            if word['upright'] and word['x0'] >= 423 and 63 < word['top'] < 540:
                rows.setdefault(round(word['top']), []).append(word)
        last_ref = None
        for _, words in sorted(rows.items()):
            words.sort(key=lambda w: w['x0'])
            col = lambda lo, hi: ' '.join(w['text'] for w in words if lo <= w['x0'] < hi)
            number = col(439, 512).replace('–', '-')
            if not re.fullmatch(r'[A-Z0-9]{3,5}-[A-Z0-9]{5}(?:-[A-Z0-9]{2}){0,2}', number):
                if assembly['entries'] and col(512, 670) and not number:
                    assembly['entries'][-1]['description'] += ' ' + col(512, 670)
                elif number:
                    issues.append({'page': index + 1, 'raw': ' '.join(w['text'] for w in words)})
                continue
            ref = col(423, 439)
            if ref.isdigit():
                last_ref = int(ref)
            quantity = col(670, 700)
            if not quantity.isdigit() or last_ref is None:
                issues.append({'page': index+1, 'raw': ' '.join(w['text'] for w in words)})
                continue
            description = col(512, 670)
            assembly['entries'].append({'reference': last_ref, 'partNumber': number, 'description': description,
                'quantity': int(quantity), 'remarks': col(700, 842), 'page': index + 1,
                'subassemblyDepth': len(description) - len(description.lstrip('.')),
                'geometryStatus': 'unverified', 'rawLine': ' '.join(w['text'] for w in words)})
result = {'title': 'FZ6-SHG (4S81) OEM parts catalogue', 'modelCode': '4S81', 'year': 2007,
    'market': 'Europe / South Africa', 'catalogue': '1F4S8-300E1; corrected 2F4S8-300E1',
    'source': 'https://pecasoriginaisyamaha.com.br/pdfs/sport/FZ6%20S/FZ6S_2007.pdf',
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'vehicleIdentityConfirmed': False, 'fitmentStatus': 'unconfirmed',
    'quantityNote': 'Counts belong to the catalogue row or parent subassembly. Rows sharing a reference can be alternatives; UR means use as required. Do not sum alternatives.',
    'assemblies': list(assemblies.values()), 'parseIssues': issues}
output = Path('web/public/fz6/oem-catalogue.json')
output.write_text(json.dumps(result, indent=2) + '\n')
print(f'{len(assemblies)} assemblies; {sum(len(a["entries"]) for a in assemblies.values())} catalogue rows; {len(issues)} parse issues')
for issue in issues: print(issue)
