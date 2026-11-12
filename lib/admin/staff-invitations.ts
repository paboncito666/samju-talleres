export type StaffInvitationAuthUser = {
  invited_at?: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
};

export function isPendingStaffInvitation(user: StaffInvitationAuthUser) {
  return Boolean(user.invited_at && !user.email_confirmed_at && !user.last_sign_in_at);
}
