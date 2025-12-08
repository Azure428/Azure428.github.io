// 主应用逻辑
class UmbrellaApp {
    constructor() {
        this.currentUser = null;
        this.umbrellaPoints = [];
        // 不要在构造函数中立即调用init，等待DOM加载完成
        console.log('UmbrellaApp构造函数执行');
    }

    init() {
        // 绑定事件
        this.bindEvents();
        console.log('UmbrellaApp初始化完成，开始检查githubAPI实例');
        console.log('当前全局githubAPI:', window.githubAPI);
        console.log('当前globalThis.githubAPI:', globalThis.githubAPI);
        // 初始化数据
        this.initData();
    }

    bindEvents() {
        // 登录表单提交
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // 退出登录
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // 借伞按钮
        document.getElementById('borrowBtn').addEventListener('click', () => {
            this.borrowUmbrella();
        });

        // 还伞按钮
        document.getElementById('returnBtn').addEventListener('click', () => {
            this.returnUmbrella();
        });
    }

    async initData() {
        // 初始化伞点数据（如果不存在）
        try {
            console.log('开始初始化数据...');
            
            // 确保githubAPI实例存在
            if (!window.githubAPI) {
                console.error('initData() - 未找到githubAPI实例！');
                return;
            }
            
            const points = await window.githubAPI.getUmbrellaPoints();
            console.log('获取伞点数据结果:', points);
            
            if (!points) {
                // 创建初始伞点数据
                console.log('没有找到伞点数据，准备创建初始数据...');
                const initialPoints = [
                    { id: 'point001', name: '图书馆门口', location: '图书馆正门左侧', count: 10 },
                    { id: 'point002', name: '教学楼A座', location: '教学楼A座大厅', count: 8 },
                    { id: 'point003', name: '食堂门口', location: '第一食堂正门', count: 12 },
                    { id: 'point004', name: '宿舍区', location: '1号楼门口', count: 5 }
                ];
                
                try {
                    const saveResult = await window.githubAPI.saveUmbrellaPoints(initialPoints);
                    console.log('保存初始伞点数据结果:', saveResult);
                    this.umbrellaPoints = initialPoints;
                } catch (saveError) {
                    console.error('保存初始伞点数据失败，将使用本地数据:', saveError);
                    this.umbrellaPoints = initialPoints;
                }
            } else {
                this.umbrellaPoints = points;
            }
        } catch (error) {
            console.error('初始化数据失败:', error);
            console.error('错误详情:', error.stack);
            // 使用本地默认数据
            this.umbrellaPoints = [
                { id: 'point001', name: '图书馆门口', location: '图书馆正门左侧', count: 10 },
                { id: 'point002', name: '教学楼A座', location: '教学楼A座大厅', count: 8 },
                { id: 'point003', name: '食堂门口', location: '第一食堂正门', count: 12 },
                { id: 'point004', name: '宿舍区', location: '1号楼门口', count: 5 }
            ];
            console.log('使用本地默认伞点数据:', this.umbrellaPoints);
        }
    }

    async login() {
        const phone = document.getElementById('phone').value;
        const studentId = document.getElementById('studentId').value;

        try {
            console.log('开始登录...');
            console.log('登录信息 - 手机号:', phone, '学号:', studentId);
            
            // 确保githubAPI实例存在
            if (!window.githubAPI) {
                console.error('login() - 未找到githubAPI实例！');
                // 尝试重新创建
                window.githubAPI = new GitHubAPI();
                console.log('login() - 已重新创建githubAPI实例:', window.githubAPI);
            }
            
            // 检查用户是否存在
            let userData = null;
            try {
                userData = await window.githubAPI.getUserData(phone, studentId);
                console.log('获取用户数据结果:', userData);
            } catch (getError) {
                console.warn('获取用户数据失败，可能是因为用户不存在:', getError.message);
                // 如果获取失败（如404错误），视为用户不存在
                userData = null;
            }

            if (!userData) {
                // 创建新用户
                console.log('用户不存在，创建新用户...');
                userData = {
                    phone: phone,
                    studentId: studentId,
                    borrowStatus: '未借伞',
                    currentUmbrella: null,
                    borrowHistory: []
                };
                
                try {
                    const saveResult = await window.githubAPI.saveUserData(phone, studentId, userData);
                    console.log('保存新用户数据结果:', saveResult);
                } catch (saveError) {
                    console.error('保存新用户数据失败:', saveError);
                    alert('创建用户失败: ' + saveError.message);
                    return;
                }
            }

            // 设置当前用户
            this.currentUser = userData;
            // 加载伞点数据
            await this.loadUmbrellaPoints();
            // 切换到主页面
            this.showMainPage();
            // 更新用户信息
            this.updateUserInfo();
            
            console.log('登录成功，当前用户:', this.currentUser);
            alert('登录成功！');
        } catch (error) {
            console.error('登录错误:', error);
            console.error('错误详情:', error.stack);
            // 给出更详细的错误提示
            if (error.message.includes('token')) {
                alert('登录失败: GitHub API token错误或未提供，请检查URL中的token参数');
            } else if (error.message.includes('404')) {
                alert('登录失败: 未找到指定资源，请检查GitHub仓库设置');
            } else {
                alert('登录失败: ' + error.message);
            }
        }
    }

