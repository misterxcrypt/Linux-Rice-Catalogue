import json

# Load the JSON data
with open('../data/formatted_rices.json', 'r') as f:
    data = json.load(f)

# List to hold objects where screenshots and images lengths are equal
filtered_data = []

# Iterate through each rice entry
for item in data:
    screenshots_len = len(item.get('screenshots', []))
    images_len = len(item.get('images', []))
    if screenshots_len == images_len:
        filtered_data.append(item)

# Write the filtered data to a new JSON file
with open('../data/new_rices_with_images.json', 'w') as f:
    json.dump(filtered_data, f, indent=4)

print(f"Filtered {len(filtered_data)} entries where screenshots and images lengths are equal.")