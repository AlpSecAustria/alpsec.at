---
author: Aryt3
pubDatetime: 2025-05-01T19:00:00Z
title: ACSC Simplesample Writeup
slug: acsc-simplesample
featured: true
draft: false
tags:
    - ACSC
    - web
description:
    A Writeup and Walkthrough of the ACSC Simplesample challenge.
---


# Simplesample

## Description

```
We have gained access to the genome browser of a large pharmaceutical company. 
I'm sure they're hiding something in there.
```

## Provided Files

```
- simplesample.zip
```

## Writeup

Starting off, I inspected the provided code. 

*Main Application Code:*
```py
import os
import sqlite3
from datetime import timedelta

from flask import Flask, render_template, request
from decorators import compressed, rate_limited


WEB_PORT = int(os.getenv("WEB_PORT", "5000"))
FLAG = os.getenv("FLAG")
RATE_LIMIT = timedelta(seconds=int(os.getenv("RATE_LIMIT_SECONDS", 5)))  # don't want abuse of our api


DATABASE = 'genomes.db'
def get_db_connection():
    conn = sqlite3.connect(f"file:{DATABASE}?mode=ro")
    conn.row_factory = sqlite3.Row  # so we can access columns by name
    return conn


def add_flag():
    conn = sqlite3.connect(f"file:{DATABASE}?mode=rw")
    conn.execute("INSERT INTO genomes (name, description, sequence, restricted) VALUES (?, ?, ?, ?)", ("ACSC", "Unknown mutation, under evaluation", FLAG, 1))
    conn.commit()
    conn.close()


app = Flask(__name__)


@app.route('/', methods=['GET'])
@rate_limited(RATE_LIMIT)
@compressed
def index():
    query = request.args.get('query')
    had_query = bool(query)
    if not query:  # display default query
        query = "GGAGGTGGGTTCGAGCCCAACTTCATGCTCTTCGAGAAGTGCGAGGTGAACGGTGCGGGG"

    try:
        conn = get_db_connection()
        results = conn.execute(f"SELECT * FROM genomes WHERE sequence LIKE '%{query}%'").fetchall()
        conn.close()
    except sqlite3.OperationalError:
        results = []

    if any(result['restricted'] == 1 for result in results):
        results = [{"id": -1, "sequence": "Restricted results"}]
    elif len(results) > 4:
        results = [{"id": -1, "sequence": "Too many results"}]

    if not had_query:  # no need to show default query
        query = None

    return render_template('index.html', results=results, query=query)


if __name__ == '__main__':
    add_flag()
    app.run("0.0.0.0", port=WEB_PORT, debug=False)
```

The flag was inserted into the genomes table which we can filter. <br/>
Additionally a `restricted` parameter was added so that we can't just simply grab the flag. <br/>
Our query filters the `genomes` based on the `sequence` column where the flag is also stored in. <br/>
Knowing this we could theoretically bruteforce the flag character by character exploiting the `'%'` sql-syntax and knowing the prefix `dach2025{`. <br/>
If the flag would be returned we would get the error `Restricted results` otherwise we would get no results. <br/> 

Inside the `Index` API-endpoint an `f-string` is being used for sql-query which indicates an SQLi. <br/>
To extract the flag we can simply use a `UNION-SQLi` by grabbing the flag and setting the restricted parameter to false. <br/>
Using the query `aaaaa' UNION SELECT NULL, NULL, NULL, sequence, 2 FROM genomes where sequence LIKE 'dach2025{%'; --` sets `restricted` column to false returning the actual flag and solving the challenge. <br/>

```
dach2025{infosec_in_biosec_is_not_that_easy_it_seems_08yi8cigt7ofc0hx}
```
