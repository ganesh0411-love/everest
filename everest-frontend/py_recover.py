import json
import os

with open('../all_edits_clean.json', 'r', encoding='utf-8') as f:
    edits = json.load(f)

path = 'c:/Users/DELL/Desktop/Everest/everest-frontend/src/components/AdminDashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

count = 0
for e in edits:
    try:
        if e['name'] == 'write_to_file' and 'code' in e:
            if '<truncated' not in e['code']:
                content = e['code'].replace('\r\n', '\n')
                count += 1
        elif e['name'] == 'replace_file_content' and 'tc' in e and 'rep' in e:
            tc = e['tc'].replace('\r\n', '\n')
            rep = e['rep'].replace('\r\n', '\n')
            if '<truncated' not in rep and tc in content:
                content = content.replace(tc, rep)
                count += 1
        elif e['name'] == 'multi_replace_file_content' and 'chunks' in e:
            chunks_str = e['chunks']
            if '<truncated' in chunks_str:
                continue
            if isinstance(chunks_str, str):
                chunks = json.loads(chunks_str)
            else:
                chunks = chunks_str
            for chunk in chunks:
                tc = chunk.get('TargetContent', '').replace('\r\n', '\n')
                rep = chunk.get('ReplacementContent', '').replace('\r\n', '\n')
                if tc and tc in content:
                    content = content.replace(tc, rep)
                    count += 1
    except Exception as ex:
        print(f"Failed to apply edit: {ex}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Replayed {count} successful edits!")
