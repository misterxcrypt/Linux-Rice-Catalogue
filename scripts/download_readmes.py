import requests
import os

# Read GitHub URLs from file
with open('../data/temp/github.txt', 'r') as f:
    repos = [line.strip() for line in f if line.strip()]

# Ensure the readme directory exists
os.makedirs('../data/readme', exist_ok=True)

# Function to download README.md
def download_readme(owner, repo, branch):
    readme_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/README.md"
    response = requests.get(readme_url)
    if response.status_code == 200:
        return response.text
    else:
        return None

# Process each repo
for repo_url in repos:
    parts = repo_url.split('/')
    owner = parts[-2]
    repo = parts[-1]

    # Try to download README.md, first assuming 'main', then 'master'
    readme_content = None
    for branch in ['main', 'master']:
        readme_content = download_readme(owner, repo, branch)
        if readme_content:
            break
    if not readme_content:
        print(f"Failed to download README for {repo_url}")
        continue

    # Save the README as author.md
    filename = f'../data/readme/{owner}.md'
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(readme_content)
    print(f"Downloaded README for {owner}")

print("All README downloads completed.")