"""Render cropped source pages for the reproducible OCR pipeline; never alter the PDF."""
from pathlib import Path
import argparse, hashlib, json
import pypdfium2 as pdfium

parser=argparse.ArgumentParser()
parser.add_argument('pdf',type=Path)
args=parser.parse_args()
source=args.pdf.resolve()
root=Path(__file__).resolve().parents[1]/'imports/jlpt/kokusho-20days'
root.mkdir(parents=True,exist_ok=True)
raw=root/'raw';raw.mkdir(exist_ok=True)
digest=hashlib.sha256(source.read_bytes()).hexdigest()
manifest=root/'source-manifest.json'
if manifest.exists() and json.loads(manifest.read_text())['sha256']!=digest:
    raise ValueError('Source changed: use a new document directory; do not mix OCR revisions.')
doc=pdfium.PdfDocument(str(source))
assert len(doc)==176,'Unexpected source edition/page count'
manifest.write_text(json.dumps({'documentId':'kokusho-n2-20days','fileName':source.name,'sha256':digest,'pageCount':len(doc),'questionPages':[5,164],'answerPages':[167,176],'renderScale':3,'cropBox':True},indent=2),encoding='utf-8')
for n in list(range(5,165))+list(range(167,177)):
    target=raw/f'page-{n:03}.png'
    if not target.exists():doc[n-1].render(scale=3).to_pil().save(target)
print('Source pages ready:',170)
