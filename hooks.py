"""MkDocs build hook: copies core/ files into docs/ with link transformation."""
import shutil
import os
import re

COPY_MAP = [
    ('core/docs', 'reference'),
    ('core/examples', 'examples'),
    ('core/templates', 'templates'),
]


def on_pre_build(config):
    """Copy files from core/ to docs/ and transform back-links."""
    docs_dir = config['docs_dir']
    root_dir = os.path.dirname(docs_dir)
    for src_rel, dst_name in COPY_MAP:
        src = os.path.join(root_dir, src_rel)
        dst = os.path.join(docs_dir, dst_name)
        if os.path.exists(dst):
            shutil.rmtree(dst)
        if os.path.exists(src):
            shutil.copytree(src, dst)
            _transform_links(dst, dst_name)


def _transform_links(directory, dest_name):
    """Fix back-links in copied files for MkDocs context."""
    for root, dirs, files in os.walk(directory):
        for fname in files:
            if not fname.endswith('.md'):
                continue
            fpath = os.path.join(root, fname)
            # Calculate depth: reference/FILE.md = depth 0, examples/sub/FILE.md = depth 1
            rel = os.path.relpath(fpath, directory)
            depth = rel.count(os.sep)
            prefix = '../' * (depth + 1)  # +1 to go from dest dir up to docs root
            with open(fpath, 'r') as f:
                content = f.read()
            # Transform ../../docs/FILE.md and similar patterns
            # Replace paths that go up to repo root then into docs/
            content = re.sub(
                r'\((\.\./)+docs/([^)]+)\)',
                lambda m: f'({prefix}{m.group(2)})',
                content
            )
            # Transform ../../README.md → {prefix}index.md
            content = re.sub(
                r'\((\.\./)+README\.md\)',
                f'({prefix}index.md)',
                content
            )
            with open(fpath, 'w') as f:
                f.write(content)
