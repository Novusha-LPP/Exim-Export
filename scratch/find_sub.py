
import hashlib

def check_substrings(file_path, target_hex):
    with open(file_path, 'rb') as f:
        d = f.read()
    text = d.decode('latin-1')
    p = text.find('<START-SIGNATURE>')
    c = d[:p]
    
    print(f"--- Substring Search: {file_path} ---")
    
    # Try all line ranges
    lines = c.splitlines(keepends=True)
    for i in range(len(lines)):
        for j in range(i + 1, len(lines) + 1):
            sub = b"".join(lines[i:j])
            h = hashlib.sha1(sub).hexdigest()
            if h == target_hex:
                print(f"MATCH FOUND! Lines {i+1} to {j}")
                print(f"Content: {sub[:50]!r} ... {sub[-50:]!r}")
                return
            
            # Try without trailing newline on last line
            sub_no_nl = sub.rstrip(b'\r\n')
            h2 = hashlib.sha1(sub_no_nl).hexdigest()
            if h2 == target_hex:
                print(f"MATCH FOUND (No trailing)! Lines {i+1} to {j}")
                return

    print("No substring match found.")

check_substrings('server/tools/3122026Signed.sb', '0c1293c4d86a0ad42f44a61d73d5823bff91c160')
