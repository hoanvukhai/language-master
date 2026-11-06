"""Local PDF OCR import. Source image crops remain authoritative until text is reviewed."""
from pathlib import Path
from collections import deque, Counter
import json, re, sys
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'imports/jlpt/kokusho-20days/raw'

def question_boxes(path):
    image = Image.open(path).convert('L')
    a = np.array(image)[:, :round(image.width * .20)] < 140
    seen = np.zeros_like(a, dtype=bool)
    h,w = a.shape
    found=[]
    for y,x in zip(*np.where(a)):
        if seen[y,x]: continue
        stack=[(int(y),int(x))]; seen[y,x]=True; xs=[]; ys=[]
        while stack:
            cy,cx=stack.pop(); xs.append(cx);ys.append(cy)
            for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
                ny,nx=cy+dy,cx+dx
                if 0<=ny<h and 0<=nx<w and a[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True;stack.append((ny,nx))
        x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
        bw,bh=x1-x0+1,y1-y0+1
        if 35<=bw<=85 and 20<=bh<=65 and 1.05<bw/bh<3.4:
            crop=a[y0:y1+1,x0:x1+1]
            edge=np.concatenate([crop[:3].flatten(),crop[-3:].flatten(),crop[:,:3].flatten(),crop[:,-3:].flatten()]).mean()
            if edge>.35: found.append((x0,y0,bw,bh))
    if not found: return []
    # Source questions share one left margin; remove stray Japanese glyphs.
    mode=Counter(round(x/10)*10 for x,y,bw,bh in found).most_common(1)[0][0]
    return sorted([b for b in found if abs(b[0]-mode)<40],key=lambda b:b[1])

def audit_boxes():
    counts={}
    for n in range(5,165):
        boxes=question_boxes(RAW/f'page-{n:03}.png')
        counts[n]=boxes
    (RAW.parent/'question-boxes.json').write_text(json.dumps(counts,indent=2),encoding='utf-8')
    for day in range(1,21):
        start=5+(day-1)*8
        row=[len(counts[p]) for p in range(start,start+8)]
        print(day,row,sum(row),flush=True)

def text_rows(words):
    rows=[]
    for word in sorted(words,key=lambda w:w['y']+w['height']/2):
        cy=word['y']+word['height']/2
        if not rows or abs(cy-rows[-1][0])>12: rows.append([cy,[]])
        rows[-1][1].append(word)
    return '\n'.join(''.join(w['text'].replace(' ','') for w in sorted(row,key=lambda w:w['x'])) for _,row in rows)

def best_words(page, fallback):
    path=RAW/f'tess-{page:03}.json'
    if not path.exists():return fallback
    data=json.loads(path.read_text(encoding='utf-8'))
    return [{'text':word['text'],'x':word['bbox']['x0'],'y':word['bbox']['y0'],
             'width':word['bbox']['x1']-word['bbox']['x0'],'height':word['bbox']['y1']-word['bbox']['y0']}
            for block in data['blocks'] or [] for paragraph in block['paragraphs']
            for line in paragraph['lines'] for word in line['words']]

def build():
    boxes=json.loads((RAW.parent/'question-boxes.json').read_text())
    for n in [113,114]: boxes[str(n)]=question_boxes(RAW/f'page-{n:03}.png')
    answers=json.loads((RAW.parent/'answers-reviewed.json').read_text())
    target=ROOT/'src/data/exams/jlpt/n2/kokusho-20days'
    assets=ROOT/'public/exams/kokusho-20days';assets.mkdir(parents=True,exist_ok=True)
    template=json.loads((target/'day01.json').read_text(encoding='utf-8'))
    expected=[7,10,10,5,9,8,0,5]
    report=[]
    for day in range(1,21):
        start=5+(day-1)*8; daydir=assets/f'day{day:02}';daydir.mkdir(exist_ok=True)
        result={k:v for k,v in template.items() if k not in ['mondais','id','title','day']}
        result.update(id=f'kokusho-n2-20days-d{day:02}',day=day,title=f'第{day}日 (Day {day})',
            subtitle=f'文字・語彙・文法 · Trang {start+1}–{start+8}',contentRevision=2,
            delivery='source_scan',transcriptionStatus='needs_review',
            sourceRef={'documentId':'kokusho-n2-20days','fileName':'N2 - 20 Nichi de Goukaku.pdf'},
            sourcePages=[{'pdfPage':n,'printedPage':str(n+1)} for n in range(start,start+8)],
            answerPages=[{'pdfPage':167+(day-1)//2}],mondais=[])
        flatanswers=[int(c) for c in ''.join(answers[str(day)])]
        for m in template['mondais']:
            result['mondais'].append({k:v for k,v in m.items() if k not in ['questions','passages']})
            result['mondais'][-1]['questions']=[]
        # A page is the shared context for the last five questions.
        passage_page=start+6
        im=Image.open(RAW/f'page-{passage_page:03}.png').convert('RGB')
        if not (daydir/'passage.webp').exists():im.save(daydir/'passage.webp',quality=88)
        passage_data=json.loads((RAW/f'page-{passage_page:03}.json').read_text(encoding='utf-8-sig'))
        passage={'id':f'd{day:02}-passage','text':text_rows(best_words(passage_page,[w for l in passage_data['lines'] for w in l['words']])),
                 'sourceImage':f'/exams/kokusho-20days/day{day:02}/passage.webp','sourcePages':[{'pdfPage':passage_page}]}
        result['mondais'][8]['passages']=[passage]
        number=0; entries=[]
        for offset,want in enumerate(expected):
            if not want: continue
            n=start+offset
            pageboxes=[b for b in boxes[str(n)] if b[2]>=35]
            assert len(pageboxes)==want,(day,n,len(pageboxes),want)
            image=Image.open(RAW/f'page-{n:03}.png').convert('RGB')
            data=json.loads((RAW/f'page-{n:03}.json').read_text(encoding='utf-8-sig'))
            words=[w for l in data['lines'] for w in l['words']]
            transcription=best_words(n,words)
            headers=[min(w['y'] for w in l['words']) for l in data['lines'] if re.search(r'問\s*題\s*[1-9]',l['text'])]
            for i,(x,y,bw,bh) in enumerate(pageboxes):
                number+=1
                top=max(0,y-32)
                bottom=pageboxes[i+1][1]-32 if i+1<len(pageboxes) else image.height-85
                after=[h-20 for h in headers if h>y+60 and h<bottom]
                if after:bottom=min(after)
                assert bottom>y+50,(day,number,n,y,bottom)
                crop=image.crop((max(0,x-14),top,image.width-65,bottom))
                name=f'q{number:02}.webp'
                if not (daydir/name).exists():crop.save(daydir/name,quality=90)
                body=[w for w in transcription if top<=w['y']<bottom and w['x']>=x and w['height']>=18]
                anchors=[w for w in words if top<=w['y']<bottom and re.fullmatch('[1234]',w['text'].strip()) and w['y']>y+45 and w['x']>=x+20]
                first=min((w['y'] for w in anchors),default=y+65)
                stem=text_rows([w for w in body if w['y']<first-12 and w['x']>x+bw]) or f'問題 {number}'
                options=[]
                for opt in range(1,5):
                    choices=[w for w in anchors if w['text'].strip()==str(opt)]
                    if choices:
                        anchor=min(choices,key=lambda w:w['y'])
                        nextanchors=[w['x'] for w in anchors if abs(w['y']-anchor['y'])<20 and w['x']>anchor['x']+40]
                        right=min(nextanchors,default=image.width-60)
                        option=text_rows([w for w in body if abs((w['y']+w['height']/2)-(anchor['y']+anchor['height']/2))<18 and anchor['x']+anchor['width']<w['x']<right])
                    else:option=''
                    options.append(option or f'{opt} — xem lựa chọn trong bản gốc')
                mi=next(j for j,m in enumerate(template['mondais']) if m['numberRange'][0]<=number<=m['numberRange'][1])
                q={'id':f'kokusho_n2_d{day:02}_m{mi+1}_{number:02}','number':number,'stem':stem,'options':options,'answer':flatanswers[number-1],
                   'sourceImage':f'/exams/kokusho-20days/day{day:02}/{name}','sourcePages':[{'pdfPage':n,'printedPage':str(n+1)}],
                   'answerPages':[{'pdfPage':167+(day-1)//2}],'transcriptionStatus':'needs_review','ocrText':text_rows(body)}
                if mi==8:q['passageId']=passage['id']
                result['mondais'][mi]['questions'].append(q)
                entries.append({'number':number,'pdfPage':n,'crop':[x-14,top,image.width-65,bottom],'ocrOptionCount':sum('xem lựa chọn' not in o for o in options)})
        assert number==54,(day,number)
        # Preserve the existing, manually entered day-1 text and enrichment as a separate editorial source.
        outfile=(RAW.parent/'drafts'/f'day{day:02}.json')
        outfile.parent.mkdir(exist_ok=True)
        outfile.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        textdir=RAW.parent/'text';textdir.mkdir(exist_ok=True)
        text=[]
        for page in range(start,start+8):
            raw=json.loads((RAW/f'tess-{page:03}.json').read_text(encoding='utf-8'))
            text.append(f'=== PDF {page} / book {page+1} ===\n'+raw['text'])
        (textdir/f'day{day:02}.txt').write_text('\n\n'.join(text),encoding='utf-8')
        report.append({'day':day,'questions':number,'answerPage':167+(day-1)//2,'entries':entries})
        print('Imported day',day,number,flush=True)
    (RAW.parent/'import-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

if __name__=='__main__':
    if '--build' in sys.argv:build()
    else:audit_boxes()
