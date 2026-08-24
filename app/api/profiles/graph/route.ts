import { authorizeRequest } from '@/lib/auth'
import type { AppRole, ProfileGraphDTO } from '@/lib/contracts/domain'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { apiData, handleRoute, PRIVATE_NO_STORE_HEADERS } from '@/lib/server/http'

export async function GET() {
  return handleRoute(async () => {
    const viewer = await authorizeRequest()
    const admin = createAdminClient()
    const [{ data: profiles, error: profileError }, { data: roles, error: roleError }, { data: groups, error: groupError }] = await Promise.all([
      admin.from('profiles').select('id,full_name,avatar_url,branch,graduation_year,profile_visibility,show_group_memberships').or(`profile_visibility.eq.public,id.eq.${viewer.userId}`).limit(120),
      admin.from('user_roles').select('user_id,role'),
      admin.from('community_groups').select('id').eq('visibility', 'public'),
    ])
    if (profileError || roleError || groupError) throw new Error(profileError?.message ?? roleError?.message ?? groupError?.message)
    const publicGroupIds = (groups ?? []).map((group) => group.id)
    const { data: memberships, error: membershipError } = publicGroupIds.length
      ? await admin.from('community_members').select('group_id,user_id').in('group_id', publicGroupIds).eq('status', 'active')
      : { data: [], error: null }
    if (membershipError) throw new Error(membershipError.message)
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
    const roleMap = new Map((roles ?? []).map((role) => [role.user_id, role.role as AppRole]))
    const visibleMemberships = (memberships ?? []).filter((member) => {
      const profile = profileMap.get(member.user_id)
      return profile && (member.user_id === viewer.userId || profile.show_group_memberships)
    })
    const groupCount = new Map<string, number>()
    visibleMemberships.forEach((member) => groupCount.set(member.user_id, (groupCount.get(member.user_id) ?? 0) + 1))
    const edgeCount = new Map<string, number>()
    for (const groupId of publicGroupIds) {
      const ids = visibleMemberships.filter((member) => member.group_id === groupId).map((member) => member.user_id).sort()
      for (let i = 0; i < ids.length; i += 1) for (let j = i + 1; j < ids.length; j += 1) {
        const key = `${ids[i]}:${ids[j]}`
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1)
      }
    }
    const result: ProfileGraphDTO = {
      nodes: (profiles ?? []).map((profile) => ({ id: profile.id, label: profile.full_name ?? 'PlaceFlow member', role: roleMap.get(profile.id) ?? 'student', branch: profile.branch, graduationYear: profile.graduation_year, avatarUrl: profile.avatar_url, groupCount: groupCount.get(profile.id) ?? 0, isViewer: profile.id === viewer.userId })),
      edges: [...edgeCount.entries()].map(([key, sharedGroups]) => { const [source, target] = key.split(':'); return { source, target, sharedGroups } }),
    }
    return apiData(result, { headers: PRIVATE_NO_STORE_HEADERS })
  })
}
