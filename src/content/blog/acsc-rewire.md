---
author: Aryt3
pubDatetime: 2025-05-01T19:00:00Z
title: ACSC Rewire Writeup
slug: acsc-rewire
featured: true
draft: false
tags:
    - ACSC
    - rev
description:
    A Writeup and Walkthrough of the ACSC Rewire challenge.
---

# Rewire

## Description

```
This firmware is responsible for managing the CCTV system. 
Maybe we can modify it?
```

## Provided Files

```
- rewire.zip
```

## Writeup

Starting off I inspected the binary. <br/>
```sh
$ file rewire
rewire: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=0401ed547bd67737e380e6b2ce29d3b944a5b002, for GNU/Linux 3.2.0, not stripped
$ strings rewire
/lib64/ld-linux-x86-64.so.2
__cxa_finalize
__libc_start_main
stdout
puts
fflush
sleep
putchar
__stack_chk_fail
printf
libc.so.6
GLIBC_2.4
GLIBC_2.34
GLIBC_2.2.5
_ITM_deregisterTMCloneTable
__gmon_start__
_ITM_registerTMCloneTable
PTE1
u+UH
=TxeNt
&fHW{H
Q#:'%<H
5JT+
GLOBAL key is invalid
Disabling CCTV feed...
Running CCTV feed...
NexTek Vision Pro
CCTV Solution
:*3$"
GCC: (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0
Scrt1.o
__abi_tag
crtstuff.c
deregister_tm_clones
__do_global_dtors_aux
completed.0
__do_global_dtors_aux_fini_array_entry
frame_dummy
__frame_dummy_init_array_entry
chall.c
__FRAME_END__
_DYNAMIC
__GNU_EH_FRAME_HDR
_GLOBAL_OFFSET_TABLE_
putchar@GLIBC_2.2.5
__libc_start_main@GLIBC_2.34
_ITM_deregisterTMCloneTable
stdout@GLIBC_2.2.5
puts@GLIBC_2.2.5
_edata
_fini
__stack_chk_fail@GLIBC_2.4
printf@GLIBC_2.2.5
disable_cctv
__data_start
__gmon_start__
__dso_handle
_IO_stdin_used
enable_cctv
fflush@GLIBC_2.2.5
_end
__bss_start
main
__TMC_END__
_ITM_registerTMCloneTable
sleep@GLIBC_2.2.5
__cxa_finalize@GLIBC_2.2.5
_init
.symtab
.strtab
.shstrtab
.interp
.note.gnu.property
.note.gnu.build-id
.note.ABI-tag
.gnu.hash
.dynsym
.dynstr
.gnu.version
.gnu.version_r
.rela.dyn
.rela.plt
.init
.plt.got
.plt.sec
.text
.fini
.rodata
.eh_frame_hdr
.eh_frame
.init_array
.fini_array
.dynamic
.data
.bss
.comment
```

Nothing too interesting, so I decompiled the binary using `ghidra`. <br/>
```c
int main(void) {
  puts("NexTek Vision Pro");
  puts("CCTV Solution");
  enable_cctv();
  return 0;
}

void enable_cctv(void) {
  puts("\nRunning CCTV feed...");
  do {
    putchar(0x2e);
    fflush(stdout);
    sleep(1);
  } while( true );
}

void disable_cctv(void) {
  long in_FS_OFFSET;
  ulong local_58;
  undefined8 local_48;
  undefined8 local_40;
  undefined8 local_38;
  undefined8 local_30;
  undefined8 local_28;
  undefined8 local_20;
  undefined4 local_18;
  undefined local_14;
  long local_10;
  
  local_10 = *(long *)(in_FS_OFFSET + 0x28);
  if (key != 0x4e657854) {
    puts("GLOBAL key is invalid");
  }
  puts("\nDisabling CCTV feed...");
  local_48 = 0x7b57486626061930;
  local_40 = 0x3c25273a23511c2f;
  local_38 = 0x110427217e1c2767;
  local_30 = 0x7e010a313e154926;
  local_28 = 0x7a0d0f0b3c0a2737;
  local_20 = 0x2b034f62115a5920;
  local_18 = 0x2b544a35;
  local_14 = 0x29;
  for (local_58 = 0; local_58 < 0x35; local_58 = local_58 + 1) {
    *(byte *)((long)&local_48 + local_58) =
         *(byte *)((long)&local_48 + local_58) ^ (byte)(key >> (sbyte)(((uint)local_58 & 3) << 3));
  }
  printf("%s",&local_48);
  if (local_10 != *(long *)(in_FS_OFFSET + 0x28)) {
                    /* WARNING: Subroutine does not return */
    __stack_chk_fail();
  }
  return;
}
```

