import re
from pathlib import Path

html = Path('index.html').read_text(encoding='utf-8')
script = Path('script.js').read_text(encoding='utf-8')

html_ids = set(re.findall(r'id="([^"]+)"', html))
script_ids = set(re.findall(r"getElementById\('([^']+)'\)|getElementById\(\"([^\"]+)\"\)", script))
script_ids = {t for pair in script_ids for t in pair if t}

missing = sorted(script_ids - html_ids)

print('Referenced IDs:', len(script_ids))
print('HTML IDs:', len(html_ids))
print('Missing IDs:', len(missing))
print()

if missing:
    for m in missing:
        print(f'MISSING: {m}')
else:
    print('All referenced IDs exist in HTML.')
