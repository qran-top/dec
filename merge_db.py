import os
import sys
import zlib
import struct
import sqlite3

def check_or_extract():
    db_dir = os.path.join(os.path.dirname(__file__), 'db')
    if not os.path.exists(db_dir):
        print(f"Directory {db_dir} not found.")
        return False

    first_part = os.path.join(db_dir, 'db.z01')
    second_part = os.path.join(db_dir, 'db.z02')
    third_part = os.path.join(db_dir, 'db.z03')
    zip_part = os.path.join(db_dir, 'db.zip')

    parts = [first_part, second_part, third_part, zip_part]
    present_parts = [p for p in parts if os.path.exists(p)]

    print(f"Status in db/ directory ({len(present_parts)}/4 files):")
    for p in parts:
        name = os.path.basename(p)
        if os.path.exists(p):
            sz = os.path.getsize(p)
            print(f"  ✓ {name}: {sz:,} bytes ({sz / (1024*1024):.2f} MB)")
        else:
            print(f"  ✗ {name}: Missing")

    missing = [os.path.basename(p) for p in parts if not os.path.exists(p)]
    if missing:
        print(f"\nWaiting for missing files: {', '.join(missing)}")
        return False

    print("\nAll 4 parts are present! Extracting SQLite database...")
    
    # Read header from db.z01
    with open(first_part, 'rb') as f:
        span = f.read(4)
        if span == b'PK\x07\x08':
            offset = 4
        else:
            offset = 0
            f.seek(0)

        local = f.read(30)
        sig, ver, flag, method, mtime, mdate, crc, csize, usize, fn_len, extra_len = struct.unpack('<4sHHHHHIIIHH', local)
        filename = f.read(fn_len).decode('utf-8', errors='ignore')
        f.read(extra_len)
        data_start_offset = offset + 30 + fn_len + extra_len

    print(f"Target: {filename}, Compressed: {csize:,} bytes, Uncompressed: {usize:,} bytes")

    out_path = os.path.join(db_dir, 'db.sqlite')
    decomp = zlib.decompressobj(-15)

    bytes_read = 0
    bytes_written = 0
    with open(out_path, 'wb') as out_f:
        for idx, p in enumerate(parts):
            with open(p, 'rb') as in_f:
                if idx == 0:
                    in_f.seek(data_start_offset)
                while True:
                    to_read = min(65536, csize - bytes_read)
                    if to_read <= 0:
                        break
                    chunk = in_f.read(to_read)
                    if not chunk:
                        break
                    bytes_read += len(chunk)
                    out_chunk = decomp.decompress(chunk)
                    if out_chunk:
                        out_f.write(out_chunk)
                        bytes_written += len(out_chunk)

        final_chunk = decomp.flush()
        if final_chunk:
            out_f.write(final_chunk)
            bytes_written += len(final_chunk)

    print(f"Extraction complete! Created {out_path} ({bytes_written:,} bytes).")

    # Verify SQLite integrity
    print("Verifying database integrity...")
    try:
        conn = sqlite3.connect(out_path)
        cur = conn.cursor()
        cur.execute("PRAGMA integrity_check;")
        res = cur.fetchone()[0]
        print(f"Integrity check: {res}")
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cur.fetchall()]
        print(f"Tables: {tables}")
        for t in tables:
            cur.execute(f"SELECT count(*) FROM {t};")
            count = cur.fetchone()[0]
            print(f"  - {t}: {count:,} rows")
        conn.close()
        return True
    except Exception as e:
        print(f"SQLite check failed: {e}")
        return False

if __name__ == '__main__':
    check_or_extract()
