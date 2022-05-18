// let access = ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION === 'site' ? 'admin' : '';
let access = 'admin'

function getAccess() {
    return access;
}

const ADMIN_USER = {
    success: true,
    data: {
        name: 'fivestarsky',
        avatar: 'https://avatars.githubusercontent.com/u/809447?v=4',
        userid: '00000001',
        email: 'fivestarsky@gmail.com',
        signature: '海纳百川，有容乃大',
        title: '交互专家',
        group: 'OSS_KNOW',
        tags: [
            {
                key: '0',
                label: '很有想法的',
            },
            {
                key: '1',
                label: '专注设计',
            },
            {
                key: '2',
                label: '辣~',
            },
            {
                key: '3',
                label: '大长腿',
            },
            {
                key: '4',
                label: '川妹子',
            },
            {
                key: '5',
                label: '海纳百川',
            },
        ],
        notifyCount: 12,
        unreadCount: 11,
        country: 'China',
        access: getAccess(),
        geographic: {
            province: {
                label: '北京市',
                key: '100000',
            },
            city: {
                label: '西城区',
                key: '100000',
            },
        },
        address: '新街口',
        phone: '010-88888888',
    },
}

module.exports.getAccess = getAccess
module.exports.ADMIN_USER = ADMIN_USER