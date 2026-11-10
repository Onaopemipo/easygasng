export type TechnicianDirectoryRow = {
  id: string;
  name: string;
  branch_id: string;
  active: boolean;
  technician_available: boolean;
  qualifications: {
    id: string;
    code: string;
    expires_at: string;
    verified: boolean;
    evidence?: string | null;
    verifiedBy?: string;
  }[];
  on_assignment: boolean;
  available_today: boolean;
};
export type TechnicianScheduleRow = {
  id: string;
  service_id: string;
  service_name: string;
  technician_id: string;
  technician_name: string;
  branch_id: string;
  starts_at: string;
  ends_at: string;
  blocked: boolean;
  capacity: number;
  bookings: number;
  eligible: boolean;
};
export type TechnicianWorkspaceData = {
  generatedAt: string;
  timeZone: "Africa/Lagos";
  summary: {
    total: number;
    active: number;
    onAssignment: number;
    availableToday: number;
  };
  people: TechnicianDirectoryRow[];
  total: number;
  page: number;
  pageSize: number;
  branches: { id: string; name: string; active: boolean }[];
  services: { id: string; name: string; branch_id: string; config: any }[];
  schedule: TechnicianScheduleRow[];
  scheduleTotal: number;
  verificationTargets: {
    id: string;
    name: string;
    role: string;
    branch_id: string;
  }[];
  permissions: {
    invite: boolean;
    edit: boolean;
    verify: boolean;
    schedule: boolean;
  };
};
export function lagosAppointment(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Choose a valid appointment date and time.");
  const iso = value + ":00+01:00";
  if (
    !Number.isFinite(Date.parse(iso)) ||
    new Date(Date.parse(iso) + 3600000).toISOString().slice(0, 16) !== value
  )
    throw new Error("Choose a valid appointment date and time.");
  return new Date(iso).toISOString();
}
