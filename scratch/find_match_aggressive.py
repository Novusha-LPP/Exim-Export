
import hashlib

def check_aggressive(file_path, target_hex):
    with open(file_path, 'rb') as f:
        d = f.read()
    text = d.decode('latin-1')
    p = text.find('<START-SIGNATURE>')
    c = d[:p]
    
    raw_text = c.decode('latin-1')
    lines = raw_text.splitlines() # Strips all \r and \n
    
    print(f"--- Aggressive Search: {file_path} ---")
    
    variations = [
        ('LF join', "\n".join(lines) + "\n"),
        ('LF join no trail', "\n".join(lines)),
        ('CRLF join', "\r\n".join(lines) + "\r\n"),
        ('Stripped lines + LF', "\n".join([l.strip() for l in lines]) + "\n"),
        ('Stripped lines + LF no trail', "\n".join([l.strip() for l in lines])),
        ('Stripped trailing + LF', "\n".join([l.rstrip() for l in lines]) + "\n"),
        ('Stripped trailing + LF no trail', "\n".join([l.rstrip() for l in lines])),
        ('Stripped FS + LF', "\n".join([l.rstrip('\x1d') for l in lines]) + "\n"),
    ]
    
    for name, v_text in variations:
        v_data = v_text.encode('latin-1')
        h = hashlib.sha1(v_data).hexdigest()
        if h == target_hex:
            print(f"MATCH: {name}")
            return
        
    print("No match found. Let's try more...")
    
    # Try removing the empty field after P in HREC
    if '\x1d\x1d' in raw_text:
        alt_text = raw_text.replace('\x1d\x1d', '\x1d')
        h = hashlib.sha1(alt_text.replace('\r\n', '\n').encode('latin-1')).hexdigest()
        if h == target_hex:
             print("MATCH: Replaced double 1D with single 1D + LF")
             return

    # Try removing trailing FS from each line
    stripped_fs_lines = [l.rstrip('\x1d') for l in lines]
    alt_text = "\n".join(stripped_fs_lines) + "\n"
    if hashlib.sha1(alt_text.encode('latin-1')).hexdigest() == target_hex:
        print("MATCH: Stripped FS from all lines + LF")
        return

    # Try keeping only FS as newline? No.
    
    print("Still no match.")

check_aggressive('server/tools/3122026Signed.sb', '0c1293c4d86a0ad42f44a61d73d5823bff91c160')
