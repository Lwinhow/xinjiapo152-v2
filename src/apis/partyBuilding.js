import request from '@/utils/request'
/* 党建统领接口 */
// 党员组织分布
export function getOrganization(params){
  return request({
    url:"/api/commander/organization",
    method: 'get',
    params
  })
}
// 现任党委班子成员
export function getTeamMembers(params){
  return request({
    url:"/api/smart/team/members",
    method: 'get',
    params
  })
}
// 支部信息
export function getOrganizations(params){
  return request({
    url:"/api/smart/organization",
    method: 'get',
    params
  })
}
// 党员信息统计
export function getMemberInfos(params){
  return request({
    url:"/api/commander/member/info/overview",
    method: 'get',
    params
  })
}
// 党建培训与活动
export function getActivity(params){
  return request({
    url:"/api/commander/activity",
    method: 'get',
    params
  })
}
// 顶部-党员统计
export function getMemberCount(params){
  return request({
    url:"/api/commander/member/count",
    method: 'get',
    params
  })
}
// 三培养工程
export function getThreeCultivate(params){
  return request({
    url:"/api/commander/three-cultivate",
    method: 'get',
    params
  })
}
// 党支部
export function getBranch(params){
  return request({
    url:"/api/commander/branch",
    method: 'get',
    params
  })
}
// 党建培训与活动|公益服务
export function getActivityCommonweal(params){
  return request({
    url:"/api/commander/activity/commonweal",
    method: 'get',
    params
  })
}