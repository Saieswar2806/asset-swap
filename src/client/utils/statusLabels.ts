/**
 * Formal status label helpers mapping persisted database states to clear user-facing labels.
 */

export function getPropertyStatusMeta(status?: string) {
  switch (status) {
    case "reviewed":
      return {
        label: "Approved for Listing",
        shortLabel: "Approved",
        badgeClass: "bg-emerald-50 border-emerald-200 text-emerald-700",
        pillClass: "bg-emerald-100 text-emerald-800"
      };
    case "submitted":
      return {
        label: "Submitted for Review",
        shortLabel: "Submitted for Review",
        badgeClass: "bg-blue-50 border-blue-200 text-blue-700",
        pillClass: "bg-blue-100 text-blue-800"
      };
    case "under_review":
      return {
        label: "Under Broker Review",
        shortLabel: "Under Review",
        badgeClass: "bg-amber-50 border-amber-200 text-amber-700",
        pillClass: "bg-amber-100 text-amber-800"
      };
    case "rejected":
      return {
        label: "Rejected",
        shortLabel: "Rejected",
        badgeClass: "bg-red-50 border-red-200 text-red-700",
        pillClass: "bg-red-100 text-red-800"
      };
    case "draft":
      return {
        label: "Draft",
        shortLabel: "Draft",
        badgeClass: "bg-slate-50 border-slate-200 text-slate-600",
        pillClass: "bg-slate-100 text-slate-600"
      };
    default:
      return {
        label: "Submitted for Review",
        shortLabel: "Submitted for Review",
        badgeClass: "bg-blue-50 border-blue-200 text-blue-700",
        pillClass: "bg-blue-100 text-blue-800"
      };
  }
}

export function getPurchaseInterestStatusMeta(inquiry: {
  coordinationStatus?: string;
  sellerResponse?: string;
  adminStatus?: string;
  status?: string;
}) {
  const coord = inquiry.coordinationStatus;
  if (coord === "declined" || inquiry.sellerResponse === "declined") {
    return { label: "Declined", badgeClass: "bg-red-100 text-red-800 border-red-200" };
  }
  if (coord === "closed" || inquiry.adminStatus === "rejected") {
    return { label: "Closed", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" };
  }
  if (coord === "site_visit_scheduled") {
    return { label: "Site Visit Scheduled", badgeClass: "bg-purple-100 text-purple-800 border-purple-200" };
  }
  if (coord === "purchase_process_in_progress") {
    return { label: "Purchase Process in Progress", badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200" };
  }
  if (coord === "coordination_in_progress") {
    return { label: "Coordination in Progress", badgeClass: "bg-teal-100 text-teal-800 border-teal-200" };
  }
  if (coord === "awaiting_admin_coordination" || inquiry.adminStatus === "approved_for_coordination") {
    return { label: "Awaiting Admin Coordination", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  }
  if (coord === "awaiting_admin_review" || inquiry.sellerResponse === "accepted" || inquiry.status === "contacted") {
    return { label: "Awaiting Admin Review", badgeClass: "bg-blue-100 text-blue-800 border-blue-200" };
  }
  return { label: "Awaiting Seller Response", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
}

export function getExchangeCoordStatusLabel(status?: string): string {
  switch (status) {
    case "awaiting_coordination":
      return "Awaiting Admin Coordination";
    case "coordination_in_progress":
      return "Coordination in Progress";
    case "site_visit_pending":
      return "Site Visit Pending";
    case "site_visit_scheduled":
      return "Site Visit Scheduled";
    case "legal_review_in_progress":
    case "completed":
      return "Exchange Process in Progress";
    case "closed":
      return "Closed";
    default:
      return "Awaiting Admin Coordination";
  }
}
