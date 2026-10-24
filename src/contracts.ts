// Generated from the existing API OpenAPI document. Do not edit by hand.
export interface CsrfToken {
 "token"?: string | null;
}
export interface SessionView {
 "id"?: string | null;
 "name"?: string | null;
 "capability"?: string | null;
 "verifiedUntil"?: string | null;
}
export interface Priority_GetAllResponse {
 "rows1"?: (Priority_GetAllRow1)[] | null;
}
export interface Priority_GetAllRow1 {
 "priorityID"?: number | null;
 "priorityCode"?: string | null;
 "priorityName"?: string | null;
 "priorityDescription"?: string | null;
 "priorityRank"?: number | null;
 "displayOrder"?: number | null;
 "isActive"?: boolean | null;
 "createdBy"?: string | null;
 "createdAt"?: string | null;
 "updatedBy"?: string | null;
 "updatedAt"?: string | null;
 "rowVersion"?: string | null;
}
export interface Priority_GetAllRequest {
}
export interface Priority_GetActiveResponse {
 "rows1"?: (Priority_GetActiveRow1)[] | null;
}
export interface Priority_GetActiveRow1 {
 "priorityID"?: number | null;
 "priorityCode"?: string | null;
 "priorityName"?: string | null;
 "priorityDescription"?: string | null;
 "priorityRank"?: number | null;
 "displayOrder"?: number | null;
 "isActive"?: boolean | null;
 "createdBy"?: string | null;
 "createdAt"?: string | null;
 "updatedBy"?: string | null;
 "updatedAt"?: string | null;
 "rowVersion"?: string | null;
}
export interface Priority_GetActiveRequest {
}
export interface TicketStatus_GetAllResponse {
 "rows1"?: (TicketStatus_GetAllRow1)[] | null;
}
export interface TicketStatus_GetAllRow1 {
 "statusID"?: number | null;
 "statusCode"?: string | null;
 "statusName"?: string | null;
 "statusDescription"?: string | null;
 "displayOrder"?: number | null;
 "isTerminal"?: boolean | null;
 "isActive"?: boolean | null;
}
export interface TicketStatus_GetAllRequest {
}
export interface TicketStatus_GetActiveResponse {
 "rows1"?: (TicketStatus_GetActiveRow1)[] | null;
}
export interface TicketStatus_GetActiveRow1 {
 "statusID"?: number | null;
 "statusCode"?: string | null;
 "statusName"?: string | null;
 "statusDescription"?: string | null;
 "displayOrder"?: number | null;
 "isTerminal"?: boolean | null;
 "isActive"?: boolean | null;
}
export interface TicketStatus_GetActiveRequest {
}
export interface Dashboard_SummaryByStatusResponse {
 "rows1"?: (Dashboard_SummaryByStatusRow1)[] | null;
}
export interface Dashboard_SummaryByStatusRow1 {
 "statusCode"?: string | null;
 "statusName"?: string | null;
 "ticketCount"?: number | null;
}
export interface Dashboard_SummaryByStatusRequest {
 "fromDate": string;
 "toDate": string;
}
export interface Dashboard_PendingApprovalCountResponse {
 "rows1"?: (Dashboard_PendingApprovalCountRow1)[] | null;
}
export interface Dashboard_PendingApprovalCountRow1 {
 "pendingApprovalCount"?: number | null;
}
export interface Dashboard_PendingApprovalCountRequest {
 "fromDate": string;
 "toDate": string;
}
export interface Dashboard_CriticalHighResponse {
 "rows1"?: (Dashboard_CriticalHighRow1)[] | null;
}
export interface Dashboard_CriticalHighRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "serviceID"?: number | null;
 "priorityCode"?: string | null;
 "statusCode"?: string | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "totalRows"?: number | null;
}
export interface Dashboard_CriticalHighRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_OverdueApprovalResponse {
 "rows1"?: (Dashboard_OverdueApprovalRow1)[] | null;
}
export interface Dashboard_OverdueApprovalRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "serviceID"?: number | null;
 "priorityCode"?: string | null;
 "statusCode"?: string | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "totalRows"?: number | null;
}
export interface Dashboard_OverdueApprovalRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_OverdueResolutionResponse {
 "rows1"?: (Dashboard_OverdueResolutionRow1)[] | null;
}
export interface Dashboard_OverdueResolutionRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "serviceID"?: number | null;
 "priorityCode"?: string | null;
 "statusCode"?: string | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "totalRows"?: number | null;
}
export interface Dashboard_OverdueResolutionRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_SentToBranchResponse {
 "rows1"?: (Dashboard_SentToBranchRow1)[] | null;
}
export interface Dashboard_SentToBranchRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "serviceID"?: number | null;
 "priorityCode"?: string | null;
 "statusCode"?: string | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "totalRows"?: number | null;
}
export interface Dashboard_SentToBranchRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_SentToDivisionResponse {
 "rows1"?: (Dashboard_SentToDivisionRow1)[] | null;
}
export interface Dashboard_SentToDivisionRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "serviceID"?: number | null;
 "priorityCode"?: string | null;
 "statusCode"?: string | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "totalRows"?: number | null;
}
export interface Dashboard_SentToDivisionRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_CompletedResponse {
 "rows1"?: (Dashboard_CompletedRow1)[] | null;
}
export interface Dashboard_CompletedRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "serviceID"?: number | null;
 "priorityCode"?: string | null;
 "statusCode"?: string | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "totalRows"?: number | null;
}
export interface Dashboard_CompletedRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_FailedResponse {
 "rows1"?: (Dashboard_FailedRow1)[] | null;
}
export interface Dashboard_FailedRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "serviceID"?: number | null;
 "priorityCode"?: string | null;
 "statusCode"?: string | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "totalRows"?: number | null;
}
export interface Dashboard_FailedRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_PendingFollowUpsResponse {
 "rows1"?: (Dashboard_PendingFollowUpsRow1)[] | null;
}
export interface Dashboard_PendingFollowUpsRow1 {
 "followUpScheduleID"?: number | null;
 "requestID"?: number | null;
 "followUpSubject"?: string | null;
 "scheduledAt"?: string | null;
 "totalRows"?: number | null;
}
export interface Dashboard_PendingFollowUpsRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_OverdueFollowUpsResponse {
 "rows1"?: (Dashboard_OverdueFollowUpsRow1)[] | null;
}
export interface Dashboard_OverdueFollowUpsRow1 {
 "followUpScheduleID"?: number | null;
 "requestID"?: number | null;
 "followUpSubject"?: string | null;
 "scheduledAt"?: string | null;
 "totalRows"?: number | null;
}
export interface Dashboard_OverdueFollowUpsRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_TicketVolumeByServiceResponse {
 "rows1"?: (Dashboard_TicketVolumeByServiceRow1)[] | null;
}
export interface Dashboard_TicketVolumeByServiceRow1 {
 "groupKey"?: number | null;
 "ticketCount"?: number | null;
}
export interface Dashboard_TicketVolumeByServiceRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_TicketVolumeByDateResponse {
 "rows1"?: (Dashboard_TicketVolumeByDateRow1)[] | null;
}
export interface Dashboard_TicketVolumeByDateRow1 {
 "groupKey"?: string | null;
 "ticketCount"?: number | null;
}
export interface Dashboard_TicketVolumeByDateRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_AgentCreatedTicketCountsResponse {
 "rows1"?: (Dashboard_AgentCreatedTicketCountsRow1)[] | null;
}
export interface Dashboard_AgentCreatedTicketCountsRow1 {
 "groupKey"?: string | null;
 "ticketCount"?: number | null;
}
export interface Dashboard_AgentCreatedTicketCountsRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Dashboard_ManagerActivitySummaryResponse {
 "rows1"?: (Dashboard_ManagerActivitySummaryRow1)[] | null;
}
export interface Dashboard_ManagerActivitySummaryRow1 {
 "managerID"?: string | null;
 "activityType"?: string | null;
 "activityCount"?: number | null;
}
export interface Dashboard_ManagerActivitySummaryRequest {
 "fromDate": string;
 "toDate": string;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Ticket_ApproveResponse {
}
export interface Ticket_ApproveRequest {
 "requestID": number;
 "expectedRowVersion": string;
 "remarks"?: string | null;
}
export interface Ticket_RejectResponse {
}
export interface Ticket_RejectRequest {
 "requestID": number;
 "expectedRowVersion": string;
 "remarks": string;
}
export interface Ticket_UpdateStatusResponse {
}
export interface Ticket_UpdateStatusRequest {
 "requestID": number;
 "toStatusID": number;
 "expectedRowVersion": string;
 "remarks"?: string | null;
}
export interface Ticket_GetByIDResponse {
 "rows1"?: (Ticket_GetByIDRow1)[] | null;
 "rows2"?: (Ticket_GetByIDRow2)[] | null;
}
export interface Ticket_GetByIDRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "serviceID"?: number | null;
 "versionID"?: number | null;
 "requestTitle"?: string | null;
 "requestSourceCode"?: string | null;
 "cardLast4"?: string | null;
 "priorityID"?: number | null;
 "currentStatusID"?: number | null;
 "approvalStatus"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "approvedAt"?: string | null;
 "completedAt"?: string | null;
 "closedAt"?: string | null;
 "createdByAgentName"?: string | null;
 "createdAt"?: string | null;
 "lastUpdatedByRole"?: string | null;
 "lastUpdatedAt"?: string | null;
 "nextFollowUpAt"?: string | null;
 "followUpRequired"?: boolean | null;
 "rowVersion"?: string | null;
 "maskedCustomerMobile"?: string | null;
}
export interface Ticket_GetByIDRow2 {
 "requestFieldValueID"?: number | null;
 "fieldID"?: number | null;
 "fieldKeySnapshot"?: string | null;
 "fieldLabelSnapshot"?: string | null;
 "fieldTypeSnapshot"?: string | null;
}
export interface Ticket_GetByIDRequest {
 "requestID": number;
}
export interface Ticket_GetByNumberResponse {
 "rows1"?: (Ticket_GetByNumberRow1)[] | null;
 "rows2"?: (Ticket_GetByNumberRow2)[] | null;
}
export interface Ticket_GetByNumberRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "serviceID"?: number | null;
 "versionID"?: number | null;
 "requestTitle"?: string | null;
 "requestSourceCode"?: string | null;
 "cardLast4"?: string | null;
 "priorityID"?: number | null;
 "currentStatusID"?: number | null;
 "approvalStatus"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "approvedAt"?: string | null;
 "completedAt"?: string | null;
 "closedAt"?: string | null;
 "createdByAgentName"?: string | null;
 "createdAt"?: string | null;
 "lastUpdatedByRole"?: string | null;
 "lastUpdatedAt"?: string | null;
 "nextFollowUpAt"?: string | null;
 "followUpRequired"?: boolean | null;
 "rowVersion"?: string | null;
 "maskedCustomerMobile"?: string | null;
}
export interface Ticket_GetByNumberRow2 {
 "requestFieldValueID"?: number | null;
 "fieldID"?: number | null;
 "fieldKeySnapshot"?: string | null;
 "fieldLabelSnapshot"?: string | null;
 "fieldTypeSnapshot"?: string | null;
}
export interface Ticket_GetByNumberRequest {
 "ticketNumber": string;
}
export interface Ticket_SearchResponse {
 "rows1"?: (Ticket_SearchRow1)[] | null;
}
export interface Ticket_SearchRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "serviceID"?: number | null;
 "priorityID"?: number | null;
 "currentStatusID"?: number | null;
 "approvalStatus"?: string | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "nextFollowUpAt"?: string | null;
 "rowVersion"?: string | null;
 "totalRows"?: number | null;
}
export interface Ticket_SearchRequest {
 "ticketNumber"?: string | null;
 "customerMobile"?: string | null;
 "cbS_CIF"?: string | null;
 "accountNumber"?: string | null;
 "cardClientID"?: string | null;
 "cardCIF"?: string | null;
 "cardLast4"?: string | null;
 "internetBankingUserID"?: string | null;
 "customerName"?: string | null;
 "serviceID"?: number | null;
 "priorityID"?: number | null;
 "statusID"?: number | null;
 "fromDate"?: string | null;
 "toDate"?: string | null;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Ticket_GetRecentByCustomerResponse {
 "rows1"?: (Ticket_GetRecentByCustomerRow1)[] | null;
}
export interface Ticket_GetRecentByCustomerRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "serviceID"?: number | null;
 "priorityID"?: number | null;
 "currentStatusID"?: number | null;
 "approvalStatus"?: string | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "nextFollowUpAt"?: string | null;
 "rowVersion"?: string | null;
 "totalRows"?: number | null;
}
export interface Ticket_GetRecentByCustomerRequest {
 "customerMobile"?: string | null;
 "cbS_CIF"?: string | null;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Ticket_GetPendingApprovalResponse {
 "rows1"?: (Ticket_GetPendingApprovalRow1)[] | null;
}
export interface Ticket_GetPendingApprovalRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "priorityID"?: number | null;
 "priorityCode"?: string | null;
 "currentStatusID"?: number | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "rowVersion"?: string | null;
 "totalRows"?: number | null;
}
export interface Ticket_GetPendingApprovalRequest {
 "fromDate"?: string | null;
 "toDate"?: string | null;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Ticket_GetPriorityQueueResponse {
 "rows1"?: (Ticket_GetPriorityQueueRow1)[] | null;
}
export interface Ticket_GetPriorityQueueRow1 {
 "requestID"?: number | null;
 "ticketNumber"?: string | null;
 "requestTitle"?: string | null;
 "priorityID"?: number | null;
 "priorityCode"?: string | null;
 "currentStatusID"?: number | null;
 "createdAt"?: string | null;
 "approvalDueAt"?: string | null;
 "resolutionDueAt"?: string | null;
 "rowVersion"?: string | null;
 "totalRows"?: number | null;
}
export interface Ticket_GetPriorityQueueRequest {
 "fromDate"?: string | null;
 "toDate"?: string | null;
 "page"?: number | null;
 "pageSize"?: number | null;
}
export interface Ticket_GetStatusHistoryResponse {
 "rows1"?: (Ticket_GetStatusHistoryRow1)[] | null;
}
export interface Ticket_GetStatusHistoryRow1 {
 "statusHistoryID"?: number | null;
 "fromStatusID"?: number | null;
 "toStatusID"?: number | null;
 "changedByRole"?: string | null;
 "changedAt"?: string | null;
}
export interface Ticket_GetStatusHistoryRequest {
 "requestID": number;
}
export interface Ticket_GetActivityHistoryResponse {
 "rows1"?: (Ticket_GetActivityHistoryRow1)[] | null;
}
export interface Ticket_GetActivityHistoryRow1 {
 "activityID"?: number | null;
 "activityType"?: string | null;
 "activityTitle"?: string | null;
 "performedByRole"?: string | null;
 "activityAt"?: string | null;
}
export interface Ticket_GetActivityHistoryRequest {
 "requestID": number;
}
export interface Ticket_GetDashboardSummaryResponse {
 "rows1"?: (Ticket_GetDashboardSummaryRow1)[] | null;
}
export interface Ticket_GetDashboardSummaryRow1 {
 "statusCode"?: string | null;
 "statusName"?: string | null;
 "ticketCount"?: number | null;
}
export interface Ticket_GetDashboardSummaryRequest {
 "fromDate": string;
 "toDate": string;
}