The `main` function seems to call the `enable_cctv` function which doesn't do anything apart from printing some uninteresting stuff. <br/>
The `disable_cctv` function which contains actual content doesn't get called at all. <br/>
Knowing this I patched the `memory address` of the called function `enable_cctv` to that of `disable_cctv`. <br/>

Using `radare2` for binary-patching:
```sh
$ r2 -w ./rewire
[0x00001100]> afl
0x000010a0    1     11 sym.imp.putchar
0x000010b0    1     11 sym.imp.puts
0x000010c0    1     11 sym.imp.__stack_chk_fail
0x000010d0    1     11 sym.imp.printf
0x000010e0    1     11 sym.imp.fflush
0x000010f0    1     11 sym.imp.sleep
0x00001100    1     37 entry0
0x00001130    4     34 sym.deregister_tm_clones
0x00001160    4     51 sym.register_tm_clones
0x000011a0    5     54 entry.fini0
0x00001090    1     11 fcn.00001090
0x000011e0    1      9 entry.init0
0x0000138c    1     13 sym._fini
0x000011e9    8    301 sym.disable_cctv
0x00001316    2     60 sym.enable_cctv
0x00001352    1     55 main
0x00001000    3     27 sym._init
[0x00001100]> pdf @ main
            ; DATA XREF from entry0 @ 0x1118(r)
┌ 55: int main (int argc, char **argv, char **envp);
│           0x00001352      f30f1efa       endbr64
│           0x00001356      55             push rbp
│           0x00001357      4889e5         mov rbp, rsp
│           0x0000135a      488d05ea0c..   lea rax, str.NexTek_Vision_Pro ; 0x204b ; "NexTek Vision Pro"
│           0x00001361      4889c7         mov rdi, rax
│           0x00001364      e847fdffff     call sym.imp.puts           ; int puts(const char *s)
│           0x00001369      488d05ed0c..   lea rax, str.CCTV_Solution  ; 0x205d ; "CCTV Solution"
│           0x00001370      4889c7         mov rdi, rax
│           0x00001373      e838fdffff     call sym.imp.puts           ; int puts(const char *s)
│           0x00001378      b800000000     mov eax, 0
│           0x0000137d      e894ffffff     call sym.enable_cctv
│           0x00001382      b800000000     mov eax, 0
│           0x00001387      5d             pop rbp
└           0x00001388      c3             ret
[0x00001100]> s 0x137d
[0x0000137d]> wx e8 67 fe ff ff
[0x0000137d]> pdf @ main
            ; DATA XREF from entry0 @ 0x1118(r)
┌ 55: int main (int argc, char **argv, char **envp);
│           0x00001352      f30f1efa       endbr64
│           0x00001356      55             push rbp
│           0x00001357      4889e5         mov rbp, rsp
│           0x0000135a      488d05ea0c..   lea rax, str.NexTek_Vision_Pro ; 0x204b ; "NexTek Vision Pro"
│           0x00001361      4889c7         mov rdi, rax
│           0x00001364      e847fdffff     call sym.imp.puts           ; int puts(const char *s)
│           0x00001369      488d05ed0c..   lea rax, str.CCTV_Solution  ; 0x205d ; "CCTV Solution"
│           0x00001370      4889c7         mov rdi, rax
│           0x00001373      e838fdffff     call sym.imp.puts           ; int puts(const char *s)
│           0x00001378      b800000000     mov eax, 0
│           0x0000137d      e867feffff     call sym.disable_cctv
│           0x00001382      b800000000     mov eax, 0
│           0x00001387      5d             pop rbp
└           0x00001388      c3             ret
```

