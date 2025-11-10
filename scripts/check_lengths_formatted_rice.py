import json

# Load the JSON data
with open('../data/formatted_rices.json', 'r') as f:
    data = json.load(f)

# Iterate through each rice entry
for item in data:
    screenshots_len = len(item.get('screenshots', []))
    images_len = len(item.get('images', []))
    if screenshots_len != images_len:
        print(item['dotfiles'])