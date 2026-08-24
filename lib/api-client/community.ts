import type { CommunityGroupDTO, CommunityGroupDetailDTO, CommunityMessageDTO } from "@/lib/contracts/domain";
import { apiRequest } from "./client";

export const getCommunities = () => apiRequest<CommunityGroupDTO[]>("/api/communities");
export const createCommunity = (input: { name: string; description: string; visibility: "public" | "private" }) => apiRequest<CommunityGroupDTO>("/api/communities", { method: "POST", body: JSON.stringify(input) });
export const getCommunity = (id: string) => apiRequest<CommunityGroupDetailDTO>(`/api/communities/${id}`);
export const joinCommunity = (id: string) => apiRequest<CommunityGroupDTO>(`/api/communities/${id}/join`, { method: "POST" });
export const sendCommunityMessage = (id: string, input: { body: string; replyToId?: string | null }) => apiRequest<CommunityMessageDTO>(`/api/communities/${id}/messages`, { method: "POST", body: JSON.stringify(input) });
export const moderateCommunityMember = (id: string, input: { userId: string; action: "approve" | "reject" }) => apiRequest<CommunityGroupDetailDTO>(`/api/communities/${id}/members`, { method: "PATCH", body: JSON.stringify(input) });