Executing the bianry now enters the `disable_cctv` function. <br/>
```sh
$ ./rewire
ion Pro
CCTV Solution
GLOBAL key is invalid

Disabling CCTV feed...
ߧ����������ՙ�∙��Ι������޴��ؙ��䱠����ύ�������r
```

Looking at the disassembled code we can see a requried key. <br/>
```c
if (key != 0x4e657854) {
    puts("GLOBAL key is invalid");
}
```

```sh
[0x00001100]> afl
0x000010a0    1     11 sym.imp.putchar
0x000010b0    1     11 sym.imp.puts
0x000010c0    1     11 sym.imp.__stack_chk_fail
0x000010d0    1     11 sym.imp.printf
0x000010e0    1     11 sym.imp.fflush
0x000010f0    1     11 sym.imp.sleep
0x00001100    1     37 entry0
0x00001130    4     34 sym.deregister_tm_clones
0x00001160    4     51 sym.register_tm_clones
0x000011a0    5     54 entry.fini0
0x00001090    1     11 fcn.00001090
0x000011e0    1      9 entry.init0
0x0000138c    1     13 sym._fini
0x000011e9    8    301 sym.disable_cctv
0x00001316    2     60 sym.enable_cctv
0x00001352    1     55 main
0x00001000    3     27 sym._init
[0x00001100]> pdf @ sym.disable_cctv
            ; CALL XREF from main @ 0x137d(x)
┌ 301: sym.disable_cctv ();
│ afv: vars(11:sp[0x10..0x58])
│           0x000011e9      f30f1efa       endbr64
│           0x000011ed      55             push rbp
│           0x000011ee      4889e5         mov rbp, rsp
│           0x000011f1      4883ec50       sub rsp, 0x50
│           0x000011f5      64488b0425..   mov rax, qword fs:[0x28]
│           0x000011fe      488945f8       mov qword [var_8h], rax
│           0x00001202      31c0           xor eax, eax
│           0x00001204      8b05062e0000   mov eax, dword [obj.key]    ; hit1_0
│                                                                      ; [0x4010:4]=0xdeadbeef
│           0x0000120a      3d5478654e     cmp eax, 0x4e657854         ; 'TxeN'
│       ┌─< 0x0000120f      740f           je 0x1220
│       │   0x00001211      488d05ec0d..   lea rax, str.GLOBAL_key_is_invalid ; 0x2004 ; "GLOBAL key is invalid"
│       │   0x00001218      4889c7         mov rdi, rax
│       │   0x0000121b      e890feffff     call sym.imp.puts           ; int puts(const char *s)
│       └─> 0x00001220      488d05f30d..   lea rax, str._nDisabling_CCTV_feed... ; 0x201a ; "\nDisabling CCTV feed..."
│           0x00001227      4889c7         mov rdi, rax
│           0x0000122a      e881feffff     call sym.imp.puts           ; int puts(const char *s)
│           0x0000122f      48b8301906..   movabs rax, 0x7b57486626061930
│           0x00001239      48ba2f1c51..   movabs rdx, 0x3c25273a23511c2f ; '/\x1cQ#:\'%<'
│           0x00001243      488945c0       mov qword [var_40h], rax
│           0x00001247      488955c8       mov qword [var_38h], rdx
│           0x0000124b      48b867271c..   movabs rax, 0x110427217e1c2767
│           0x00001255      48ba264915..   movabs rdx, 0x7e010a313e154926
│           0x0000125f      488945d0       mov qword [var_30h], rax
│           0x00001263      488955d8       mov qword [var_28h], rdx
│           0x00001267      48b837270a..   movabs rax, 0x7a0d0f0b3c0a2737 ; '7\'\n<\v\x0f\rz'
│           0x00001271      48ba20595a..   movabs rdx, 0x2b034f62115a5920
│           0x0000127b      488945e0       mov qword [var_20h], rax
│           0x0000127f      488955e8       mov qword [var_18h], rdx
│           0x00001283      c745f0354a..   mov dword [var_10h], 0x2b544a35 ; '5JT+'
│           0x0000128a      c645f429       mov byte [var_ch], 0x29     ; ')'
│           0x0000128e      48c745b835..   mov qword [var_48h], 0x35   ; '5'
│           0x00001296      48c745b000..   mov qword [var_50h], 0
│       ┌─< 0x0000129e      eb3a           jmp 0x12da
│      ┌──> 0x000012a0      488d55c0       lea rdx, [var_40h]
│      ╎│   0x000012a4      488b45b0       mov rax, qword [var_50h]
│      ╎│   0x000012a8      4801d0         add rax, rdx
│      ╎│   0x000012ab      0fb630         movzx esi, byte [rax]
│      ╎│   0x000012ae      8b155c2d0000   mov edx, dword [obj.key]    ; hit1_0
│      ╎│                                                              ; [0x4010:4]=0xdeadbeef
│      ╎│   0x000012b4      488b45b0       mov rax, qword [var_50h]
│      ╎│   0x000012b8      83e003         and eax, 3
│      ╎│   0x000012bb      c1e003         shl eax, 3
│      ╎│   0x000012be      89c1           mov ecx, eax
│      ╎│   0x000012c0      d3fa           sar edx, cl
│      ╎│   0x000012c2      89d0           mov eax, edx
│      ╎│   0x000012c4      31c6           xor esi, eax
│      ╎│   0x000012c6      89f2           mov edx, esi
│      ╎│   0x000012c8      488d4dc0       lea rcx, [var_40h]
│      ╎│   0x000012cc      488b45b0       mov rax, qword [var_50h]
│      ╎│   0x000012d0      4801c8         add rax, rcx
│      ╎│   0x000012d3      8810           mov byte [rax], dl
│      ╎│   0x000012d5      488345b001     add qword [var_50h], 1
│      ╎│   ; CODE XREF from sym.disable_cctv @ 0x129e(x)
│      ╎└─> 0x000012da      488b45b0       mov rax, qword [var_50h]
│      ╎    0x000012de      483b45b8       cmp rax, qword [var_48h]
│      └──< 0x000012e2      72bc           jb 0x12a0
│           0x000012e4      488d45c0       lea rax, [var_40h]
│           0x000012e8      4889c6         mov rsi, rax
│           0x000012eb      488d05400d..   lea rax, [0x00002032]       ; "%s"
│           0x000012f2      4889c7         mov rdi, rax
│           0x000012f5      b800000000     mov eax, 0
│           0x000012fa      e8d1fdffff     call sym.imp.printf         ; int printf(const char *format)
│           0x000012ff      90             nop
│           0x00001300      488b45f8       mov rax, qword [var_8h]
│           0x00001304      64482b0425..   sub rax, qword fs:[0x28]
│       ┌─< 0x0000130d      7405           je 0x1314
│       │   0x0000130f      e8acfdffff     call sym.imp.__stack_chk_fail ; void __stack_chk_fail(void)
│       └─> 0x00001314      c9             leave
└           0x00001315      c3             ret
```

When I disassambled the function I found that the key is set to `=0xdeadbeef` per default. <br/>
Knowing this I swtiched the `deadbeef` with the actual `required key`. <br/>
```sh
[0x00001100]> /x ef be ad de
0x00004010 hit5_0 efbeadde
[0x00001100]> s 0x00004010
[0x00004010]> wx 54 78 65 4e
```

After patching the binary, updating the global-var `key` and executing it again, I got the flag which concludes this challenge. <br/>
```sh
./rewire
NexTek Vision Pro
CCTV Solution

Disabling CCTV feed...
dach2025{d4mn_@r3_y0u_a_r1pperd0c_or_wh4t!?_67fea21e}
```