# 丸图


新的图片在最上面，老规矩，右键另存即可，其他尺寸自己裁剪吧。5K屏虽然不足，但也足够清楚。


{% assign image_files = site.static_files | where: "desktop", true %}
{% for myimage in image_files %}
<img src="{{ myimage.path }}" width="760px">
<br>
{% endfor %}


---



            <!-- Article List -->
			<div class="mini-post-list js-result d-none">
			{%- assign _sorted_list = site.posts -%}
			{%- assign _sorted_list = _sorted_list | sort: 'date' -%}
			{%- assign _sorted_list = _sorted_list | reverse -%}


			{%- for _article in _sorted_list -%}
				{%- assign _tags = '' -%}
				{%- for _tag in _article.tags -%}
					{%- assign _tag_encode = _tag | strip | url_encode -%}
					{%- if forloop.last -%}
						{%- assign _tags = _tags | append: _tag_encode -%}
					{%- else -%}
						{%- assign _tags = _tags | append: _tag_encode | append: ',' -%}
					{%- endif -%}
				{%- endfor -%}

			{% comment %} group by year {% endcomment %}
			{%- assign _currentdate = _article.date | date: '%Y' -%}
			{%- if _currentdate != _date -%}
				{%- unless forloop.first -%}</section>{%- endunless -%}
				<section>
				<span class="fa listing-seperator">
					<span class="tag-text">{{ _currentdate }}</span>
				</span>
				{%- assign _date = _currentdate -%}
			{%- endif -%}

				<div class="post-preview item" data-tags="{{ _tags }}">
				    <a href="{{ _article.url | prepend: site.baseurl }}">
				        <h2 class="post-title">
                            {{ _article.title }}
				        </h2>
				        {% if _article.subtitle %}
				        <h3 class="post-subtitle">
				            {{ _article.subtitle }}
				        </h3>
				        {% endif %}
				    </a>
					<hr>
				</div>
			{% endfor %}
