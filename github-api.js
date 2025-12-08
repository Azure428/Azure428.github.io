// GitHub API 工具类
class GitHubAPI {
    constructor() {
        this.owner = 'Azure428'; // GitHub用户名
        this.repo = 'Azure428.github.io'; // 仓库名称
        
        // 尝试从多个来源获取token
        this.token = this.getTokenFromMultipleSources();
        
        this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
        
        // 验证配置信息
        console.log('GitHub API配置:');
        console.log('Owner:', this.owner);
        console.log('Repo:', this.repo);
        console.log('Base URL:', this.baseUrl);
        console.log('Token存在:', !!this.token);
    }
    
    // 从多个来源获取token
    getTokenFromMultipleSources() {
        // 1. 从URL参数获取token（用于浏览器环境）
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('token');
        if (token) {
            console.log('从URL参数获取到token');
            // 保存到localStorage以便后续使用
            localStorage.setItem('github_token', token);
            return token;
        }
        
        // 2. 从localStorage获取token
        token = localStorage.getItem('github_token');
        if (token) {
            console.log('从localStorage获取到token');
            return token;
        }
        
        // 3. 从环境变量获取token（如果有配置）
        if (typeof process !== 'undefined' && process.env && process.env.GITHUB_TOKEN) {
            console.log('从环境变量获取到token');
            return process.env.GITHUB_TOKEN;
        }
        
        // 4. 如果都没有，返回null
        return null;
    }
    
    // 设置token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('github_token', token);
            console.log('Token已设置并保存到localStorage');
        } else {
            localStorage.removeItem('github_token');
            console.log('Token已清除');
        }
    }

    // 获取文件内容
    async getFileContent(path) {
        try {
            // 检查token是否存在
            if (!this.token) {
                throw new Error('GitHub API token不存在，请在URL中添加token参数，如：?token=your_github_token');
            }
            
            // 确保Authorization头只包含ISO-8859-1字符
            const authHeader = 'token ' + this.token;
            
            // 对路径进行URL编码，确保只包含有效的ASCII字符
            const encodedPath = encodeURIComponent(path);
            const response = await fetch(`${this.baseUrl}/contents/${encodedPath}`, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 404) {
                return null; // 文件不存在
            }

            if (!response.ok) {
                throw new Error(`获取文件失败: ${response.statusText}`);
            }

            const data = await response.json();
            const content = atob(data.content);
            return JSON.parse(content);
        } catch (error) {
            console.error('获取文件内容错误:', error);
            throw error;
        }
    }

    // 创建或更新文件
    async createOrUpdateFile(path, content, message) {
        try {
            // 检查token是否存在
            if (!this.token) {
                throw new Error('GitHub API token不存在，请在URL中添加token参数，如：?token=your_github_token');
            }
            
            // 检查文件是否存在
            const existingFile = await this.getFileContent(path);
            // 使用支持Unicode的Base64编码方法
            const contentStr = JSON.stringify(content, null, 2);
            const contentBase64 = btoa(unescape(encodeURIComponent(contentStr)));

            const payload = {
                message: message,
                content: contentBase64,
                branch: 'main'
            };

            // 如果文件存在，需要提供sha
            if (existingFile) {
                // 确保Authorization头只包含ISO-8859-1字符
                const authHeader = 'token ' + this.token;
                
                // 对路径进行URL编码，确保只包含有效的ASCII字符
                const encodedPath = encodeURIComponent(path);
                const response = await fetch(`${this.baseUrl}/contents/${encodedPath}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': authHeader,
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

            // 确保Authorization头只包含ISO-8859-1字符
            const authHeader = 'token ' + this.token;
            
            // 对路径进行URL编码，确保只包含有效的ASCII字符
            const encodedPath = encodeURIComponent(path);
            const response = await fetch(`${this.baseUrl}/contents/${encodedPath}`, {
                method: existingFile ? 'PUT' : 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('GitHub API响应状态:', response.status);
            const responseData = await response.json();
            console.log('GitHub API响应内容:', JSON.stringify(responseData, null, 2));

            if (!response.ok) {
                throw new Error(`更新文件失败: ${response.statusText}`);
            }

            return responseData;
        } catch (error) {
            console.error('创建或更新文件错误:', error);
            console.error('错误详情:', error.stack);
            throw error;
        }
    }

    // 获取用户数据
    async getUserData(phone, studentId) {
        const path = `users/${phone}_${studentId}.json`;
        return await this.getFileContent(path);
    }

    // 创建或更新用户数据
    async saveUserData(phone, studentId, userData) {
        // 尝试先创建一个简单的目录占位文件，确保users目录存在
        try {
            await this.createOrUpdateFile('users/.gitkeep', '', 'Create users directory');
        } catch (error) {
            console.warn('创建目录占位文件失败:', error);
            // 继续执行，因为即使目录不存在，GitHub API也可能会自动创建
        }
        
        const path = `users/${phone}_${studentId}.json`;
        const message = `Update user data for ${phone}_${studentId}`;
        return await this.createOrUpdateFile(path, userData, message);
    }

    // 获取所有伞点数据
    async getUmbrellaPoints() {
        return await this.getFileContent('umbrella_points.json');
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

// 初始化GitHub API实例并添加到全局作用域
window.githubAPI = new GitHubAPI();
console.log('GitHub API实例已创建并添加到全局作用域:', window.githubAPI);
// 确保全局变量可用
globalThis.githubAPI = window.githubAPI;