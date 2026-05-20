/** Human-readable account type for headers and profile chrome. */
export function userTypeTitle(
  userType: 'ADMIN' | 'ORGANISATION' | 'PROFESSIONAL' | undefined | null,
): string {
  switch (userType) {
    case 'ADMIN':
      return 'Admin';
    case 'ORGANISATION':
      return 'Organisation';
    case 'PROFESSIONAL':
      return 'Professional';
    default:
      return 'Member';
  }
}
