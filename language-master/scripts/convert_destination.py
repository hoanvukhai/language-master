import os
import sys
import zipfile
import sqlite3
import json
import re
import tempfile
import shutil

sys.stdout.reconfigure(encoding='utf-8')

courses_dir = r"f:\Workspace\learn-language\language-master\src\data\english\courses\destination"
b1b2_apkg = os.path.join(courses_dir, "Destination_B1B2_FULL_1121_Words2072_Collocation284_Phr.apkg")
c1c2_apkg = os.path.join(courses_dir, "Cn_Destination_C1__C2_Vocabulary_Deck.apkg")
c1c2_ex_apkg = os.path.join(courses_dir, "Destination_C1__C2_Vocabulary_and_Exercises.apkg")

STANDARD_BLANK = "_____________"

def clean_html(text):
    if not text:
        return ""
    t = re.sub(r'<br\s*/?>', '\n', text, flags=re.I)
    t = re.sub(r'<[^>]+>', '', t)
    t = t.replace('&nbsp;', ' ').replace('&quot;', '"').replace('&#x27;', "'").replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    return t.strip()

def clean_inline(text):
    if not text:
        return ""
    t = re.sub(r'<[^>]+>', '', text)
    t = t.replace('&nbsp;', ' ').replace('&quot;', '"').replace('&#x27;', "'").replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    return ' '.join(t.split())

def normalize_blank(text, word=""):
    if not text:
        return ""
    t = clean_inline(text)
    # Replace any sequence of 3 or more underscores with standard 13 underscores
    t = re.sub(r'_{3,}', STANDARD_BLANK, t)
    
    # If the sentence doesn't contain a blank, mask the word (handling affixes/derivatives)
    if STANDARD_BLANK not in t and word:
        # Check specific known derivations
        word_derivs = {
            'convince': ['unconvincing', 'convincing', 'convinced'],
            'lot': ['allocates', 'allocated', 'allocate', 'allocation'],
            'portion': ['apportioned', 'apportion', 'apportioning'],
            'finite': ['infinite', 'finitely'],
            'logic': ['illogical', 'logical'],
            'reason': ['unreasonable', 'reasonable'],
            'opinion': ['opinionated', 'opinions']
        }
        low_w = word.strip().lower()
        if low_w in word_derivs:
            for deriv in word_derivs[low_w]:
                pattern_d = r'\b' + re.escape(deriv) + r'\b'
                res, count = re.subn(pattern_d, STANDARD_BLANK, t, flags=re.I)
                if count > 0:
                    return res

        # Try word with suffixes
        pattern = r'\b' + re.escape(word.strip()) + r'(?:s|es|ed|ing|d|r|er|est)?\b'
        res, count = re.subn(pattern, STANDARD_BLANK, t, flags=re.I)
        if count > 0:
            return res

        # Try word with standard prefixes
        pattern_affix = r'\b(?:un|in|im|il|ir|dis|mis)?' + re.escape(word.strip()) + r'(?:s|es|ed|ing|d|r|er|est|al|ated|able|ate|ion)?\b'
        res, count = re.subn(pattern_affix, STANDARD_BLANK, t, flags=re.I)
        if count > 0:
            return res

        # Try literal substring
        if word.lower() in t.lower():
            res, count = re.subn(re.escape(word.strip()), STANDARD_BLANK, t, flags=re.I)
            if count > 0:
                return res

    return t

def to_fill_blank(sentence_with_b_tag):
    if not sentence_with_b_tag:
        return ""
    t = re.sub(r'<b[^>]*>.*?</b>', STANDARD_BLANK, sentence_with_b_tag, flags=re.I)
    t = clean_inline(t)
    if STANDARD_BLANK in t:
        return t
    return ""

