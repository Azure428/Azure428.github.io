// 测试用户数据创建功能
const { default: axios } = require('axios');

// 配置GitHub API
const owner = 'Azure428';
const repo = 'Azure428.github.io';
const branch = 'master';
// 请在这里输入你的GitHub API token
const token = 'YOUR_GITHUB_TOKEN';

// 测试用户数据
const phone = '13800138000';
const studentId = '20230001';
const userData = {
    phone: phone,
    studentId: studentId,
    borrowStatus: '未借伞',
    currentUmbrella: null,
    borrowHistory: []
};

// Base64编码函数（兼容Unicode）
function base64Encode(str) {
    try {
        // 现代浏览器方法
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        return btoa(String.fromCharCode(...data));
    } catch (e) {
        // 兼容性回退
        return btoa(unescape(encodeURIComponent(str)));
    }
}

async function testCreateUserData() {
    try {
        console.log('开始测试用户数据创建...');
        
        // 1. 首先检查目录占位文件
        console.log('1. 检查目录占位文件...');
        const dirPath = 'users/.gitkeep';
        const dirContent = '';
        const dirPayload = {
            message: 'Create users directory',
            content: base64Encode(dirContent),
            branch: branch
        };
        
        try {
            const dirResponse = await axios.put(
                `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}`,
                dirPayload,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            console.log('✓ 成功创建目录占位文件:', dirResponse.status);
        } catch (dirError) {
            console.warn('⚠ 创建目录占位文件失败:', dirError.response?.status, dirError.response?.statusText);
            console.warn('错误详情:', dirError.response?.data);
        }
        
        // 2. 创建用户数据文件
        console.log('\n2. 创建用户数据文件...');
        const filePath = `users/${phone}_${studentId}.json`;
        const fileContent = JSON.stringify(userData, null, 2);
        const filePayload = {
            message: `Update user data for ${phone}_${studentId}`,
            content: base64Encode(fileContent),
            branch: branch
        };
        
        const fileResponse = await axios.put(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            filePayload,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        console.log('✓ 成功创建用户数据文件:', fileResponse.status);
        console.log('响应内容:', JSON.stringify(fileResponse.data, null, 2));
        
        console.log('\n🎉 测试成功完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        console.error('错误详情:', error.stack);
    }
}

// 运行测试
testCreateUserData();