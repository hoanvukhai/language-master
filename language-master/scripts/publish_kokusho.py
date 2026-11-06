from pathlib import Path
import json

root=Path(__file__).resolve().parents[1]
target=root/'src/data/exams/jlpt/n2/kokusho-20days'
imports=root/'imports/jlpt/kokusho-20days'
editorial=imports/'day01-editorial.json'
if not editorial.exists():editorial.write_bytes((target/'day01.json').read_bytes())
old=json.loads(editorial.read_text(encoding='utf-8'))
for p in sorted((imports/'drafts').glob('day*.json')):
    d=json.loads(p.read_text(encoding='utf-8'))
    if d['day']==1:
        oqs={q['number']:q for m in old['mondais'] for q in m['questions']}
        for m in d['mondais']:
            for i,q in enumerate(m['questions']):
                source={k:q[k] for k in ['sourceImage','sourcePages','answerPages','ocrText','transcriptionStatus']}
                m['questions'][i]={**oqs[q['number']],**source}
            if m.get('passages'):
                m['passages'][0]={**old['mondais'][8]['passages'][0],**{k:m['passages'][0][k] for k in ['sourceImage','sourcePages']}}
    (target/p.name).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Installed 20 source-backed days')
