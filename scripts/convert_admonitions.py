#!/usr/bin/env python3
"""Convert MkDocs !!! admonitions to Docusaurus ::: syntax."""
import re
import os
import sys

# MkDocs type → Docusaurus type mapping
TYPE_MAP = {
    'abstract': 'info', 'summary': 'info', 'tldr': 'info',
    'question': 'tip', 'help': 'tip', 'faq': 'tip',
    'bug': 'danger', 'failure': 'danger', 'fail': 'danger', 'missing': 'danger',
    'success': 'tip', 'check': 'tip', 'done': 'tip',
    'quote': 'note', 'cite': 'note',
    'example': 'note',
}

def collect_admonition_block(lines, start_idx):
    content_lines = []
    i = start_idx + 1
    while i < len(lines):
        line = lines[i]
        if line.startswith('    ') or line.strip() == '':
            content_lines.append(line[4:] if line.startswith('    ') else '')
            i += 1
        else:
            break
    return content_lines, i

def convert_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    out = []
    i = 0
    changed = False
    while i < len(lines):
        line = lines[i]
        m = re.match(r'^!!!\s+(\w+)(?:\s+"([^"]*)")?\s*\n?$', line)
        if m:
            admon_type = m.group(1).lower()
            title = m.group(2) or ''
            docus_type = TYPE_MAP.get(admon_type, admon_type)
            content_lines, next_i = collect_admonition_block(lines, i)
            while content_lines and content_lines[-1].strip() == '':
                content_lines.pop()
            content = ''.join(content_lines).rstrip('\n')
            if title:
                out.append(f':::{docus_type}[{title}]\n\n{content}\n\n:::\n')
            else:
                out.append(f':::{docus_type}\n\n{content}\n\n:::\n')
            i = next_i
            changed = True
        else:
            out.append(line)
            i += 1
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(out)
        print(f'Converted: {path}')
    return changed

def main():
    targets = sys.argv[1:] if len(sys.argv) > 1 else ['docs']
    total = 0
    for target in targets:
        if os.path.isdir(target):
            for root, _, files in os.walk(target):
                for fname in sorted(files):
                    if fname.endswith('.md'):
                        if convert_file(os.path.join(root, fname)):
                            total += 1
        elif os.path.isfile(target):
            if convert_file(target):
                total += 1
    print(f'\nConverted {total} file(s).')

if __name__ == '__main__':
    main()
