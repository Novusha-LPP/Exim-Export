
import hashlib
import re

def check_logic(file_path, target_hex):
    with open(file_path, 'rb') as f:
        d = f.read()
    text = d.decode('latin-1')
    p = text.find('<START-SIGNATURE>')
    c = d[:p]
    
    lines = c.decode('latin-1').splitlines()
    
    print(f"--- Logic Search: {file_path} ---")
    
    # Variant 1: Only lines starting with HREC, TREC, or F (the actual data records)
    data_lines = [l for l in lines if l.startswith('HREC') or l.startswith('TREC') or l.startswith('F')]
    
    variations = [
        ('Data lines only + LF', "\n".join(data_lines) + "\n"),
        ('Data lines only no trail', "\n".join(data_lines)),
        ('Data lines stripped + LF', "\n".join([l.rstrip('\x1d') for l in data_lines]) + "\n"),
        ('All lines except <TABLE> + LF', "\n".join([l for l in lines if not l.startswith('<TABLE')]) + "\n"),
    ]
    
    for name, v_text in variations:
        v_data = v_text.encode('latin-1')
        h = hashlib.sha1(v_data).hexdigest()
        if h == target_hex:
            print(f"MATCH: {name}")
            return

    # Variant 2: Maybe it replaces FS with spaces?
    for name, v_text in variations:
        v_data_alt = v_text.replace('\x1d', ' ').encode('latin-1')
        if hashlib.sha1(v_data_alt).hexdigest() == target_hex:
            print(f"MATCH: {name} (FS -> space)")
            return

    print("No match found.")

check_logic('server/tools/3122026Signed.sb', '0c1293c4d86a0ad42f44a61d73d5823bff91c160')
