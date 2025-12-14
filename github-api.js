// GitHub API 工具类
class GitHubAPI {
    constructor() {
        this.owner = 'Azure428'; // GitHub用户名
        this.repo = 'Azure428.github.io'; // 仓库名称
        // 这里应该由管理员配置实际的GitHub Token
        // 注意：在生产环境中，不应该直接在代码中存储敏感信息
        this.token = 'ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // 示例Token格式，需要管理员替换为实际Token
        this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
        
        // 验证配置信息
        console.log('GitHub API配置:');
        console.log('Owner:', this.owner);
        console.log('Repo:', this.repo);
        console.log('Base URL:', this.baseUrl);
        console.log('Token已配置:', !!this.token && this.token !== 'ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        
        // 如果使用的是示例Token，给出警告
        if (this.token === 'ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX') {
            console.warn('警告: 正在使用示例GitHub Token，所有API请求都将失败！');
            console.warn('请管理员在github-api.js文件中配置有效的GitHub Token。');
        }
    }

    // 设置GitHub访问令牌
    setToken(token) {
        this.token = token;
        console.log('GitHub令牌已更新:', !!this.token);
    }

    // 获取文件内容
    async getFileContent(path) {
        try {
            const response = await fetch(`${this.baseUrl}/contents/${path}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 404) {
                return null; // 文件不存在
            }

            if (response.status === 401) {
                console.error('GitHub API认证失败！请检查Token是否有效。');
                console.error('当前Token:', this.token);
                console.error('请管理员在github-api.js文件中配置有效的GitHub Token。');
                // 对于认证失败，我们也返回null，让调用方可以继续执行
                // 这样即使没有有效的Token，应用也能在本地模式下运行
                return null;
            }

            if (!response.ok) {
                throw new Error(`获取文件失败: ${response.statusText}`);
            }

            const data = await response.json();
            const content = atob(data.content);
            return JSON.parse(content);
        } catch (error) {
            console.error('获取文件内容错误:', error);
            // 对于其他错误，我们也返回null，而不是抛出错误
            // 这样应用可以在本地模式下继续运行
            return null;
        }
    }

    // 创建或更新文件
    async createOrUpdateFile(path, content, message) {
        try {
            // 检查文件是否存在
            const existingFile = await this.getFileContent(path);
            // 使用更可靠的Base64编码方法，支持Unicode字符
            const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));

            const payload = {
                message: message,
                content: contentBase64,
                branch: 'master'
            }

            // 如果文件存在，需要提供sha
            if (existingFile) {
                const response = await fetch(`${this.baseUrl}/contents/${path}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    payload.sha = data.sha;
                } else {
                    console.error('获取文件SHA失败:', response.status, response.statusText);
                }
            }

            console.log('尝试保存文件到GitHub:', path);
            console.log('使用的方法:', existingFile ? 'PUT' : 'POST');
            console.log('请求体:', JSON.stringify(payload, null, 2));

            const response = await fetch(`${this.baseUrl}/contents/${path}`, {
                method: existingFile ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('GitHub API响应状态:', response.status);
            const responseData = await response.json();
            console.log('GitHub API响应内容:', JSON.stringify(responseData, null, 2));

            if (!response.ok) {
                // 检查是否是认证失败
                if (response.status === 401) {
                    console.error('GitHub API认证失败！请检查Token是否有效。');
                    console.error('当前Token:', this.token);
                    console.error('请管理员在github-api.js文件中配置有效的GitHub Token。');
                    // 返回错误信息而不是抛出错误，让调用方可以继续执行
                    return { success: false, error: 'GitHub API认证失败', status: 401 };
                }
                throw new Error(`更新文件失败: ${response.statusText}`);
            }

            return responseData;
        } catch (error) {
            console.error('创建或更新文件错误:', error);
            console.error('错误详情:', error.stack);
            // 对于其他错误，我们也返回错误信息而不是抛出错误
            // 这样应用可以在本地模式下继续运行
            return { success: false, error: error.message };
        }
    }

    // 获取用户数据
    async getUserData(phone, studentId) {
        const path = `users/${phone}_${studentId}.json`;
        try {
            return await this.getFileContent(path);
        } catch (error) {
            // 如果是认证失败或文件不存在，返回null而不是抛出错误
            if (error.message.includes('认证失败') || error.message.includes('404')) {
                console.warn('用户数据获取失败:', error.message);
                return null;
            }
            throw error;
        }
    }

    // 创建或更新用户数据
    async saveUserData(phone, studentId, userData) {
        // 直接创建用户文件，不创建目录占位文件
        // GitHub API会自动创建必要的目录结构
        const path = `users/${phone}_${studentId}.json`;
        const message = `Update user data for ${phone}_${studentId}`;
        try {
            return await this.createOrUpdateFile(path, userData, message);
        } catch (error) {
            // 如果是认证失败，记录错误但不抛出，允许应用继续运行
            if (error.message.includes('认证失败')) {
                console.warn('用户数据保存失败(认证问题):', error.message);
                console.warn('应用将在本地模式下运行，数据不会持久化到GitHub。');
                return { success: false, error: 'GitHub API认证失败，数据未保存' };
            }
            throw error;
        }
    }

    // 获取所有伞点数据
    async getUmbrellaPoints() {
        try {
            return await this.getFileContent('umbrella_points.json');
        } catch (error) {
            // 如果是认证失败或文件不存在，返回null而不是抛出错误
            if (error.message.includes('认证失败') || error.message.includes('404')) {
                console.warn('伞点数据获取失败:', error.message);
                return null;
            }
            throw error;
        }
    }

    // 更新伞点数据
    async saveUmbrellaPoints(pointsData) {
        const message = 'Update umbrella points status';
        return await this.createOrUpdateFile('umbrella_points.json', pointsData, message);
    }

    // 获取单个伞点数据
    async getUmbrellaPoint(pointId) {
        const points = await this.getUmbrellaPoints();
        if (!points) return null;
        return points.find(point => point.id === pointId) || null;
    }

    // 更新单个伞点数据
    async updateUmbrellaPoint(pointId, pointData) {
        const points = await this.getUmbrellaPoints() || [];
        const index = points.findIndex(point => point.id === pointId);
        
        if (index !== -1) {
            points[index] = { ...points[index], ...pointData };
        } else {
            points.push(pointData);
        }
        
        return await this.saveUmbrellaPoints(points);
    }
}

// 初始化GitHub API实例
const githubAPI = new GitHubAPI();