def title_case_topic(topic):
    if not topic:
        return ""
    topic_map = {
        'fun and games': 'Fun and Games',
        'learning and doing': 'Learning and Doing',
        'coming and going': 'Coming and Going',
        'friends and relations': 'Friends and Relations',
        'buying and selling': 'Buying and Selling',
        'inventions and discoveries': 'Inventions and Discoveries',
        'sending and receiving': 'Sending and Receiving',
        'people and daily life': 'People and Daily Life',
        'working and earning': 'Working and Earning',
        'body and lifestyle': 'Body and Lifestyle',
        'creating and building': 'Creating and Building',
        'nature and the universe': 'Nature and the Universe',
        'laughing and crying': 'Laughing and Crying',
        'problems and solutions': 'Problems and Solutions',
        'travel and transport': 'Travel and Transport',
        'hobbies, sport and games': 'Hobbies, Sport and Games',
        'science and technology': 'Science and Technology',
        'the media': 'The Media',
        'people and society': 'People and Society',
        'the law and crime': 'The Law and Crime',
        'health and fitness': 'Health and Fitness',
        'food and drink': 'Food and Drink',
        'education and learning': 'Education and Learning',
        'weather and the environment': 'Weather and the Environment',
        'money and shopping': 'Money and Shopping',
        'entertainment': 'Entertainment',
        'fashion and design': 'Fashion and Design',
        'work and business': 'Work and Business'
    }
    low = topic.strip().lower()
    return topic_map.get(low, topic.strip().title())

# Extra English definitions for C1&C2 idioms, phrasal verbs, and specific words
EXTRA_C1_DEFS = {
    'naïve': 'lacking experience, wisdom, or judgment; innocent and gullible',
    'misapprehension': 'a mistaken belief about or interpretation of something',
    "know what's what": 'to have practical understanding and good judgment of a situation',
    'games console': 'an electronic device used to play video games on a television or monitor',
    "a leopard can't change its spots": 'a person cannot change their essential nature or innate character',
    'ages': 'a very long time',
    'hours': 'a long period of time; a substantial duration',
    "in/for donkey's years": 'for an extremely long time',
    'transit': 'the carrying of people or goods from one place to another',
    "a stone's throw (away/from)": 'a very short distance away',
    'take a short cut': 'to take a quicker, more direct route or method',
    'speaking': 'the action of conveying information or expressing thoughts in spoken language',
    "get/catch sb's drift": 'to understand the general meaning or implication of what someone is saying',
    'hell': 'an extremely unpleasant or difficult situation or place',
    'act of god': 'an instance of uncontrollable natural forces in action, such as an earthquake or flood',
    'slip up': 'to make a careless mistake or blunder',
    'size': 'the relative extent, dimensions, or magnitude of something',
    'bundle': 'a collection of things or a quantity of material tied or wrapped up together',
    "it's as broad as it is long": 'used to say that two options or alternatives will have the same outcome',
    'buy out': 'to pay someone to give up ownership or shares in a business',
    'carry over': 'to extend or continue into a different situation or time period',
    'preventative medicine': 'measures taken to prevent diseases or injuries rather than curing them',
    'give something a miss': 'to decide not to participate in or consume something',
    "never/don't look a gift horse in the mouth": 'do not be ungrateful or find fault with something received as a gift',
    'go down (well/badly) (with)': 'to be received or reacted to by someone in a certain way',
    'deny': 'to state that something is not true, or to refuse to admit or give something',
    "under sb's thumb": 'under the total control or influence of someone else',
    'crack down (on)': 'to take severe measures against people who disobey rules or commit crimes',
    'granted': 'acknowledged or conceded as true; given or bestowed',
    'a night on the town': 'an evening of entertainment and celebration spent visiting places in a town or city',
    'back the wrong horse': 'to make a wrong decision and support someone or something that fails',
    'be dead keen (on)': 'to be extremely interested in or enthusiastic about something',
    'get off on the wrong foot': 'to start a relationship, project, or interaction badly',
    'look on the bright side': 'to find good things in a bad situation; to be optimistic',
    'the rub of the green': 'good fortune or luck, especially in sports or life',
    'back out': 'to decide not to do something you had previously agreed to do',
    'close down': 'to stop operating permanently (of a business or factory)',
    'see through (to)': 'to continue doing something until it is finished, despite difficulties',
    'set to': 'to begin working eagerly, energetically, or determinedly',
    'slow down': 'to reduce speed or become less active',
    'stand in for': 'to take someone’s place temporarily; to substitute for someone',
    'self': 'a person’s essential being that distinguishes them from others',
    'step-parent/child': 'a parent or child related by remarriage rather than biological ties',
    "in sb's bad/good books": 'in a state of being out of/in favor with someone',
    'literate': 'able to read and write; having knowledge or competence in a particular area',
    'theatre': 'a building or outdoor area in which plays and other dramatic performances are given',
    'enthuse': 'to express intense enthusiasm, eagerness, or admiration for something',
    'practise': 'to perform an activity repeatedly or regularly in order to improve proficiency',
    "catch sb's eye": 'to attract someone’s attention or notice',
    'in vogue': 'fashionable, popular, or in style at a particular time',
    'put sb in the picture': 'to provide someone with the necessary information about a situation',
    'set the trend': 'to start doing something that becomes popular and followed by others',
    'stuck in a rut': 'trapped in a boring, repetitive lifestyle or fixed routine with no progress',
    'take sth as read': 'to accept something as true without further discussion or proof',
    'word of mouth': 'information passed on informally through spoken communication from person to person',
    'block out': 'to stop light, sound, or unpleasant thoughts from entering your mind or awareness',
    'blow up': 'to enlarge a photograph or picture; or to explode',
    'break into': 'to enter a profession, field, or market successfully; or to enter illegally',
    'call for': 'to publicly demand or require something as necessary',
    'die down': 'to become much less noisy, active, powerful, or violent gradually',
    'draw up': 'to prepare and write out a formal document, contract, or plan',
    'drink in': 'to absorb, enjoy, or experience something with great pleasure and complete attention',
    'drop off': 'to fall asleep easily or unintentionally; or to deliver someone/something',
    'hoard away': 'to collect and hide away a large supply of something for future use',
    'make after': 'to chase, follow, or pursue someone',
    'make off with': 'to steal something and quickly escape or run away with it',
    'pull off': 'to succeed in achieving or doing something difficult or unexpected',
    'read into': 'to find extra or hidden meaning in something that may not actually be there',
    'read out': 'to read something aloud so that other people can hear it',
    'read up on': 'to read a lot about a particular subject in order to learn about it',
    'run after': 'to chase or pursue someone or something',
    'run around': 'to be very busy doing many different things or rushing from place to place',
    'run through': 'to read, explain, or rehearse something quickly from start to finish',
    'show off': 'to behave in a way intended to attract attention and admiration from others',
    'watch out': 'to be vigilant, alert, or careful about potential dangers',
    'watch out for': 'to be attentive to or keep looking for someone or something'
}

