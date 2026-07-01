import re

with open('src/components/AdminDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract cadNodes memo block
start_idx = content.find('  const cadNodes = React.useMemo(() => {')
if start_idx == -1:
    print('cadNodes not found')
    exit(1)

end_str = '  }, [visibleCadLines, cadCircles]);\n'
end_idx = content.find(end_str, start_idx) + len(end_str)

cad_nodes_block = content[start_idx:end_idx]

# Remove cadNodes from its original location
new_content = content[:start_idx] + content[end_idx:]

# Insert it before cadComputedArea
target_str = '  const cadComputedArea = React.useMemo(() => {'
insert_idx = new_content.find(target_str)
if insert_idx == -1:
    print('cadComputedArea not found')
    exit(1)

new_content = new_content[:insert_idx] + cad_nodes_block + '\n' + new_content[insert_idx:]

with open('src/components/AdminDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Moved cadNodes successfully!')
