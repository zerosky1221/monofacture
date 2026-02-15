import re
import os
import glob

PRESERVE_PATTERNS = [
    '@ts-ignore',
    '@ts-expect-error',
    '@ts-nocheck',
    'eslint-disable',
    'eslint-enable',
]

def should_preserve_comment(comment_text):
    for pattern in PRESERVE_PATTERNS:
        if pattern in comment_text:
            return True
    return False

def remove_comments(source):
    result = []
    i = 0
    n = len(source)

    while i < n:
        if source[i] in ('"', "'", '`'):
            quote = source[i]
            result.append(source[i])
            i += 1
            if quote == '`':
                depth = 0
                while i < n:
                    if source[i] == '\\' and i + 1 < n:
                        result.append(source[i])
                        result.append(source[i+1])
                        i += 2
                    elif source[i] == '$' and i + 1 < n and source[i+1] == '{':
                        result.append(source[i])
                        result.append(source[i+1])
                        i += 2
                        depth += 1
                    elif source[i] == '{' and depth > 0:
                        result.append(source[i])
                        i += 1
                        depth += 1
                    elif source[i] == '}' and depth > 0:
                        result.append(source[i])
                        i += 1
                        depth -= 1
                    elif source[i] == '`' and depth == 0:
                        result.append(source[i])
                        i += 1
                        break
                    else:
                        result.append(source[i])
                        i += 1
            else:
                while i < n:
                    if source[i] == '\\' and i + 1 < n:
                        result.append(source[i])
                        result.append(source[i+1])
                        i += 2
                    elif source[i] == quote:
                        result.append(source[i])
                        i += 1
                        break
                    elif source[i] == '\n':
                        result.append(source[i])
                        i += 1
                        break
                    else:
                        result.append(source[i])
                        i += 1
        elif source[i] == '/' and i + 1 < n and source[i+1] == '/':
            comment_text = ''
            while i < n and source[i] != '\n':
                comment_text += source[i]
                i += 1
            if should_preserve_comment(comment_text):
                result.append(comment_text)
            else:
                while result and result[-1] in (' ', '\t'):
                    result.pop()
        elif source[i] == '/' and i + 1 < n and source[i+1] == '*':
            comment_text = '/*'
            i += 2
            while i < n:
                if source[i] == '*' and i + 1 < n and source[i+1] == '/':
                    comment_text += '*/'
                    i += 2
                    break
                else:
                    comment_text += source[i]
                    i += 1
            if should_preserve_comment(comment_text):
                result.append(comment_text)
            else:
                while result and result[-1] in (' ', '\t'):
                    result.pop()
        else:
            result.append(source[i])
            i += 1

    return ''.join(result)

def clean_blank_lines(text):
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        cleaned.append(line.rstrip())

    result = []
    prev_blank = False
    for line in cleaned:
        if line == '':
            if prev_blank:
                continue
            prev_blank = True
        else:
            prev_blank = False
        result.append(line)

    while result and result[-1] == '':
        result.pop()

    text = '\n'.join(result)
    if text and not text.endswith('\n'):
        text += '\n'
    return text

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    processed = remove_comments(content)
    processed = clean_blank_lines(processed)

    if processed != original:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(processed)
        return True
    return False

def main():
    base_dir = r'D:/Monofacture/apps/api/src/modules'
    files = glob.glob(os.path.join(base_dir, '**', '*.ts'), recursive=True)
    files.sort()

    modified_count = 0
    total_count = len(files)

    for filepath in files:
        filepath = filepath.replace('\\', '/')
        changed = process_file(filepath)
        if changed:
            modified_count += 1
            print(f"  Modified: {filepath}")

    print(f"\nProcessed {total_count} files, modified {modified_count} files.")

if __name__ == '__main__':
    main()
