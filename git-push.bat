@echo off
cd c:\xampp\htdocs\hmnight
git config --global user.email "user@example.com"
git config --global user.name "HM Night Developer"
git add .
git commit -m "Improve barcode modal mobile responsiveness"
git branch -M main
git push -u origin main
pause