    logout() {
        this.currentUser = null;
        document.getElementById('loginPage').style.display = 'block';
        document.getElementById('mainPage').style.display = 'none';
        document.getElementById('loginForm').reset();
    }

    showMainPage() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainPage').style.display = 'block';
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        document.getElementById('userName').textContent = `欢迎，${this.currentUser.phone}`;
        document.getElementById('userPhone').textContent = this.currentUser.phone;
        document.getElementById('userStudentId').textContent = this.currentUser.studentId;
        document.getElementById('borrowStatus').textContent = this.currentUser.borrowStatus;
        document.getElementById('currentUmbrella').textContent = this.currentUser.currentUmbrella || '无';

        // 更新借伞记录
        const historyContainer = document.getElementById('borrowHistory');
        historyContainer.innerHTML = '';

        if (this.currentUser.borrowHistory && this.currentUser.borrowHistory.length > 0) {
            this.currentUser.borrowHistory.forEach((record, index) => {
                const recordDiv = document.createElement('div');
                recordDiv.className = 'history-item';
                recordDiv.innerHTML = `
                    <p>记录 ${index + 1}: ${record.action} - ${record.pointName}</p>
                    <p>时间: ${record.timestamp}</p>
                `;
                historyContainer.appendChild(recordDiv);
            });
        } else {
            historyContainer.innerHTML = '<p>暂无借伞记录</p>';
        }
    }

    async loadUmbrellaPoints() {
        try {
            console.log('开始加载伞点数据...');
            
            // 确保githubAPI实例存在
            if (!window.githubAPI) {
                console.error('loadUmbrellaPoints() - 未找到githubAPI实例！');
                return;
            }
            
            const points = await window.githubAPI.getUmbrellaPoints();
            console.log('加载伞点数据结果:', points);
            
            if (points) {
                this.umbrellaPoints = points;
                this.renderUmbrellaPoints();
            } else {
                console.log('没有加载到伞点数据，使用本地默认数据...');
                // 使用默认数据
                this.umbrellaPoints = [
                    { id: 'point001', name: '图书馆门口', location: '图书馆正门左侧', count: 10 },
                    { id: 'point002', name: '教学楼A座', location: '教学楼A座大厅', count: 8 },
                    { id: 'point003', name: '食堂门口', location: '第一食堂正门', count: 12 },
                    { id: 'point004', name: '宿舍区', location: '1号楼门口', count: 5 }
                ];
                this.renderUmbrellaPoints();
                // 尝试保存到GitHub
                try {
                    const saveResult = await window.githubAPI.saveUmbrellaPoints(this.umbrellaPoints);
                    console.log('保存默认伞点数据到GitHub结果:', saveResult);
                } catch (saveError) {
                    console.error('保存默认伞点数据到GitHub失败:', saveError);
                }
            }
        } catch (error) {
            console.error('加载伞点数据失败:', error);
            console.error('错误详情:', error.stack);
            // 使用本地默认数据
            this.umbrellaPoints = [
                { id: 'point001', name: '图书馆门口', location: '图书馆正门左侧', count: 10 },
                { id: 'point002', name: '教学楼A座', location: '教学楼A座大厅', count: 8 },
                { id: 'point003', name: '食堂门口', location: '第一食堂正门', count: 12 },
                { id: 'point004', name: '宿舍区', location: '1号楼门口', count: 5 }
            ];
            this.renderUmbrellaPoints();
        }
    }

    renderUmbrellaPoints() {
        const pointsList = document.getElementById('pointsList');
        pointsList.innerHTML = '';

        this.umbrellaPoints.forEach(point => {
            const pointCard = document.createElement('div');
            pointCard.className = 'point-card';
            pointCard.innerHTML = `
                <h3>${point.name}</h3>
                <p>位置: ${point.location}</p>
                <p>剩余雨伞: <span class="umbrella-count ${point.count > 0 ? 'available' : 'unavailable'}">${point.count}</span></p>
                <p>ID: ${point.id}</p>
            `;
            pointsList.appendChild(pointCard);
        });
    }

    async borrowUmbrella() {
        if (!this.currentUser) {
            alert('请先登录');
            return;
        }

        if (this.currentUser.borrowStatus === '已借伞') {
            alert('您已经借了一把伞，不能再借');
            return;
        }

        const pointId = document.getElementById('pointIdInput').value;
        if (!pointId) {
            alert('请输入伞点ID');
            return;
        }

        try {
            // 获取伞点信息
            const point = this.umbrellaPoints.find(p => p.id === pointId);
            if (!point) {
                alert('伞点不存在');
                return;
            }

            if (point.count <= 0) {
                alert('该伞点没有可用雨伞');
                return;
            }

            // 更新用户信息
            this.currentUser.borrowStatus = '已借伞';
            this.currentUser.currentUmbrella = pointId;
            
            // 添加借伞记录
            const borrowRecord = {
                action: '借伞',
                pointId: pointId,
                pointName: point.name,
                timestamp: new Date().toLocaleString()
            };
            
            if (!this.currentUser.borrowHistory) {
                this.currentUser.borrowHistory = [];
            }
            this.currentUser.borrowHistory.push(borrowRecord);

            // 更新伞点信息
            point.count -= 1;

            // 保存到GitHub
            if (!window.githubAPI) {
                console.error('borrowUmbrella() - 未找到githubAPI实例！');
                alert('保存数据失败：未找到API实例');
                return;
            }
            
            try {
                await Promise.all([
                    window.githubAPI.saveUserData(this.currentUser.phone, this.currentUser.studentId, this.currentUser),
                    window.githubAPI.saveUmbrellaPoints(this.umbrellaPoints)
                ]);
            } catch (saveError) {
                console.error('保存借伞数据失败:', saveError);
                alert('保存借伞记录失败: ' + saveError.message);
                return;
            }

            // 更新界面
            this.updateUserInfo();
            this.renderUmbrellaPoints();
            
            alert('借伞成功');
            document.getElementById('pointIdInput').value = '';
        } catch (error) {
            console.error('借伞失败:', error);
            alert('借伞失败: ' + error.message);
        }
    }

    async returnUmbrella() {
        if (!this.currentUser) {
            alert('请先登录');
            return;
        }

        if (this.currentUser.borrowStatus === '未借伞') {
            alert('您没有借伞，无需归还');
            return;
        }

        const pointId = document.getElementById('pointIdInput').value;
        if (!pointId) {
            alert('请输入伞点ID');
            return;
        }

        try {
            // 获取伞点信息
            const point = this.umbrellaPoints.find(p => p.id === pointId);
            if (!point) {
                alert('伞点不存在');
                return;
            }

            // 更新用户信息
            this.currentUser.borrowStatus = '未借伞';
            const borrowedPointId = this.currentUser.currentUmbrella;
            this.currentUser.currentUmbrella = null;
            
            // 添加还伞记录
            const returnRecord = {
                action: '还伞',
                pointId: pointId,
                pointName: point.name,
                timestamp: new Date().toLocaleString()
            };
            this.currentUser.borrowHistory.push(returnRecord);

            // 更新伞点信息
            point.count += 1;

            // 保存到GitHub
            if (!window.githubAPI) {
                console.error('returnUmbrella() - 未找到githubAPI实例！');
                alert('保存数据失败：未找到API实例');
                return;
            }
            
            try {
                await Promise.all([
                    window.githubAPI.saveUserData(this.currentUser.phone, this.currentUser.studentId, this.currentUser),
                    window.githubAPI.saveUmbrellaPoints(this.umbrellaPoints)
                ]);
            } catch (saveError) {
                console.error('保存还伞数据失败:', saveError);
                alert('保存还伞记录失败: ' + saveError.message);
                return;
            }

            // 更新界面
            this.updateUserInfo();
            this.renderUmbrellaPoints();
            
            alert('还伞成功');
            document.getElementById('pointIdInput').value = '';
        } catch (error) {
            console.error('还伞失败:', error);
            alert('还伞失败: ' + error.message);
        }
    }

    // 通过URL参数处理扫码登录
    handleScanParams() {
        const params = new URLSearchParams(window.location.search);
        const pointId = params.get('pointId');
        if (pointId) {
            document.getElementById('pointIdInput').value = pointId;
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM完全加载完成');
    // 确保githubAPI实例存在
    if (window.githubAPI) {
        console.log('页面加载完成，使用已创建的githubAPI实例:', window.githubAPI);
    } else {
        console.error('页面加载完成，但未找到githubAPI实例！');
        // 如果没有实例，尝试重新创建
        window.githubAPI = new GitHubAPI();
        console.log('已重新创建githubAPI实例:', window.githubAPI);
    }
    // 初始化应用
    const app = new UmbrellaApp();
    // 手动调用init，确保在DOM加载完成后执行
    app.init();
    // 处理扫码参数
    app.handleScanParams();
});