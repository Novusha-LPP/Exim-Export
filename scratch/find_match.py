
import hashlib

def check(file_path, target_hex):
    with open(file_path, 'rb') as f:
        d = f.read()
    text = d.decode('latin-1')
    p = text.find('<START-SIGNATURE>')
    c = d[:p]
    
    variants = [
        ('raw', c),
        ('crlf->lf', c.replace(b'\r\n', b'\n')),
        ('lf->crlf', c.replace(b'\n', b'\r\n').replace(b'\r\r\n', b'\r\n')),
        ('raw no trailing', c.rstrip(b'\r\n')),
        ('lf no trailing', c.replace(b'\r\n', b'\n').rstrip(b'\n')),
        ('crlf no trailing', c.replace(b'\n', b'\r\n').replace(b'\r\r\n', b'\r\n').rstrip(b'\r\n')),
    ]
    
    print(f"--- File: {file_path} ---")
    print(f"Target: {target_hex}")
    for name, data in variants:
        h = hashlib.sha1(data).hexdigest()
        status = "MATCH" if h == target_hex else "FAIL"
        print(f"{name:20}: {h} {status}")

# nCode Success File
check('server/tools/3122026Signed.sb', '0c1293c4d86a0ad42f44a61d73d5823bff91c160')

# Our Fail File
check('server/tools/AMD_EXP_SEA_00312_26-27_SB.sb', '005013fe59da6c39569d3db1c7657f6adfab92c5')
