# PowerShell script to push code to GitHub
# Run this script after Git is installed

Write-Host "Checking for Git installation..." -ForegroundColor Cyan
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git not found"
    }
    Write-Host "Git found: $gitVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "ERROR: Git is not installed or not in your PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix this:" -ForegroundColor Yellow
    Write-Host "  1. Download Git from: https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host "  2. Install Git (use default options)" -ForegroundColor Cyan
    Write-Host "  3. Restart PowerShell after installation" -ForegroundColor Cyan
    Write-Host "  4. Run this script again" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Alternative: Use GitHub Desktop instead:" -ForegroundColor Yellow
    Write-Host "  Download: https://desktop.github.com/" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "Initializing Git repository..." -ForegroundColor Green
git init

Write-Host "Adding all files..." -ForegroundColor Green
git add .

Write-Host "Creating initial commit..." -ForegroundColor Green
git commit -m "Initial commit - ready for Vercel deployment"

Write-Host "Adding remote repository..." -ForegroundColor Green
# Remove remote if it already exists
git remote remove origin 2>$null
git remote add origin https://github.com/Rah141/AI-Job-Match.git

Write-Host "Setting main branch..." -ForegroundColor Green
git branch -M main

Write-Host "Checking for existing repository content..." -ForegroundColor Green
# Try to pull existing content (like LICENSE file) if it exists
git pull origin main --allow-unrelated-histories --no-edit 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Merged with existing repository content." -ForegroundColor Yellow
    git add .
    git commit -m "Merge local code with repository" --no-edit 2>$null
}

Write-Host "Pushing to GitHub..." -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: You may need to authenticate." -ForegroundColor Yellow
Write-Host "When prompted:" -ForegroundColor Yellow
Write-Host "  Username: Rah141" -ForegroundColor Cyan
Write-Host "  Password: [Use a Personal Access Token, NOT your GitHub password]" -ForegroundColor Cyan
Write-Host ""
Write-Host "To create a token: https://github.com/settings/tokens" -ForegroundColor Gray
Write-Host "Select 'repo' scope for full repository access" -ForegroundColor Gray
Write-Host ""
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done! Your code has been pushed to GitHub." -ForegroundColor Green
    Write-Host "Repository: https://github.com/Rah141/AI-Job-Match" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Push failed. Please check:" -ForegroundColor Red
    Write-Host "  1. Git is installed and in PATH" -ForegroundColor Yellow
    Write-Host "  2. You have a Personal Access Token with 'repo' scope" -ForegroundColor Yellow
    Write-Host "  3. The repository exists and you have access" -ForegroundColor Yellow
}
