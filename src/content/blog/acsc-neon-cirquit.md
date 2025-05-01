---
author: Aryt3
pubDatetime: 2025-05-01
title: ACSC Neon-Cirquit Writeup
slug: acsc-neon-cirquit
featured: true
draft: false
tags:
    - ACSC
    - rev
description:
    The solution of the ACSC Neon-Cirquit challenge
---

# neon-cirquit 

## Description
```
In the sprawling digital metropolis of NEXUS-42, a mysterious app called Neon Circuit has surfaced, claiming to provide untraceable access to the dark net. 
Your mission: infiltrate its native add-in, uncover the secrets hidden in its code, and expose the shadowy figure behind the chaos.
```

## Provided Files
```
- neon-cirquit-1.0.0.AppImage
```

## Writeup

Starting off, I inspected the AppImage and soon found files indicating that it's probably an electron binary. <br/>
```sh
./neon-cirquit-1.0.0.AppImage --appimage-extract
...
squashfs-root/resources
squashfs-root/resources/app.asar
...
```

Extracting the code of the `app.asar` file: <br/>
```sh
$ npx asar extract squashfs-root/resources/app.asar extracted_app
```

Found `function-call` to check the password in the extracted app.
```js
console.log('Preload script loaded!');

const { contextBridge } = require('electron');

const nativeAddon = require('./native-addon/build/Release/addon.node');

contextBridge.exposeInMainWorld('nativeAddon', {
  checkPassword: (password) => nativeAddon.checkPassword(password),
});
console.log('Native addon loaded:', nativeAddon);
```

Checking the origin of the password-check I realized that the `addon.node` would probably contain the password. <br/>
```js
const nativeAddon = require('./extracted_app/native-addon/build/Release/addon.node');
const readline = require('readline');

// Create an interface to read input from the user
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Password: ', (password) => {
    console.log(nativeAddon.checkPassword(password)); // Call the addon function
    rl.close(); // Close the readline interface
});
```

To extract the password from the `addon` I used `gdb` to debug the binary. 
For this purpose I set up a simple `javascript program` with `node.js` which would ask for a password input and then call the binary to validate it. 
Once executed (*node test.js*) and prompted for a password I used `gdb -p PID` to debug the process containing the `addon.node`. <br/>

To get the flag, I used the following methodology (This works because the flag has to be loaded into memory at some point to compare to our input). <br/> 
- Break on password check function <br/>
- step through the function <br/>
- print registers and hex-decode them until you get the flag. <br/>

This is probably a stupid way to do it, but I was too lazy to think of another method at 1:00 AM. <br/>
```sh
(gdb) break CheckPassword
Breakpoint 1 at 0x7e81e2316a24
(gdb) c
Continuing.

Thread 1 "MainThread" hit Breakpoint 1, 0x00007e81e2316a24 in CheckPassword(Napi::CallbackInfo const&) ()
   from /home/aryt3/Hacking/CTFs/acsc_qualy_2025/neon-cirquit/extracted_app/native-addon/build/Release/addon.node
(gdb) step
Single stepping until exit from function _Z13CheckPasswordRKN4Napi12CallbackInfoE,
which has no line number information.
__cxxabiv1::__cxa_guard_acquire (g=0x7e81e231d1e0) at /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/guard.cc:273
warning: 273	/usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/guard.cc: No such file or directory
(gdb) step
278	in /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/guard.cc
(gdb) step
__test_and_acquire (g=0x7e81e231d1e0) at /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/guard.cc:149
149	in /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/guard.cc
(gdb) step
__cxxabiv1::__cxa_guard_acquire (g=0x7e81e231d1e0) at /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/guard.cc:151
151	in /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/guard.cc
(gdb) step
__cxxabiv1::__cxa_guard_acquire (g=0x7e81e231d1e0) at /usr/src/debug/gcc/gcc-build/x86_64-pc-linux-gnu/libstdc++-v3/include/ext/atomicity.h:52
warning: 52	/usr/src/debug/gcc/gcc-build/x86_64-pc-linux-gnu/libstdc++-v3/include/ext/atomicity.h: No such file or directory
(gdb) step
__cxxabiv1::__cxa_guard_acquire (g=0x7e81e231d1e0) at /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/guard.cc:311
warning: 311	/usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/guard.cc: No such file or directory
(gdb) step
0x00007e81e2317326 in CheckPassword(Napi::CallbackInfo const&) ()
   from /home/aryt3/Hacking/CTFs/acsc_qualy_2025/neon-cirquit/extracted_app/native-addon/build/Release/addon.node
(gdb) step
Single stepping until exit from function _Z13CheckPasswordRKN4Napi12CallbackInfoE,
which has no line number information.
operator new (sz=30) at /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/new_op.cc:43
warning: 43	/usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/new_op.cc: No such file or directory
(gdb) step
47	in /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/new_op.cc
(gdb) step
50	in /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/new_op.cc
(gdb) step
58	in /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/new_op.cc
(gdb) step
0x00007e81e2317338 in CheckPassword(Napi::CallbackInfo const&) ()
   from /home/aryt3/Hacking/CTFs/acsc_qualy_2025/neon-cirquit/extracted_app/native-addon/build/Release/addon.node
(gdb) step
Single stepping until exit from function _Z13CheckPasswordRKN4Napi12CallbackInfoE,
which has no line number information.
operator delete (ptr=0x5f19da1c5380) at /usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/del_ops.cc:32
warning: 32	/usr/src/debug/gcc/gcc/libstdc++-v3/libsupc++/del_ops.cc: No such file or directory
(gdb) info registers
rax            0x5f19da1d48e0      104564638173408
rbx            0x5f19da1b67c0      104564638050240
rcx            0x4                 4
rdx            0x1e                30
rsi            0x3c                60
rdi            0x5f19da1c5380      104564638110592
rbp            0x7fff65a02470      0x7fff65a02470
rsp            0x7fff65a02238      0x7fff65a02238
r8             0x7e81e11f6ac0      139096292813504
r9             0x4                 4
r10            0x0                 0
r11            0x7e81e117a2c0      139096292303552
r12            0x7fff65a02400      140734898381824
r13            0x7fff65a02380      140734898381696
r14            0x7e81e231d1e0      139096310796768
r15            0x5f19da1c5380      104564638110592
rip            0x7e81e12acb90      0x7e81e12acb90 <operator delete(void*, unsigned long)>
eflags         0x206               [ PF IF ]
cs             0x33                51
ss             0x2b                43
ds             0x0                 0
es             0x0                 0
fs             0x0                 0
gs             0x0                 0
fs_base        0x7e81e236c4c0      139096311121088
gs_base        0x0                 0
(gdb) x/s 0x5f19da1c5380
0x5f19da1c5380:	"dach2025{w3_ar3_N3XUS_42_1334}"
```

Reading the flag from the registers concludes this writeup. 