# ==============================================================================
# 1. BUILD COMPREHENSIVE DICTIONARIES
# ==============================================================================
print("1. Building dictionaries...")
word_to_vi = {}
en_definitions = {}

# Load all course files
all_course_files = [
    "oxford3000A1.json", "oxford3000A2.json", "oxford3000B1.json", "oxford3000B2.json", "oxford5000C1.json",
    "vocabInUseAdvanced.json", "vocabInUseUpperInt.json", "vocabInUsePreInt.json", "vocabInUseElementary.json",
    "ieltsIntermediate.json", "ieltsAdvanced.json",
    "essentialWords1.json", "essentialWords2.json", "essentialWords3.json", "essentialWords4.json",
    "essentialWords5.json", "essentialWords6.json", "toeic600.json"
]

for fn in all_course_files:
    p = os.path.join(courses_dir, fn)
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as jf:
            for item in json.load(jf):
                w = item.get('word', '').strip().lower()
                vi = item.get('meaning', {}).get('vi', '').strip()
                en = item.get('meaning', {}).get('en', '').strip()
                if w and vi and w not in word_to_vi:
                    word_to_vi[w] = vi
                if w and en and w not in en_definitions:
                    en_definitions[w] = en

# Add Extra C1 definitions
for w, def_str in EXTRA_C1_DEFS.items():
    en_definitions[w.lower()] = def_str

