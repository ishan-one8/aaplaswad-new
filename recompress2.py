import os
import glob
from PIL import Image

def get_original(jpg_path):
    basename = os.path.basename(jpg_path)
    base_no_ext = basename.rsplit('.', 1)[0].replace('-', '_')
    
    # special cases
    mapping = {
        'veg_schezwan_rice': 'schezwan_rice',
        'veg_schezwan_paneer_rice': 'schezwan_paneer_rice',
        'veg_schezwan_noodles': 'schezwan_noodles',
        'soya_bean_masala_roll': 'soya_roll', # guessing soya_roll artifact maps to soya-bean-masala-roll
    }
    if base_no_ext in mapping:
        base_no_ext = mapping[base_no_ext]
    
    artifacts_dir = '/Users/dhirajrathod/.gemini/antigravity-ide/brain/4be1d255-8b12-4198-8ce5-c088f8b2c3cf/'
    
    matches = glob.glob(os.path.join(artifacts_dir, f"{base_no_ext}_*.jpg"))
    if matches:
        return matches[0]
            
    return None

jpg_files = []
for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or 'www' in root or '.vercel' in root or 'staff' in root:
        continue
    for f in files:
        if f.endswith('.jpg'):
            jpg_files.append(os.path.join(root, f))

processed = 0
for jpg in jpg_files:
    # only process if size is less than 30k (meaning it wasn't recompressed in pass 1)
    if os.path.getsize(jpg) < 30000:
        orig = get_original(jpg)
        if orig:
            print(f"Recompressing {jpg} from {orig}")
            img = Image.open(orig)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            if img.width > 1000:
                ratio = 1000.0 / img.width
                new_size = (1000, int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            img.save(jpg, 'JPEG', quality=85, optimize=True)
            processed += 1
        
print(f"Processed {processed} more images.")
