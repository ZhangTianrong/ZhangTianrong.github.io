---
layout:         post
title:          如何在 Windows Linux 双系统下公用低能耗蓝牙设备
subtitle:       How to pair a Low Energy (LE) Bluetooth device in dual boot with Windows & Linux
date:           2020-05-18
author:        Miangu
catalog:       false
tags:
    - Translation
	- Tutorial
---

> 本文翻译并转载自 [console.systems](https://console.systems/2014/09/how-to-pair-low-energy-le-bluetooth.html)，是一篇相当旧（2014年写的）的文章了，但是鉴于中文网站上搜索到的大多不是针对低能耗蓝牙设备的教程，频繁提到修改 `LinkKey` 即可，但是实际上却根本找不到对应密钥，特翻译于此。

如果你安装了双系统，那么你一定能理解每次切换系统都要重新配对蓝牙鼠标和键盘是多么糟心的一件事。本教程将展示如何让一款蓝牙鼠标在 Windows 8 和 Debian 双系统下同时工作（译者注：译者使用 Windows 10 和 Ubuntu 18.04 LTS 进行的测试，同样可行，其他系统大抵可以自行稍加调整达到一样的效果）。

首先在 Debian 下和蓝牙设备配对，再重启进入 Windows 也完成配对。当然这样你在 Debian 下的配对就失效了，这很正常，不要紧（译者注：目的是在两个操作系统中都留下配对记录，方便后续修改）。然后我们就需要在 Windows 中提取蓝牙配对的密钥。先下载微软官方的 [PsExec](https://docs.microsoft.com/en-us/sysinternals/downloads/psexec) 工具，然后用管理员权限打开一个命令行窗口（译者注：假设你将可执行文件解压缩至 `Downloads` 文件夹下，那么）

```powershell
cd Downloads
psexec.exe -s -i regedit /e C:\BTKeys.reg HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Services\BTHPORT\Parameters\Keys
```

然后密钥就会被提取到 `C:\BTKeys.reg` 中，形如

```ini
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Services\BTHPORT\Parameters\Keys\7512a3185b2c\84abd4a25ee1]
"LTK"=hex:6c,54,ee,80,40,47,6c,cb,fc,8e,f3,f1,c6,b2,04,9e
"KeyLength"=dword:00000000
"ERand"=hex(b):1e,12,aa,37,39,cc,af,34
"EDIV"=dword:00003549
"CSRK"=hex:38,d7,aa,c1,42,06,31,25,12,b8,5a,6d,c3,90,98,f2
```

（译者注：译者未使用上述命令，使用的是 `PsExec.exe -s -i regedit` 打开注册表编辑器，再通过地址栏导航至 `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\services\BTHPORT\Parameters\Keys\`。自行找到对应蓝牙设备后导出。地址和原文中给出的略有不同，如原文方法无效，可尝试换成这里的地址）

这里 `7512a3185b2c` 是电脑蓝牙适配器的蓝牙 MAC 地址，写作标准形式就是 `75:12:A3:18:5B:2C`。`84abd4a25ee1` 则是配对中蓝牙鼠标被分配的地址。在后续过程中我们会继续用到它们。

接下来我们重启进入 Debian，此时鼠标不会自动配对，因为所分配的地址已经变化，我们需要更正这一地址（译者注：此处应当先提权，使用 `su` 或 `sudo -i` 后键入密码即可）。

```bash
$ cd /var/lib/bluetooth/75:12:A3:18:5B:2C/
$ ls
cache 84:AB:D4:A2:5F:E1 settings
```

仔细观察一下，你就会发现鼠标的地址和 Windows 下的不完全相同。我这边的例子里只有第五部分有区别，我们只要重命名这个文件夹就可以让地址重更新匹配。

```bash
$ mv 84:AB:D4:A2:{5F,5E}:E1
$ cd 84:AB:D4:A2:5E:E1/
$ ls
attributes gatt info
```

然后我们打开 `info` 文件进行编辑，把其中的几个密钥更新为 Windows 下我们所提取的值。Windows 和 Bluez （译者注：Linux 操作系统使用的蓝牙栈）使用的密钥格式有一下对应关系：

+ `LTK` 对应 `LongTermKey` 下的 `Key`，把小写转换成大写并删去逗号即可。
+ `KeyLength` 对应 `EncSize`。在我这边的例子里，需要把原来的 `12` 替换为 `0`（译者注：和后面的对应关系一样，Windows 使用 16 进制，Bluez 使用 10 进制）。
+ `ERand` 对应 `Rand`。这里比较特殊的是，我们必须先将 Windows 中的值倒转过来得到 `34afcc3937aa121e` 再转换为 10 进制也就是 `3796477557015712286` （译者注：因为数字较大，可以使用在线转换器如 [MobileFish](https://www.mobilefish.com/services/big_number/big_number.php) 的工具来完成）。
+ `EDIV` 对应 `EDiv`。把 16 进制转换成 10 进制即可，这里就不用倒转了。
+ `CSRK` 对应 `LocalSignitureKey` 下的 `Key`。转成大写，删去逗号即可。

最后，修改过的部分应该类似下面的例子。

```ini
[LocalSignatureKey]
Key=38D7AAC14206312512B85A6DC39098F2

[LongTermKey]
Key=6C54EE8040476CCBFC8EF3F1C6B2049E
Authenticated=0
EncSize=0
EDiv=13641
Rand=3796477557015712286
```

保存修改，然后重启。接下来鼠标就可以自动连上 Windows 和 Debian了。

注：Mygod 提供了一个代替上述指令的 [Python 脚本](https://gist.github.com/Mygod/f390aabf53cf1406fc71166a47236ebf)，你们也可以试试看。