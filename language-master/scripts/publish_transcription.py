"""Apply visual review records, retaining source images and the original answer key."""
import json, re
from pathlib import Path
from datetime import date

ROOT=Path(__file__).resolve().parents[1]
IMP=ROOT/'imports/jlpt/kokusho-20days'
DIR=IMP/'transcription'
TARGET=ROOT/'src/data/exams/jlpt/n2/kokusho-20days'
original=json.loads((IMP/'day01-editorial.json').read_text(encoding='utf-8'))
report=[]

def clean(s, printed):
    s=s.replace('\n','').strip().lstrip('|_ ').rstrip()
    return re.sub(r'\s*'+str(printed)+r'$', '', s)

for day in range(1,21):
    patch=DIR/f'day{day:02}-review.txt'
    passagefile=DIR/f'day{day:02}-passage.txt'
    if not patch.exists() or not passagefile.exists(): continue
    path=TARGET/f'day{day:02}.json'
    e=json.loads(path.read_text(encoding='utf-8'))
    qs={q['number']:q for m in e['mondais'] for q in m['questions']}
    if day==1: base={q['number']:[q['stem'],*q['options']] for m in original['mondais'] for q in m['questions']}
    else: base={r[0]:[clean(v,qs[r[0]]['sourcePages'][0]['pdfPage']+1) for v in r[1:]] for r in json.loads((DIR/f'day{day:02}-seed.json').read_text(encoding='utf-8'))}
    underlines=[]; reviewed=[]
    for line in patch.read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):continue
        cells=line.split('|')
        if cells[0]=='!': reviewed=[int(n) for n in cells[1].split(',')]; continue
        if cells[0]=='@': underlines=cells[1:];continue
        n=int(cells[0])
        assert len(cells)<=7,(day,n,'too many cells')
        for i,value in enumerate(cells[1:]):
            if value!='~':base[n][i]=value
    assert reviewed==list(range(5+(day-1)*8,13+(day-1)*8)),(day,'requires all eight reviewed source pages')
    if underlines:
        assert len(underlines)==15,(day,underlines)
        for n,term in zip([*range(1,11),*range(23,28)],underlines):
            assert term in base[n][0],(day,n,term,base[n][0])
            base[n][0]=base[n][0].replace(term,f'[{term}]',1)
    for n,q in qs.items():
        stem,*options=base[n]
        options=[o.rstrip('_ ') for o in options]
        if 11<=n<=22 or 33<=n<=44:
            stem=re.sub(r'[（(][^()（）]{0,3}[)）]','（　）',stem)
            assert '（　）' in stem,(day,n,'missing grammar blank',stem)
        if n>=50:stem=f'[[{n}]]'
        if 28<=n<=32:
            term=stem.strip('[]')
            options=[o if '[' in o else o.replace(term,f'[{term}]',1) for o in options]
        assert len(options)==4 and all(o and o!='?' and 'xem lựa chọn' not in o for o in options),(day,n,options)
        q.update(stem=stem,options=options,transcriptionStatus='verified')
        if 45<=n<=49:
            match=re.search(r'(?:Ghép(?: cụm)?:?\s*)([1-4])→([1-4])→([1-4])→([1-4])',q['explanation']['vi'])
            if match:q['order']=[int(x) for x in match.groups()]
        if n>=50:
            text=passagefile.read_text(encoding='utf-8').split('\n---NOTES---\n')[0]
            q['blankIds']=re.findall(r'\[\[('+str(n)+r'(?:-[abc])?)\]\]',text)
            assert q['blankIds'],(day,n,'unowned blank')
            q['blankLabel']=str(n)
    content=passagefile.read_text(encoding='utf-8').split('\n---NOTES---\n')
    p=e['mondais'][8]['passages'][0]
    p.update(text=content[0].strip(),notes=content[1].strip().splitlines() if len(content)>1 else [])
    e.update(delivery='text',transcriptionStatus='verified',contentRevision=4)
    e['transcriptionReview']={'method':'Visual comparison of all 8 rendered source pages; corrected OCR; original distractors retained','pdfPages':reviewed,'date':date(2026,11,6).isoformat()}
    path.write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    report.append({'day':day,'questions':54,'pdfPages':reviewed})
    print(f'day{day:02}: verified text installed')
(DIR/'review-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
