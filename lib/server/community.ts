import 'server-only'

import type { CommunityGroupDTO, CommunityGroupDetailDTO, CommunityMemberDTO, CommunityMessageDTO } from '@/lib/contracts/domain'
import type { Database } from '@/lib/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type Admin = SupabaseClient<Database>

export async function listCommunityGroups(admin: Admin, viewerId: string): Promise<CommunityGroupDTO[]> {
  const { data: groups, error } = await admin.from('community_groups').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error(error.message)
  if (!groups?.length) return []
  const groupIds = groups.map((group) => group.id)
  const ownerIds = [...new Set(groups.map((group) => group.owner_id))]
  const [{ data: members }, { data: owners }] = await Promise.all([
    admin.from('community_members').select('*').in('group_id', groupIds),
    admin.from('profiles').select('id,full_name').in('id', ownerIds),
  ])
  const ownerNames = new Map((owners ?? []).map((profile) => [profile.id, profile.full_name ?? 'PlaceFlow member']))
  return groups.map((group) => {
    const groupMembers = (members ?? []).filter((member) => member.group_id === group.id)
    const viewer = groupMembers.find((member) => member.user_id === viewerId)
    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      visibility: group.visibility,
      ownerId: group.owner_id,
      ownerName: ownerNames.get(group.owner_id) ?? 'PlaceFlow member',
      memberCount: groupMembers.filter((member) => member.status === 'active').length,
      viewerRole: viewer?.role ?? null,
      viewerStatus: viewer?.status ?? null,
      pendingCount: viewer && ['owner', 'moderator'].includes(viewer.role) ? groupMembers.filter((member) => member.status === 'pending').length : 0,
      createdAt: group.created_at,
    }
  })
}

export async function getCommunityDetail(admin: Admin, viewerId: string, groupId: string): Promise<CommunityGroupDetailDTO | null> {
  const groups = await listCommunityGroups(admin, viewerId)
  const group = groups.find((item) => item.id === groupId)
  if (!group) return null
  if (group.viewerStatus !== 'active') return { ...group, members: [], messages: [] }
  const [{ data: members, error: memberError }, { data: messages, error: messageError }] = await Promise.all([
    admin.from('community_members').select('*').eq('group_id', groupId).in('status', ['active', 'pending']).order('requested_at'),
    admin.from('community_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true }).limit(300),
  ])
  if (memberError || messageError) throw new Error(memberError?.message ?? messageError?.message)
  const profileIds = [...new Set([...(members ?? []).map((member) => member.user_id), ...(messages ?? []).map((message) => message.author_id)])]
  const { data: profiles, error: profileError } = profileIds.length
    ? await admin.from('profiles').select('id,full_name,avatar_url').in('id', profileIds)
    : { data: [], error: null }
  if (profileError) throw new Error(profileError.message)
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const memberDtos: CommunityMemberDTO[] = (members ?? []).map((member) => ({
    userId: member.user_id,
    fullName: profileMap.get(member.user_id)?.full_name ?? 'PlaceFlow member',
    avatarUrl: profileMap.get(member.user_id)?.avatar_url ?? null,
    role: member.role,
    status: member.status,
    requestedAt: member.requested_at,
    joinedAt: member.joined_at,
  }))
  const messageDtos: CommunityMessageDTO[] = (messages ?? []).map((message) => ({
    id: message.id,
    groupId: message.group_id,
    authorId: message.author_id,
    authorName: profileMap.get(message.author_id)?.full_name ?? 'PlaceFlow member',
    authorAvatarUrl: profileMap.get(message.author_id)?.avatar_url ?? null,
    replyToId: message.reply_to_id,
    body: message.body,
    createdAt: message.created_at,
    updatedAt: message.updated_at,
  }))
  return { ...group, members: memberDtos, messages: messageDtos }
}