# Read C1/C2 APKG
tmp_c1 = tempfile.mkdtemp()
c1_notes_raw = []
c1_decks_map = {}
try:
    with zipfile.ZipFile(c1c2_apkg, 'r') as z:
        db_name = 'collection.anki21' if 'collection.anki21' in z.namelist() else 'collection.anki2'
        z.extract(db_name, tmp_c1)
        c_conn = sqlite3.connect(os.path.join(tmp_c1, db_name))
        c_cur = c_conn.cursor()
        c_cur.execute("SELECT decks FROM col")
        decks = json.loads(c_cur.fetchone()[0])
        for did, d in decks.items():
            name = d.get('name', '')
            if '::' in name:
                name = name.split('::')[-1].strip()
            c1_decks_map[int(did)] = name
            
        c_cur.execute("""
            SELECT n.id, n.flds, c.did
            FROM notes n
            JOIN cards c ON n.id = c.nid
            GROUP BY n.id
            ORDER BY n.id ASC
        """)
        c1_notes_raw = c_cur.fetchall()
        for nid, flds, did in c1_notes_raw:
            cols = flds.split('\x1f')
            w = clean_inline(cols[0]).lower()
            vi = clean_inline(cols[3])
            if w and vi:
                word_to_vi[w] = vi
        c_conn.close()
finally:
    shutil.rmtree(tmp_c1, ignore_errors=True)

# Load English definitions from C1&C2 Exercises APKG
tmp_ex = tempfile.mkdtemp()
try:
    with zipfile.ZipFile(c1c2_ex_apkg, 'r') as z:
        db_name = 'collection.anki21' if 'collection.anki21' in z.namelist() else 'collection.anki2'
        z.extract(db_name, tmp_ex)
        ex_conn = sqlite3.connect(os.path.join(tmp_ex, db_name))
        ex_cur = ex_conn.cursor()
        ex_cur.execute("SELECT decks FROM col")
        decks = json.loads(ex_cur.fetchone()[0])
        v_dids = [int(did) for did, d in decks.items() if 'Vocabulary::' in d.get('name', '')]
        placeholders = ','.join('?' for _ in v_dids)
        ex_cur.execute(f"""
            SELECT n.flds
            FROM notes n
            JOIN cards c ON n.id = c.nid
            WHERE c.did in ({placeholders})
        """, v_dids)
        for (flds,) in ex_cur.fetchall():
            cols = flds.split('\x1f')
            w = clean_inline(cols[0]).lower()
            en_def = clean_inline(cols[4]) if len(cols) > 4 else ""
            if w and en_def and w not in en_definitions:
                en_definitions[w] = en_def
        ex_conn.close()
finally:
    shutil.rmtree(tmp_ex, ignore_errors=True)

print(f"Total entries in VI dictionary: {len(word_to_vi)}")
print(f"Total entries in EN dictionary: {len(en_definitions)}")

# ==============================================================================
# 2. PROCESS B1 & B2 FROM APKG
# ==============================================================================
print("\n2. Processing B1 & B2 from APKG...")
b1_items = []
b2_items = []

