// Read models for the existing Manager-only stored procedure endpoints.
export interface FollowupNote {
 followUpID?:number|null;requestID?:number|null;followUpType?:string|null;followUpNote?:string|null;
 relatedForwardingID?:number|null;createdByManagerID?:string|null;createdByManagerName?:string|null;
 createdByManagerRole?:string|null;authenticationSource?:string|null;createdAt?:string|null;
}
export interface TicketReminder {
 followUpScheduleID?:number|null;requestID?:number|null;relatedFollowUpID?:number|null;relatedForwardingID?:number|null;
 followUpSubject?:string|null;followUpDescription?:string|null;scheduledAt?:string|null;reminderStatus?:string|null;
 assignedManagerID?:string|null;createdByManagerID?:string|null;createdAt?:string|null;
 completedAt?:string|null;completionRemarks?:string|null;cancelledAt?:string|null;cancellationReason?:string|null;
}
export interface TicketCommunication {
 communicationID?:number|null;requestID?:number|null;relatedForwardingID?:number|null;channelCode?:string|null;
 eventCode?:string|null;recipientType?:string|null;communicationStatus?:string|null;providerMessageID?:string|null;
 correlationID?:string|null;createdAt?:string|null;acceptedAt?:string|null;deliveredAt?:string|null;failedAt?:string|null;lastErrorCode?:string|null;
}
export interface TicketForwarding {
 forwardingID?:number|null;requestID?:number|null;forwardingType?:string|null;destinationName?:string|null;
 toAddresses?:string|null;ccAddresses?:string|null;emailSubject?:string|null;emailBody?:string|null;
 forwardingRemarks?:string|null;submissionStatus?:string|null;submissionAttemptCount?:number|null;
 acceptedAt?:string|null;failureReason?:string|null;forwardedByManagerID?:string|null;forwardedByManagerName?:string|null;createdAt?:string|null;
}
