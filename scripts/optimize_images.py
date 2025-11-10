#!/usr/bin/env python3
"""
Image optimization script for rice gallery images.
Compresses images in public/img/ to reduce file sizes while maintaining quality.
"""

import os
import sys
from pathlib import Path
from PIL import Image
import concurrent.futures
from tqdm import tqdm

def get_image_files(directory):
    """Get all image files from directory"""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    return [
        f for f in Path(directory).iterdir()
        if f.is_file() and f.suffix.lower() in image_extensions
    ]

def optimize_image(image_path, max_size_kb=500, quality=85):
    """
    Optimize a single image file.
    - max_size_kb: Target maximum file size in KB
    - quality: JPEG quality (0-100)
    """
    try:
        # Open image
        with Image.open(image_path) as img:
            original_size = image_path.stat().st_size / 1024  # Size in KB

            # Skip if already small enough
            if original_size <= max_size_kb:
                return {
                    'file': str(image_path),
                    'original_size': original_size,
                    'new_size': original_size,
                    'optimized': False,
                    'error': None
                }

            # Convert to RGB if necessary (for JPEG)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparent images
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Resize if too large (max 1920px width, maintain aspect ratio)
            max_width = 1920
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            # Save with optimization
            temp_path = image_path.with_suffix('.temp')
            img.save(temp_path, 'JPEG', quality=quality, optimize=True, progressive=True)

            # Check if file size is acceptable
            new_size = temp_path.stat().st_size / 1024

            if new_size <= max_size_kb:
                # Replace original with optimized version
                temp_path.replace(image_path)
                return {
                    'file': str(image_path),
                    'original_size': original_size,
                    'new_size': new_size,
                    'optimized': True,
                    'error': None
                }
            else:
                # Try lower quality
                temp_path.unlink()  # Remove temp file
                for q in [75, 65, 55, 45]:
                    img.save(temp_path, 'JPEG', quality=q, optimize=True, progressive=True)
                    new_size = temp_path.stat().st_size / 1024
                    if new_size <= max_size_kb:
                        temp_path.replace(image_path)
                        return {
                            'file': str(image_path),
                            'original_size': original_size,
                            'new_size': new_size,
                            'optimized': True,
                            'error': None
                        }
                    temp_path.unlink()

                # If still too large, keep original
                return {
                    'file': str(image_path),
                    'original_size': original_size,
                    'new_size': original_size,
                    'optimized': False,
                    'error': f'Could not compress below {max_size_kb}KB'
                }

            # Additional aggressive compression for very large files
            if original_size > 2048:  # If original was > 2MB
                # Try even more aggressive settings
                temp_path.unlink() if temp_path.exists() else None
                for q in [35, 25]:
                    img.save(temp_path, 'JPEG', quality=q, optimize=True, progressive=True)
                    new_size = temp_path.stat().st_size / 1024
                    if new_size <= max_size_kb:
                        temp_path.replace(image_path)
                        return {
                            'file': str(image_path),
                            'original_size': original_size,
                            'new_size': new_size,
                            'optimized': True,
                            'error': None
                        }
                    temp_path.unlink()

                # If still too large, keep original
                return {
                    'file': str(image_path),
                    'original_size': original_size,
                    'new_size': original_size,
                    'optimized': False,
                    'error': f'Could not compress below {max_size_kb}KB even with aggressive settings'
                }

    except Exception as e:
        return {
            'file': str(image_path),
            'original_size': 0,
            'new_size': 0,
            'optimized': False,
            'error': str(e)
        }

def main():
    # Directory to optimize
    img_dir = Path('../public/img')

    if not img_dir.exists():
        print(f"❌ Directory {img_dir} does not exist!")
        sys.exit(1)

    # Get all image files
    image_files = get_image_files(img_dir)
    if not image_files:
        print(f"❌ No image files found in {img_dir}")
        sys.exit(1)

    print(f"📸 Found {len(image_files)} images to optimize in {img_dir}")
    print("🎯 Target: Max 500KB per image, 1920px max width")
    # Process images with progress bar
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        # Submit all tasks
        future_to_file = {
            executor.submit(optimize_image, img_file): img_file
            for img_file in image_files
        }

        # Process results as they complete
        with tqdm(total=len(image_files), desc="Optimizing images") as pbar:
            for future in concurrent.futures.as_completed(future_to_file):
                result = future.result()
                results.append(result)
                pbar.update(1)

    # Summary
    optimized = [r for r in results if r['optimized']]
    skipped = [r for r in results if not r['optimized'] and r['error'] is None]
    errors = [r for r in results if r['error']]

    total_original = sum(r['original_size'] for r in results)
    total_new = sum(r['new_size'] for r in results)
    savings = total_original - total_new

    print("\n📊 Optimization Summary:")
    print(f"✅ Optimized: {len(optimized)} images")
    print(f"⏭️  Skipped (already small): {len(skipped)} images")
    print(f"❌ Errors: {len(errors)} images")
    print(f"📁 Total original size: {total_original:.1f} KB")
    print(f"📁 Total new size: {total_new:.1f} KB")
    print(f"💾 Space savings: {savings:.1f} KB")
    if savings > 0:
        print(f"📉 Compression ratio: {(savings/total_original*100):.1f}%")
    else:
        print("📈 No space savings achieved")
    if errors:
        print("\n⚠️  Errors encountered:")
        for error in errors[:5]:  # Show first 5 errors
            print(f"  - {error['file']}: {error['error']}")
        if len(errors) > 5:
            print(f"  ... and {len(errors) - 5} more")

if __name__ == "__main__":
    main()