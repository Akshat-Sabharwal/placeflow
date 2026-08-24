import { authorizeRequest } from '@/lib/auth'
import { updateSettingsSchema } from '@/lib/contracts/schemas'
import type { SettingsDTO } from '@/lib/contracts/domain'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { apiData, assertSameOrigin, handleRoute, parseJson, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'

const selectSettings = 'profile_visibility,show_group_memberships,theme_preference,default_group_visibility'

function toSettings(row: { profile_visibility: 'public' | 'private'; show_group_memberships: boolean; theme_preference: 'light' | 'dark'; default_group_visibility: 'public' | 'private' }): SettingsDTO {
  return { profileVisibility: row.profile_visibility, showGroupMemberships: row.show_group_memberships, themePreference: row.theme_preference, defaultGroupVisibility: row.default_group_visibility }
}

export async function GET() {
  return handleRoute(async () => {
    const viewer = await authorizeRequest()
    const { data, error } = await viewer.supabase.from('profiles').select(selectSettings).eq('id', viewer.userId).single()
    if (error || !data) throw new RouteError(404, 'NOT_FOUND', 'Your settings could not be found.')
    return apiData(toSettings(data), { headers: PRIVATE_NO_STORE_HEADERS })
  })
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest()
    const body = await parseJson(request, updateSettingsSchema)
    const { data, error } = await createAdminClient().from('profiles').update({
      profile_visibility: body.profileVisibility,
      show_group_memberships: body.showGroupMemberships,
      theme_preference: body.themePreference,
      default_group_visibility: body.defaultGroupVisibility,
    }).eq('id', viewer.userId).select(selectSettings).single()
    if (error || !data) throw new Error(error?.message ?? 'Settings update failed')
    return apiData(toSettings(data), { headers: PRIVATE_NO_STORE_HEADERS })
  })
}
