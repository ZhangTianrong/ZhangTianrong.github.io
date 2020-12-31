---
layout:         post
title:          用CoLab离线下载（不提倡）
subtitle:       Not a practice of honor, but it can be really helpful.
date:           2020-12-31
author:        Miangu
catalog:       true
tags:
    - Econnoisseur
---

> **Edit**: 没想到刚码完不久就要更新……原本使用Ngrok的方法被证实不稳定，现已更新使用Cloudflared代替的选项。CoLab notebook地址不变，更新了内容的同时使用form重写了交互界面。~~于是就更没有必要看这篇文章了……~~

这个标签下的文章基本都是些薅羊毛的奇技淫巧，说实话这么做多多少少是不光彩的，免费的工具摆在那里还是应当尽量按照其原本的设计意图使用。不过毕竟方便，所以到了有需要的时候，真香定律永远适用。这次的内容一点也不复杂，都是一些发掘薅羊毛姿势时遇到的小问题，所给出的代码只是最小能够实现所需功能的代码，一些辅助使用和增强的代码则被省略了，注释和空行也进行了删减来使文章更加紧凑，太长不看的可以直接打开该Colab notebook[![](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/assets/colab-badge.svg)使用，里面的注释还算挺全面的，应该属于看了就懂的类型。

## 背景

CoLab本来是提供免费GPU资源供人运行机器学习代码的，可是机器学习离不开大量的训练数据，训练过程中又要不断保存模型的snapshot，所以当数据集比较复杂，训练时间又很长的时候，CoLab VM自身的硬盘不够用了也很正常的。而且漫长的运行中，session可能会被disconnect，如果没有及时reconnect，等发现的时候再连接的就是另一个新的VM了，数据也就随之没了。Google在`colabtool`中为大家准备了很方便的挂载Google Drive的方法

```python
from google.colab import drive  
mountpoint = '/content/drive'
drive.mount(mountpoint, force_remount=True)
```

挂载后的FuseFS使用起来就像本地磁盘一样，文件随用随取地cache到本地，新文件和修改操作也会在一段时间后sync到网盘，这样下载一次数据集就可以反复使用，训练进度也可以有效备份。而这恰好也能够用来完成离线下载的任务。

## 安装并使用Aria2

网上用CoLab下载文件的代码其实很容易搜索得到，大多是指向这个[Torrent to Google Drive Downloader](https://github.com/FKLC/Torrent-To-Google-Drive-Downloader)的。这个项目使用的是`python3-libtorrent`，但其实`CoLab`允许用户安装软件，而专业的下载软件当然比`libtorrent`更容易使用，配置也能更加精细。`aria2`就是很不错的选择，高效、支持多种协议而且有`rpc`，很多开发者为它制作了精良的Web管理界面。

```sh
! sudo apt install aria2
! cd /content && aria2c https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best_ip.txt -o tracker --allow-overwrite="true" -q
```

安装后我们也可以顺便下载一个文件试试看，这里下载的是优质tracker列表，下载种子或者磁力链接时额外的tracker服务器往往会有帮助，比如原来Torrent to Google Drive Downloader下载磁力链接的部分代码就可以改作

```python
with open("/content/download_list", "w+") as f:
  while True:
      magnet_link = input("Enter Link Or Type Exit: ")
      if magnet_link.lower() == "exit":
          break
      print(magnet_link, end="\n\n", file=f)
```
```sh
! mkdir -p /content/drive/MyDrive/Downloads/Torrent
! cd /content/drive/MyDrive/Downloads/Torrent && aria2c --bt-tracker=$(sed ':a;N;$!ba;s/\n\n/,/g' /content/tracker) --bt-enable-lpd=true --disable-ipv6 --seed-time=0 --file-allocation=none --console-log-level=warn -i /content/download_list 
```

这里要注意设置`--file-allocation=none`关闭预分配空间，因为似乎`colabtool`在同步文件大小相同而内容有所修改的文件时会有问题，flush后网盘内容和本地的cache可能有出入（当时为了locate视频下载并同步后还是无法播放的原因实在是白费了一番功夫，有兴趣可以看看[附录](#附录)中没什么用的在CoLab里预览视频文件的代码）。另外，`--seed-time=0`大概算是无奈之举吧，做种了是继续浪费CoLab资源借花献佛，不做种那就是leecher。

当VM的空间不足或者亟需将内容同步到网盘时，我们需要手动flush当前的cache再重新挂载网盘。
```python
drive.flush_and_unmount()
print('All changes made in this colab session should now be visible in Drive.')
drive.mount(mountpoint, force_remount=True)
```

这里所需的时间视文件大小而定，可能会比较久。

## 设置rpc daemon

我们往往不希望下载打断CoLab中其他cell正常运行，而且每次下载的具体细节设置写在命令里调整总是很麻烦的，所以可以尝试运行portmap daemon然后通过Web管理界面控制后台运行的`aria2`。这就需要进行内网穿透，顺便还可以通过`ssh`端口转发像自己平时使用`aria2`一样操作。

> **Edit**: 以下使用Ngrok的部分有可能失效，请尝试使用Cloudflared代替：
> ```sh
> !pip install colab_ssh --upgrade
> ```
> ```python
> from colab_ssh import launch_ssh_cloudflared, init_git_cloudflared
> launch_ssh_cloudflared("passwd")
> ```
> 该包已经提供了后续本地机器设置的步骤，为了方便不熟悉英语的读者，这里简单总结一下：
> 1. 点击显示的超链接并下载`Cloudflared`，下载所得为一个压缩包，请解压到一个常用位置
> 2. 打开用户目录下的`.ssh`文件夹（如果没有哦安装`open-ssh`请参考比如[这个博客](https://blog.csdn.net/weixin_43064185/article/details/90080815)的步骤进行安装~~话说之前Ngrok方法似乎也要安装`ssh`来着，算了~~）。
> 3. 用文本编辑器打开`config`文件（没有则新建）并在最后新增以下内容：
> ```
> Host *.trycloudflare.com
>	  HostName %h
>	  User root
>	  Port 22
>	  ProxyCommand [方才解压所得可执行文件的绝对路径] access ssh --hostname %h
> ```
> 4. 使用notebook中显示的地址连接，若要进行端口映射，和之前一样在最后跟上`-L 8080:localhost:80 -L 6800:localhost:6800`即可。
>
> 注意：上述1~3步在任意一台本地机器上只需执行一次，属于一劳永逸的事。

大概像我这样不习惯拿Jupyter notebook码代码于是想办法`ssh`进熟悉的终端的大有人在，相关代码也很容易搜索到，比如[这里](https://github.com/shawwn/colab-tricks)。我们稍加修改后照搬过来即可。

```sh
! wget -q -c -nc https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
! unzip -qq -n ngrok-stable-linux-amd64.zip
! apt-get install -qq -o=Dpkg::Use-Pty=0 openssh-server pwgen > /dev/null
! echo root:passwd | chpasswd
! mkdir -p /var/run/sshd
! echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
! echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config
! echo "LD_LIBRARY_PATH=/usr/lib64-nvidia" >> /root/.bashrc
! echo "export LD_LIBRARY_PATH" >> /root/.bashrc
get_ipython().system_raw('/usr/sbin/sshd -D &')
print("Copy authtoken from https://dashboard.ngrok.com/auth")
authtoken = getpass.getpass()
get_ipython().system_raw('./ngrok authtoken $authtoken && ./ngrok tcp 22 &')
with urllib.request.urlopen('http://localhost:4040/api/tunnels') as response:
  data = json.loads(response.read().decode())
  (host, port) = data['tunnels'][0]['public_url'][6:].split(':')
  print(f'ssh "{host}" -p "{port}" -L 8080:localhost:80 -L 6800:localhost:6800 -l "root"')
```
这段代码会安装`ngrok`来进行内网穿透，它会提示用户从`ngrok`的dashboard获取认证码，点击链接照做即可。还没有注册账户的可以注册一个，毕竟也是相当实用的工具。

运行后会打印出`ssh`登录所需的命令，使用密码`passwd`登录即可，如果报错，resubmit，一般来说就没问题了。复制进终端运行不要关闭，那么local port forwarding就生效了。

```python
os.system(f"aria2c --enable-rpc --rpc-listen-all -d /content/drive/MyDrive/Downloads/ --disable-ipv6 --rpc-secret=passwd --max-concurrent-downloads=10 --max-connection-per-server=10 --min-split-size=10M --split=5  --bt-tracker=$(sed ':a;N;$!ba;s/\n\n/,/g' /content/tracker) --bt-enable-lpd=true --rpc-allow-origin-all --file-allocation=none --seed-time=300 -D")
```

开启daemon，然后我们就可以通过Web界面，比如[ariaNg](http://ariang.mayswind.net/latest/)来控制下载了。这里选择了[Aria2 for Chrome](https://chrome.google.com/webstore/detail/aria2-for-chrome/mpkodccbngfoacfalldjimigbofkhgjn)这个插件，因为可以方便的捕捉浏览器的下载请求：进入插件的设置，填入`http://127.0.0.1:6800/jsonrpc`和密码`passwd`，勾选auto capture并选择一个合适的文件大小门槛，最后保存即可。

## 用例：OneDrive

> **Edit**: 实测使用Edge Chromium的同一插件[Aria2 for Edge](https://microsoftedge.microsoft.com/addons/detail/aria2-for-edge/jjfgljkjddpcpfapejfkelkbjbehagbh)可以自动捕捉请求头。我还想怎么可能这么火的插件连自动填写请求头都做不到呢。原来罪在Chrome，这也促使了我向Edge转移，此后也会在`box-start`标签下更新使用浏览器的一些心得和技巧。

这里以下载Onedrive for Business的文件为例，说明一下使用上的细节。这些其实是适用于所有`aria2`的而不限于CoLab。进入Onedrive的网页端，选择一个超过刚才设置的大小的文件下载，下载链接会被直接传送到ariaNg，但是直接下载却会失败。这是因为这种下载需要检查`cookie`，`user-agent`等信息来核实下载人的身份，而插件并没有捕捉到这些内容。我们需要做的就是在选项tab里补全缺失的header信息，如果所有下载都来自这个站点，也可以在左边面板的HTTP设置下全局修改。`cookie`之类的写在自定义请求头中，`user-agent`就写在自定义User Agent下。

要找到`cookie`有很多方法，可以从Chrome的数据库里解码，也可以使用一些插件，我们这里直接获取浏览器的请求头，因为这样做最直白而且如果下载还需要像`x-csrf`这样其他的信息，我们也能一起获得。以Chrome和Windows为例，按`F12`打开开发者工具，刷新界面重复下载操作。此时在网络选项卡里就可以观察到新的请求，选中并复制所需的内容即可。`user-agent`的话，访问[该网站](https://www.whatismybrowser.com/detect/what-is-my-user-agent)复制即可。

这样配置完之后再确认下载就能正常通过认证了，实测速度能跑满1000M的样子，平均有60MBps。

## 后记

说是后记其实是起因，但是写在前面的话太罗嗦了。之前买的"无管理"Onedrive for Business，因为Sharepoint全局管理员有权利可以查看并修改下辖站点的文件，总是令人不放心。可问题是没有管理员也就意味着没有人通过请求、没有人来开放权限。这样就有诸多不便，无法新建项目，无法使用API，等等。最近在研究`fuse`，越想越觉得这个网盘不能这么用下去，于是就打算尽快迁移到Google Drive。Google这边组织管理者本来就不能直接查看成员网盘内容，虽然也许回国后访问是个问题，但至少目前好受。

我本来是看完视频就上传网盘存着，虽然不一定还会再看吧，但收集资源总算是个爱好。久而久之就积攒了小几T的内容，这哪里是说迁移就能迁移的呢。我的宽带套餐一个月1T流量，正常使用每月剩余也就200G左右，通过本地中专还是两倍流量，再加上小得可怜的上行带宽，怕是要断断续续盯着整到不知什么时候去了。然后我就思考各种离线下载的办法，看到几年前$19一年VPS的Bandwagon现在最低套餐也是$49了更是非常后悔没有一直续费下去。于是在谜之肉痛感影响下选择薅Google羊毛“缓解”一下，hhhhh。

其实开始的时候提到的Torrent to Google Drive Downloader已经archived了，浏览一下还能看到当时有人指责他占用资源，而他最开始只是为了通过BT加速下载机器学习的课程资料而已，不曾想开了个坏头。薅羊毛就是容易沉醉在沾沾自喜中，还是要尽量避免这么廉价的complacency。

## 附录

#### Power Automate

其实最开始的想法并不是爬取网页版管理界面然后克隆header的，能挂载访问的话谁不想呢？于是选择了Power Automate，也就是之前的Microsoft Flow。

它既可以链接无管理的Onedrive（亲生的就是好啊）也可以通过Power App访问Google Drive。在这种诱惑下，我花了个把小时草草入了个门，在这个只能通过类似搭流程图写程序的平台上艰难地写出了几个循环。因为缺少很多逻辑，所以还是需要人工输入一些路径之类的。正当我在测试文件夹下通过之后高兴地应用在真正的目录上时……

> "The file contains 10674.095 megabytes which exceeds the maximum 500 megabytes."

这还只是最小的几个文件啊！！！ 所以，***时间就是这么一点点浪费掉的。***

#### CoLab 预览视频

以前我也用过Torrent to Google Drive Downloader，下载[Academic Torrents](https://academictorrents.com/)上的公开课。下载的是很快，可是同步得非常慢，而且经常有大文件，比如视频打不开，PotPlayer显示文件内容全是0这种。我dump了一下CoLab里的文件，发现开头是正常的，至少不应该metadata都读不到吧。在没有去质疑sync本身的过程的时候，我的想法还是确保至少CoLab VM中内容正确，那么等久一点自然会update到网盘的。

```python
from IPython.display import HTML
from base64 import b64encode
import os

save_path = input("Enter the path to the file to peek (you can find it in the left penel): ")
compressed_path = "/content/result_compressed.mp4"
os.system(f"ffmpeg -i {save_path} -ss 00:00:30 -to 00:01:00 -strict -2 -vcodec libx264 -acodec copy {compressed_path}")
mp4 = open(compressed_path,'rb').read()
data_url = "data:video/mp4;base64," + b64encode(mp4).decode()
HTML("""
<video width=400 controls>
      <source src="%s" type="video/mp4">
</video>
""" % data_url)
```

我尝试用`ffmpeg`截取半分钟内容并转码成网页可以直接播放的mp4（不熟悉视频处理，我这个转码过程好漫长啊）。然而，VM里的视频能播放，网盘里的过了几天也没变化。也是哦，网盘上显示的文件最后修改时间只是`aria2`进行preallocation的时间，能够打开的那些文件的时间戳都明显更晚。取消预分配后一切都正常了，有了对比我才意识到当初我`flush_and_unmount`的时候基本从来不需要多久，往往是几秒就通过了。当时我还以为是从VM到Google Drive中间，Google可能还夹着几层缓冲导致虽然可以快速取消挂载但是无法保证同步，现在想想很可能是真的当作同步已经结束了……Anyway，`colabtool`也是开源的，有空再去看看吧。