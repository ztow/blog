# 丸图

带文字合集：<a href="/archive/?tag=%E4%B8%B8%E5%AD%90%E5%A3%81%E7%BA%B8" target="_blank">点这里</a>

新的图片在最上面，老规矩，右键另存即可，其他尺寸自己裁剪吧。5K屏虽然不足，但也足够清楚。

{% assign image_files = site.static_files | where: "desktop", true %}
{% for myimage in image_files %}
<a href="{{ myimage.path }}" target="_blank"><img src="{{ myimage.path }}" width="100%"></a>
{% endfor %}


