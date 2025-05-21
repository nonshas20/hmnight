Write-Host "Initializing git repository..."
git init
Write-Host "Adding all files..."
git add .
Write-Host "Committing changes..."
git commit -m "Initial commit"
Write-Host "Setting up remote..."
git remote add origin https://github.com/nonshas20/hmnight.git
Write-Host "Pushing to GitHub..."
git push -u origin master
Write-Host "Done!"
