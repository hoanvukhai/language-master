"""Geometry-based transcription seeds; published only after visual corrections."""
from pathlib import Path
import json, re, sys
from statistics import median

ROOT = Path(__file__).resolve().parents[1]
IMP = ROOT / 'imports/jlpt/kokusho-20days'
OUT = IMP / 'transcription'
OUT.mkdir(exist_ok=True)

def words(page, native=False):
    d = json.loads((IMP/'raw'/f'{"page" if native else "tess"}-{page:03}.json').read_text(encoding='utf-8-sig'))
    if native: return [dict(text=w['text'], x0=w['x'],y0=w['y'],x1=w['x']+w['width'],y1=w['y']+w['height']) for l in d['lines'] for w in l['words']]
    return [dict(text=w['text'],**w['bbox']) for b in d['blocks'] or [] for p in b['paragraphs'] for l in p['lines'] for w in l['words']]

def rows(ws):
    result=[]
    for w in sorted(ws,key=lambda w:(w['y0']+w['y1'])/2):
        cy=(w['y0']+w['y1'])/2
        if not result or cy-result[-1][0]>16:result.append([cy,[w]])
        else:result[-1][1].append(w)
    return [(cy,sorted(line,key=lambda w:w['x0'])) for cy,line in result if median(w['y1']-w['y0'] for w in line)>=18]

def text(ws): return '\n'.join(''.join(w['text'].replace(' ','') for w in line) for _,line in rows(ws))

def seed():
    report=json.loads((IMP/'import-report.json').read_text())
    for day in report:
        output=[]
        for q in day['entries']:
            n=q['number']; page=q['pdfPage']; x,top,right,bottom=q['crop']
            allwords=words(page); native=words(page,True)
            ws=[w for w in allwords if top<=w['y0']<bottom and w['x0']>x+55 and w['x0']<right]
            anchors=[w for w in native+allwords if top+65<w['y0']<bottom and w['x0']>x+30 and re.fullmatch('[1-4]',w['text'])]
            # Find each option label, preferring its earliest occurrence after the stem.
            selected={}
            for w in sorted(anchors,key=lambda w:(w['y0'],w['x0'])):
                selected.setdefault(w['text'], w)
            if not selected: output.append([n,text(ws),*['?']*4]);continue
            first=min(w['y0'] for w in selected.values())
            stem=text([w for w in ws if w['y1']<first+5 and w['x0']>x+65])
            opts=[]
            for i in range(1,5):
                a=selected.get(str(i))
                if not a: opts.append('?');continue
                row=[v for v in selected.values() if abs(v['y0']-a['y0'])<25]
                rightedge=min([v['x0']-8 for v in row if v['x0']>a['x0']+50],default=right)
                lower=min([v['y0']-8 for v in selected.values() if v['y0']>a['y0']+25],default=bottom)
                region=[w for w in ws if w['x0']>a['x0']+25 and w['x0']<rightedge and w['y1']>=a['y0'] and w['y0']<lower]
                opts.append(text(region))
            output.append([n,stem,*opts])
        (OUT/f'day{day["day"]:02}-seed.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
        print(day['day'],sum('?' in row for row in output))

if __name__=='__main__': seed()
