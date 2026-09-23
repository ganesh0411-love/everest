import sys
with open(r"C:\Users\DELL\Desktop\Everest\everest-frontend\src\components\AdminDashboard.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "svg viewBox=\"0 0 100 100\"" in line:
        print(f"--- Line {i} ---")
        for j in range(i-10, i+40):
            print(lines[j].rstrip())
        break