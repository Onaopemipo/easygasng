export type AssignmentIssue = {
  code: string;
  title: string;
  resolution: string;
  responsible: string;
  help?: "drivers" | "fleet";
};

const requirements: Record<string, Omit<AssignmentIssue, "code">> = {
  DRIVER_ALREADY_ASSIGNED: {
    title: "This driver is already assigned",
    resolution:
      "Keep the current assignment, or select a different eligible driver for reassignment.",
    responsible: "Dispatch",
  },
  DRIVER_INACTIVE: {
    title: "Driver account is inactive",
    resolution:
      "Ask the business owner to review the driver account in Drivers. Select an active driver until that review is complete.",
    responsible: "Business owner",
    help: "drivers",
  },
  DRIVER_UNAVAILABLE: {
    title: "Driver availability is off",
    resolution:
      "Confirm the driver is on duty, then update availability in Drivers if authorised, or select another available driver. Availability alone does not start a trip.",
    responsible: "Dispatch / authorised staff",
    help: "drivers",
  },
  DRIVER_TRIP_REQUIRED: {
    title: "Driver has no active vehicle trip",
    resolution:
      "The driver must sign in, open Home → Start trip, choose an active LPG-suitable vehicle in this order’s branch, and enter the starting odometer. If no vehicle is offered, ask the business owner to review the branch’s vehicles. Then refresh this check.",
    responsible: "Driver",
    help: "fleet",
  },
  TRIP_BRANCH_MISMATCH: {
    title: "Active trip belongs to a different branch",
    resolution:
      "Choose a driver with a trip in this order’s fulfilment branch. The existing trip must be reconciled and ended through the normal process before the driver starts another trip; do not change a branch to bypass custody checks.",
    responsible: "Driver / dispatch",
    help: "fleet",
  },
  VEHICLE_INACTIVE: {
    title: "Trip vehicle is inactive",
    resolution:
      "Ask the business owner to review the vehicle. After reconciling and ending the current trip, the driver can start a trip with another approved active vehicle.",
    responsible: "Business owner / driver",
    help: "fleet",
  },
  VEHICLE_LPG_UNVERIFIED: {
    title: "Vehicle is not verified for LPG transport",
    resolution:
      "Use an active vehicle with verified LPG suitability. The business owner must review genuine vehicle evidence; selecting a vehicle or starting a trip does not establish suitability.",
    responsible: "Business owner / driver",
    help: "fleet",
  },
  VEHICLE_BRANCH_MISMATCH: {
    title: "Trip vehicle belongs to a different branch",
    resolution:
      "Use a vehicle registered to this order’s fulfilment branch. Ask the business owner to review the branch record and reconcile existing custody before a replacement trip.",
    responsible: "Business owner / dispatch",
    help: "fleet",
  },
};

export function assignmentIssue(code: string): AssignmentIssue {
  const value = requirements[code];
  if (!value) throw new Error("Unknown assignment requirement");
  return { code, ...value };
}

/** Existing canonical rejection text remains authoritative for other fulfilment checks. */
export function fulfilmentIssue(
  message: string,
  code = "INVALID_REQUEST",
): AssignmentIssue {
  if (requirements[code]) return assignmentIssue(code);
  let responsible = "Dispatch / authorised operations staff";
  let resolution =
    "Complete the review described above using the existing order workflow, then refresh eligibility. Do not override payment, safety or custody records to clear this check.";
  if (/payment|invoice|finance/i.test(message)) {
    responsible = "Finance / authorised business staff";
    resolution =
      "Review the order’s invoice, verified payments and any approved cash-on-delivery policy. Finance must reconcile outstanding payment or corrections before dispatch. Then refresh eligibility.";
  } else if (/inspection|qualification|calibrat|cylinder/i.test(message)) {
    responsible = "Qualified operations staff / business owner";
    resolution =
      "Review the order’s inspection, qualification and custody evidence in the existing fulfilment workflow. Complete genuine required checks before refreshing eligibility.";
  } else if (/delivery capacity|window/i.test(message)) {
    resolution =
      "Review the branch’s delivery window and existing bookings. Reconcile capacity or reschedule through the normal order workflow, then refresh eligibility.";
  }
  return { code, title: message, resolution, responsible };
}