tmp_b1b2 = tempfile.mkdtemp()
try:
    with zipfile.ZipFile(b1b2_apkg, 'r') as z:
        db_name = 'collection.anki21' if 'collection.anki21' in z.namelist() else 'collection.anki2'
        z.extract(db_name, tmp_b1b2)
        b_conn = sqlite3.connect(os.path.join(tmp_b1b2, db_name))
        b_cur = b_conn.cursor()
        b_cur.execute("SELECT id, flds FROM notes ORDER BY id ASC")
        notes = b_cur.fetchall()
        
        for nid, flds_str in notes:
            cols = flds_str.split('\x1f')
            w = clean_inline(cols[1]).lower() if len(cols) > 1 else ""
            vi = clean_inline(cols[5]) if len(cols) > 5 else ""
            if w and vi:
                word_to_vi[w] = vi
                
        for nid, flds_str in notes:
            cols = flds_str.split('\x1f')
            raw_id = cols[0].strip() if len(cols) > 0 else ""
            word = clean_inline(cols[1]) if len(cols) > 1 else ""
            pos = clean_inline(cols[3]) if len(cols) > 3 else ""
            def_en = clean_inline(cols[4]) if len(cols) > 4 else ""
            def_vi = clean_inline(cols[5]) if len(cols) > 5 else ""
            
            raw_ex_en = cols[6] if len(cols) > 6 else ""
            ex_en = clean_inline(raw_ex_en)
            ex_vi = clean_inline(cols[8]) if len(cols) > 8 else ""
            
            phonetics = clean_inline(cols[18]) if len(cols) > 18 else ""
            colloc_raw = clean_html(cols[19]) if len(cols) > 19 else ""
            word_form_raw = clean_html(cols[20]) if len(cols) > 20 else ""
            
            unit_num = clean_inline(cols[21]) if len(cols) > 21 else ""
            topic = title_case_topic(cols[22] if len(cols) > 22 else "")
            
            d1 = clean_inline(cols[23]) if len(cols) > 23 else ""
            d2 = clean_inline(cols[24]) if len(cols) > 24 else ""
            d3 = clean_inline(cols[25]) if len(cols) > 25 else ""
            
            raw_colloc_ex_en = cols[26] if len(cols) > 26 else ""
            colloc_ex_en = clean_inline(raw_colloc_ex_en)
            colloc_ex_vi = clean_inline(cols[27]) if len(cols) > 27 else ""
            
            # Format IPA
            ipa_str = phonetics
            if ipa_str and not ipa_str.startswith('/'):
                ipa_str = f"/{ipa_str}/"
                
            lesson_str = f"Unit {unit_num}: {topic}" if topic else f"Unit {unit_num}"
            
            # Collocations
            collocations = []
            if colloc_raw:
                for line in colloc_raw.split('\n'):
                    line = line.strip().lstrip('•').strip()
                    if line:
                        collocations.append(line)
                        
            # Word Formations
            word_formations = []
            if word_form_raw:
                for line in word_form_raw.split('\n'):
                    line = line.strip().lstrip('•').strip()
                    if line:
                        word_formations.append(line)
                        
            # Examples
            examples = []
            if ex_en:
                examples.append({"en": ex_en, "vi": ex_vi})
            if colloc_ex_en:
                examples.append({"en": colloc_ex_en, "vi": colloc_ex_vi})
                
            # fillBlank with standard 13 underscores
            fill_blank = []
            fb1 = to_fill_blank(raw_ex_en)
            if fb1:
                fill_blank.append(fb1)
            fb2 = to_fill_blank(raw_colloc_ex_en)
            if fb2:
                fill_blank.append(fb2)
                
            # Distractors with VI definition
            distractors = []
            for dw in [d1, d2, d3]:
                if dw and dw != word:
                    d_obj = {"word": dw}
                    d_vi = word_to_vi.get(dw.lower())
                    if d_vi:
                        d_obj["vi"] = d_vi
                    distractors.append(d_obj)
                    
            is_b1 = raw_id.startswith("B1_")
            level_str = "B1" if is_b1 else "B2"
            prefix_id = "en-dest-b1" if is_b1 else "en-dest-b2"
            item_num = len(b1_items) + 1 if is_b1 else len(b2_items) + 1
            item_id = f"{prefix_id}-{item_num:03d}"
            
            meaning_obj = {"vi": def_vi}
            if def_en:
                meaning_obj["en"] = def_en
                
            item = {
                "id": item_id,
                "template": "english",
                "word": word,
                "ipa": ipa_str,
                "ipaBrE": ipa_str,
                "ipaAmE": ipa_str,
                "partOfSpeech": pos,
                "meaning": meaning_obj,
                "lesson": lesson_str,
                "level": level_str,
                "examples": examples
            }
            if fill_blank:
                item["fillBlank"] = fill_blank
            if collocations:
                item["collocations"] = collocations
            if word_formations:
                item["wordFormations"] = word_formations
            if distractors:
                item["distractors"] = distractors
                
            if is_b1:
                b1_items.append(item)
            else:
                b2_items.append(item)
                
        b_conn.close()
finally:
    shutil.rmtree(tmp_b1b2, ignore_errors=True)

print(f"B1 items: {len(b1_items)}")
print(f"B2 items: {len(b2_items)}")

# ==============================================================================
# 3. PROCESS C1 & C2 FROM APKG
# ==============================================================================
print("\n3. Processing C1 & C2 from APKG...")
c1c2_items = []

