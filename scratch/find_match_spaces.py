
import hashlib
import re

def check_spaces(file_path, target_hex):
    with open(file_path, 'rb') as f:
        d = f.read()
    text = d.decode('latin-1')
    p = text.find('<START-SIGNATURE>')
    c = d[:p]
    
    raw_text = c.decode('latin-1')
    
    print(f"--- Space Search: {file_path} ---")
    
    # Try replacing multiple spaces with single space
    v1 = re.sub(r' +', ' ', raw_text).replace('\r\n', '\n')
    if hashlib.sha1(v1.encode('latin-1')).hexdigest() == target_hex:
        print("MATCH: Multiple spaces -> Single space + LF")
        return
        
    # Try removing ALL trailing spaces on EVERY line
    lines = raw_text.splitlines()
    v2 = "\n".join([l.rstrip() for l in lines]) + "\n"
    if hashlib.sha1(v2.encode('latin-1')).hexdigest() == target_hex:
        print("MATCH: Rstrip every line + LF")
        return

    # Try removing the 1D FS from the end of HREC/TREC lines if present
    # (Sometimes ICEGATE tools don't like trailing FS)
    v3 = "\n".join([l.rstrip('\x1d') for l in lines]) + "\n"
    if hashlib.sha1(v3.encode('latin-1')).hexdigest() == target_hex:
        print("MATCH: Strip trailing FS + LF")
        return

    print("No match found.")

check_spaces('server/tools/3122026Signed.sb', '0c1293c4d86a0ad42f44a61d73d5823bff91c160')
