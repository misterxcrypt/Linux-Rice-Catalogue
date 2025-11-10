import json
import requests
import uuid
import os
from urllib.parse import urlparse

# Load the JSON data
with open('../data/formatted_rices.json', 'r') as f:
    data = json.load(f)

# Process each item
for item in data:
    images = []
    for url in item.get('screenshots', []):
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                # Get file extension from URL
                parsed = urlparse(url)
                ext = os.path.splitext(parsed.path)[1]
                if not ext:
                    ext = '.png'  # Default extension if none found

                # Generate 32-character UUID
                uid = uuid.uuid4().hex
                filename = f"{uid}{ext}"
                filepath = f"../data/img/{filename}"

                # Save the image
                with open(filepath, 'wb') as img_file:
                    img_file.write(response.content)

                images.append(filename)
                print(f"Downloaded and saved: {filename}")
            else:
                print(f"Failed to download {url} (status: {response.status_code})")
        except Exception as e:
            print(f"Error downloading {url}: {e}")

    # Add the images array to the item
    item['images'] = images

# Save the updated JSON
with open('../data/formatted_rices.json', 'w') as f:
    json.dump(data, f, indent=2)

print("All images downloaded and JSON updated.")