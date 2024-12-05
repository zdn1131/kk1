const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { file, description } = JSON.parse(event.body);
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO;

        // 上传文件到 GitHub
        const uploadResponse = await fetch(`https://api.github.com/repos/${repo}/contents/uploads/${Date.now()}-${file.name}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Upload file via web',
                content: file.content,
                branch: 'main'
            })
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file');
        }

        const uploadData = await uploadResponse.json();
        
        // 确保我们获取到了正确的 URL
        const imageUrl = uploadData.content ? uploadData.content.download_url : uploadData.url;

        // 获取现有的 contents.json
        const contentsResponse = await fetch(`https://api.github.com/repos/${repo}/contents/contents.json`);
        let contents = [];
        let sha;

        if (contentsResponse.ok) {
            const contentsData = await contentsResponse.json();
            if (contentsData.content) {
                contents = JSON.parse(Buffer.from(contentsData.content, 'base64').toString());
                sha = contentsData.sha;
            }
        }

        // 添加新内容
        contents.unshift({
            id: Date.now(),
            imageUrl: imageUrl,
            description: description,
            timestamp: new Date().toISOString()
        });

        // 更新 contents.json
        await fetch(`https://api.github.com/repos/${repo}/contents/contents.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Update contents.json',
                content: Buffer.from(JSON.stringify(contents, null, 2)).toString('base64'),
                sha: sha,
                branch: 'main'
            })
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: '上传成功'
            })
        };
    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: error.message
            })
        };
    }
}; 
