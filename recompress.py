import os
import glob
from PIL import Image

def get_original(jpg_path):
    # check for png
    png_path = jpg_path.rsplit('.', 1)[0] + '.png'
    if os.path.exists(png_path):
        return png_path
    
    # Check artifacts
    basename = os.path.basename(jpg_path)
    base_no_ext = basename.rsplit('.', 1)[0].replace('-', '_')
    
    # special cases
    if base_no_ext == 'veg_manchurian_noodles': base_no_ext = 'manchurian_noodles'
    if base_no_ext == 'veg_manchurian_rice': base_no_ext = 'manchurian_rice'
    if base_no_ext == 'veg_paneer_noodles': base_no_ext = 'paneer_noodles'
    if base_no_ext == 'veg_paneer_rice': base_no_ext = 'paneer_rice'
    
    artifacts_dir = '/Users/dhirajrathod/.gemini/antigravity-ide/brain/4be1d255-8b12-4198-8ce5-c088f8b2c3cf/'
    
    # Try exact prefix match
    matches = glob.glob(os.path.join(artifacts_dir, f"{base_no_ext}_*.jpg"))
    if matches:
        return matches[0]
        
    # If not found, try partial match
    for f in glob.glob(os.path.join(artifacts_dir, "*.jpg")):
        fname = os.path.basename(f)
        if base_no_ext in fname:
            return f
            
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
    orig = get_original(jpg)
    if orig:
        print(f"Recompressing {jpg} from {orig}")
        img = Image.open(orig)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if width > 1000
        if img.width > 1000:
            ratio = 1000.0 / img.width
            new_size = (1000, int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            
        img.save(jpg, 'JPEG', quality=85, optimize=True)
        processed += 1
    else:
        print(f"Original not found for {jpg}")
        
print(f"Processed {processed} images.")