for idx, (nid, flds_str, did) in enumerate(c1_notes_raw):
    cols = flds_str.split('\x1f')
    word = clean_inline(cols[0]) if len(cols) > 0 else ""
    ipa = clean_inline(cols[1]) if len(cols) > 1 else ""
    pos = clean_inline(cols[2]) if len(cols) > 2 else ""
    def_vi = clean_inline(cols[3]) if len(cols) > 3 else ""
    def_en = en_definitions.get(word.lower(), "")
    
    ex1_en = clean_inline(cols[5]) if len(cols) > 5 else ""
    ex1_vi = clean_inline(cols[6]) if len(cols) > 6 else ""
    ex2_en = clean_inline(cols[7]) if len(cols) > 7 else ""
    ex2_vi = clean_inline(cols[8]) if len(cols) > 8 else ""
    
    # Normalize fillBlank to 13 underscores
    fill1 = normalize_blank(cols[14], word) if len(cols) > 14 else ""
    fill2 = normalize_blank(cols[15], word) if len(cols) > 15 else ""
    
    distractors = []
    for dw_i, dvi_i in [(16, 17), (18, 19), (20, 21), (22, 23), (24, 25)]:
        if len(cols) > dw_i:
            dw = clean_inline(cols[dw_i])
            dvi = clean_inline(cols[dvi_i]) if len(cols) > dvi_i else ""
            if not dvi:
                dvi = word_to_vi.get(dw.lower(), "")
            if dw:
                d_obj = {"word": dw}
                if dvi:
                    d_obj["vi"] = dvi
                distractors.append(d_obj)
                
    lesson_str = c1_decks_map.get(did, "Destination C1 & C2")
    ipa_str = ipa
    if ipa_str and not ipa_str.startswith('/'):
        ipa_str = f"/{ipa_str}/"
        
    examples = []
    if ex1_en:
        examples.append({"en": ex1_en, "vi": ex1_vi})
    if ex2_en:
        examples.append({"en": ex2_en, "vi": ex2_vi})
        
    fill_blank = []
    if fill1:
        fill_blank.append(fill1)
    if fill2:
        fill_blank.append(fill2)
        
    item_id = f"en-dest-c1c2-{idx+1:04d}"
    
    meaning_obj = {"vi": def_vi}
    if def_en:
        meaning_obj["en"] = def_en
        
    item = {
        "id": item_id,
        "template": "english",
        "word": word,
        "ipa": ipa_str,
        "ipaBrE": ipa_str,
        "ipaAmE": ipa_str,
        "partOfSpeech": pos,
        "meaning": meaning_obj,
        "lesson": lesson_str,
        "level": "C1",
        "examples": examples
    }
    if fill_blank:
        item["fillBlank"] = fill_blank
    if distractors:
        item["distractors"] = distractors
        
    c1c2_items.append(item)

# Write output files
b1_out = os.path.join(courses_dir, "destinationB1.json")
b2_out = os.path.join(courses_dir, "destinationB2.json")
c1c2_out = os.path.join(courses_dir, "destinationC1C2.json")

with open(b1_out, 'w', encoding='utf-8') as f:
    json.dump(b1_items, f, ensure_ascii=False, indent=2)
print(f"Saved: {b1_out} ({len(b1_items)} items, {os.path.getsize(b1_out):,} bytes)")

with open(b2_out, 'w', encoding='utf-8') as f:
    json.dump(b2_items, f, ensure_ascii=False, indent=2)
print(f"Saved: {b2_out} ({len(b2_items)} items, {os.path.getsize(b2_out):,} bytes)")

with open(c1c2_out, 'w', encoding='utf-8') as f:
    json.dump(c1c2_items, f, ensure_ascii=False, indent=2)
print(f"Saved: {c1c2_out} ({len(c1c2_items)} items, {os.path.getsize(c1c2_out):,} bytes)")

shutil.copyfile(__file__, os.path.join(r"f:\Workspace\learn-language\language-master\scratch", "convert_destination.py"))
print("Updated scratch/convert_destination.py")
