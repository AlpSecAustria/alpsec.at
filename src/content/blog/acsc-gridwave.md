---
author: 0xk1f0
pubDatetime: 2025-05-24
title: ACSC GRID_WAVE Writeup
slug: acsc-grid-wave
featured: true
draft: false
tags:
    - ACSC
    - rev
description:
  A Writeup and Walkthrough of the ACSC GRID_WAVE challenge.
---

# GRID_WAVE

## Description

```
Word’s been going around about an old piece of anti-system tech. No one's laid a hand on it in decades, but I got the specs.
```

## Provided Files

- `GRID_WAVE.zip`

## Writeup

The zip file includes a single binary, which we can quickly inspect to see what we're working with.

```bash
~> file GRID_WAVE_4X8_LangleyMicros.elf
GRID_WAVE_4X8_LangleyMicros.elf: ELF 32-bit LSB executable, Atmel AVR 8-bit, version 1 (SYSV), statically linked, stripped
```

Since I expect nobody to be using a machine based on 32-bit ATMEL architecture, we need some kind of emulator to run this executable.

There are multiple options available to do this, but the two that I tried were

- [qemu-system-avr](https://qemu-project.gitlab.io/qemu/system/target-avr.html)
- [simavr](https://github.com/lcgamboa/simavr)

The QEMU based one should have worked fine as I later found that others were using it to solve this challenge, but at the time I could not get it running on my machine. So I switched to `simavr`, or rather a fork of it, that made the `simduino` example work correctly.

But to understand what this thing even does before we launch it, I used `avr-objdump` to get a general idea of the ASM workings first.

```text
~> avr-objdump -m avr5 -D GRID_WAVE_4X8_LangleyMicros.elf
# OUTPUT OMMITTED
~> avr-objdump -m avr5 -D GRID_WAVE_4X8_LangleyMicros.elf | grep -B 20 cp
# OUTPUT OMMITTED
```

I like to look for compare instructions to spot obvious things like static password checks and vice-versa. But in this case I could not make much of the wall of text. Since I also had little knowledge of the ATMEL-AVR instruction set, [this](https://ww1.microchip.com/downloads/en/devicedoc/AVR-Instruction-Set-Manual-DS40002198A.pdf) came in pretty handy. The important instructions to understand here are

```text
ADD -> Add without carry
SUB -> Subtract without carry
MUL -> Multiply unsigned
LD -> Load indirect from Data Space using X/Y/Z
LDI -> Load immediate
CP -> Compare
CPC -> Compare with carry
ST -> Store indirect from register using index X
BRGE -> Branch if greater or equal
BGNE -> Branch if not equal
```

Some of these are self explanatory if you have at least a bit of ASM and programming knowledge. With that out of the way I went on to making this thing run in an emulator and attaching GDB to it.

```text
~> SIMAVR_UART_XTERM=1 ./obj-x86_64-pc-linux-gnu/simduino.elf -d ../GRID_WAVE_4X8_LangleyMicros.hex
atmega328p booloader 0x00000: 2662 bytes
avr_special_init
avr_gdb_init listening on port 1234
uart_pty_init bridge on port *** /dev/pts/2 ***
uart_pty_init tap on port *** /dev/pts/3 ***
uart_pty_connect: /tmp/simavr-uart0 now points to /dev/pts/2

# in another term
~> picocom /tmp/simavr-uart0
# --- snip ---
LAUNCHCODE>

# in yet another term
~> avr-gdb
>>> target remote localhost:1234
# OUTPUT OMMITTED
>>> continue
```

Alright so we can see in our attached `picocom` term that the program asks for some kind of "launchcode". When we try to input something it throws "Incorrect" and asks again.

```text
LAUNCHCODE> asdasds
Incorrect
LAUNCHCODE> sggd
Incorrect
LAUNCHCODE>
```

To actually see what we're working with, we need to enter a suitable breakpoint in our `avr-gdb` session that is attached to the process. This was just a bit of trial and error on my side using different addresses and working my way forward using `si` and `continue`. I then settled on breaking at `break *0x852`, which is a few addreses above a `cp` instruction that I found interesting, then continuing and inputting something in `picocom`.

```text
# in GDB
>>> break *0x852
>>> cont
# in picocom
LAUNCHCODE> aa
# in GDB
>>> si # step one instruction at a time
```

To inspect the values of the registers more easily, I highly recommend installing [this custom .gdbinit](https://github.com/cyrus-and/gdb-dashboard), which shows the register values and other useful information when a breakpoint is reached.

Now I just looked for my `0x61` (which is `a` in hex) value in the registers and inspected the program flow. I noticed that the program passed this sequence and the breakpoint at `0x852` multiple times until it went on to print the known "Incorrect" phrase to the terminal.

What I found instead was the actual sequence that I provided `0xaa` stored to register `r18`. The logic before the store instruction is performed for every character in the input and can be reproduced in python code.

```py
# number registers
r18 = 0x00
r20 = 0x00

# direct value registers
r19 = 0x00
r21 = 0x00
r22 = 0x00

def calc_chars(char_1: str, char_2: str):
    # ld r18, Z
    r18 = int(hex(ord(char_1)), 16)
    # cpi r18, 0x61
    # brge
    if (r18 >= 0x61):
        # ldi 19, 0x57
        r19 = 0x57
    else:
        # ldi 19, 0x30
        r19 = 0x30
    # sub r18, r19
    r18 = r18 - r19
    # ld r20, Z+1
    r20 = int(hex(ord(char_2)), 16)
    # cpi r20, 0x61
    # brge
    if (r20 >= 0x61):
        # ldi 21, 0x57
        r21 = 0x57
    else:
        # ldi 21, 0x30
        r21 = 0x30
    # ldi r22, 0x10
    r22 = 0x10
    # mul r18, r22
    # movw r18, r0
    r18 = r18 * r22
    # sub r20, r21
    r20 = r20 - r21
    # or r18, r20
    r18 = r18 | r20
    # st X+1, r18
    return r18

def main():
    # 'a', 'b' prints 0xab
    # so does every other combination of chars in [0-9][a-f]
    print(hex(calc_chars('a', 'b')))

main()
```

So we know that the sequence expected can be directly provided to the input. If we skip through with `cont` we can see that our breakpoint is hit a limited number of times.

```text
>>> continue
# --- snip ---
break at 0x00000852 for *0x852 hit 20 times
# --- snip ---
```

So our string is should be 20 * 2 characters long (because in each iteration, two chars from the input string are fetched and compared)

But we need to determine where the sequence is checked against our calculated input at `r18`. This is the second thing I spotted in the original ASM dump at address `0x8aa`, which loads from `Y+` and `Z+`, subtracts them and checks if the output is zero.

```text
8aa:	8d 91       	ld	r24, X+ ; load direct to r24
8ac:	01 90       	ld	r0, Z+  ; load direct to r24
8ae:	80 19       	sub	r24, r0 ; subtract r0 and r24
8b0:	21 f4       	brne	.+8 ; branch if output is not zero
```

When breaking at this address in GDB, we can see that for the first two chars, `r24` has the value `0xea` and `r0` has the value `0xaa`. The takes the branch at `0x8b0` because when subtracting these values, we get a value that is not zero.

So let's try something.

```text
# in picocom
LAUNCHCODE> ea
```

When GDB now reaches the breakpoint at `0x8aa`, `r24` loads the value `0xea` and `r0` loads the value `0xea`, the branch at `0x8b0` is NOT taken and we move on to a second iteration of this sequence. In the second iteration, `r24` is `0xda` and `r0` is `0xd0`, which we can crosscheck with the python script from above, because we basically entered nothing and the conversion sequence ends at `0xd0`.

In essence, we now only need to recover the sequence char by char until we reach our 40 characters, which should then equal our full solution sequence. When doing exactly that we end up with the following sequence

```text
eada28984ece76ce258f354d1a87c140a2062347
```

To check if we're correct, we can restart the program in `simavr`, only attaching picocom this time

```text
LAUNCHCODE> eada28984ece76ce258f354d1a87c140a2062347
Success
[!] Activating GRIDWAVE...
[!] Initializing...
[!] Loading assets...
[+] System online.
[+] Gridwave activated.
dach2025{eada28984ece76ce258f354d1a87c140a2062347}
```

This might not have been the fastest and most ergonomic solution to this challenge, but it certainly gave us the flag and a bit of additional knowledge in the end.
