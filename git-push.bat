@echo off
cd c:\xampp\htdocs\hmnight
git config --global user.email "user@example.com"
git config --global user.name "HM Night Developer"
git add .
git commit -m "Initial commit"
git branch -M main
git remote set-url origin https://github.com/nonshas20/hmnight.git
git push -u origin main
pause
