
import hashlib

def find_any_subset(file_path, target_hex):
    with open(file_path, 'rb') as f:
        d = f.read()
    text = d.decode('latin-1')
    p = text.find('<START-SIGNATURE>')
    c = d[:p]
    
    lines = c.decode('latin-1').splitlines()
    
    print(f"--- Subset Search: {file_path} ---")
    
    # Try all start/end line combinations
    for i in range(len(lines)):
        for j in range(i + 1, len(lines) + 1):
            subset_lines = lines[i:j]
            
            # Try LF join
            sub_lf = "\n".join(subset_lines) + "\n"
            if hashlib.sha1(sub_lf.encode('latin-1')).hexdigest() == target_hex:
                print(f"MATCH FOUND: Lines {i+1} to {j} (LF join)")
                return
            
            # Try CRLF join
            sub_crlf = "\r\n".join(subset_lines) + "\r\n"
            if hashlib.sha1(sub_crlf.encode('latin-1')).hexdigest() == target_hex:
                print(f"MATCH FOUND: Lines {i+1} to {j} (CRLF join)")
                return

    print("No subset match found.")

find_any_subset('server/tools/3122026Signed.sb', '0c1293c4d86a0ad42f44a61d73d5823bff91c160')
