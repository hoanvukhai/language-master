"""Publish numbered, manually authored Vietnamese notes without altering source answers."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'imports/jlpt/kokusho-20days/explanations'
TARGET = ROOT / 'src/data/exams/jlpt/n2/kokusho-20days'
ORIGINAL = json.loads((SOURCE.parent / 'day01-editorial.json').read_text(encoding='utf-8'))
DAY_ONE = {q['number']: q.get('explanation', {}) for m in ORIGINAL['mondais'] for q in m['questions']}

for day in range(1, 21):
    path = TARGET / f'day{day:02}.json'
    exam = json.loads(path.read_text(encoding='utf-8'))
    notes = SOURCE / f'day{day:02}.txt'
    if not notes.exists():
        continue
    lines = [line for line in notes.read_text(encoding='utf-8').splitlines() if line.strip()]
    assert len(lines) == 54, (day, 'requires exactly 54 numbered rows')
    rows = dict(line.split('|', 1) for line in lines)
    assert set(rows) == {str(i) for i in range(1, 55)}, (day, 'requires exactly 54 authored notes')
    for mondai in exam['mondais']:
        for q in mondai['questions']:
            parts = rows[str(q['number'])].split('||')
            base = DAY_ONE.get(q['number'], {}) if day == 1 else {}
            q['explanation'] = {**base, 'vi': parts[0].strip(), 'optionNotes': [p.strip() for p in parts[1:]] or base.get('optionNotes', [])}
            q['explanationStatus'] = 'authored'
    exam['contentRevision'] = max(3, exam.get('contentRevision', 0))
    exam['explanationSource'] = 'AI-authored Vietnamese reference notes; answer key checked against source book'
    path.write_text(json.dumps(exam, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'day{day:02}: 54 explanations published')
