import requests
import os

def get_blog_post(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        return f.read()

def convert_md_to_html(md_content):
    try:
        import markdown
    except ImportError:
        raise RuntimeError('请先安装markdown库：pip install markdown')
    return markdown.markdown(md_content)

def upload_to_wechat(access_token, title, content_html):
    # 这里只是示例，实际接口请参考微信官方文档
    url = f'https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}'
    data = {
        "articles": [
            {
                "title": title,
                "content": content_html,
                "digest": "",
                "content_source_url": "",
                "need_open_comment": 0,
                "only_fans_can_comment": 0
            }
        ]
    }
    resp = requests.post(url, json=data)
    return resp.json()

def main():
    md_path = input('请输入要同步的博客Markdown文件路径: ')
    access_token = input('请输入微信公众号access_token: ')
    title = input('请输入文章标题: ')
    md_content = get_blog_post(md_path)
    html_content = convert_md_to_html(md_content)
    result = upload_to_wechat(access_token, title, html_content)
    print('同步结果:', result)

if __name__ == '__main__':
    main()