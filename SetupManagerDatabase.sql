-- Run the entire file in SSMS against the LOCAL development database.
-- Rerunnable: adds only missing MGRTEST ticket numbers. Does not reset decisions.
-- Test tickets are direct fixture inserts: no tracking secrets or delivery/outbox jobs.
USE [JamunaCustomer360];
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
IF CONVERT(nvarchar(128),SERVERPROPERTY('MachineName'))<>N'DESKTOP-BUDV4V7'
 THROW 53500,'This script is for DESKTOP-BUDV4V7 local development only.',1;
IF @@TRANCOUNT<>0 THROW 53500,'Run in a fresh query without an open transaction.',1;
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @lock int;
 EXEC @lock=sys.sp_getapplock @Resource=N'Customer360.ManagerTestFixture.v1',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000;
 IF @lock<0 THROW 53500,'Test fixture is being installed by another session.',1;
 IF DATABASE_PRINCIPAL_ID('Customer360_LocalManager') IS NULL
  CREATE USER Customer360_LocalManager WITHOUT LOGIN;
 IF EXISTS(SELECT 1 FROM sys.database_principals WHERE name='Customer360_LocalManager' AND authentication_type<>0)
  THROW 53500,'Manager fixture principal conflicts with an existing login-mapped user.',1;
 IF DATABASE_PRINCIPAL_ID('Customer360_ManagerExecRole') IS NULL
  THROW 53500,'Deploy the existing Manager stored procedure role first.',1;
 IF IS_ROLEMEMBER('Customer360_ManagerExecRole','Customer360_LocalManager')<>1
  ALTER ROLE Customer360_ManagerExecRole ADD MEMBER Customer360_LocalManager;

 DECLARE @Service bigint,@Version bigint,@Pending int,@Approved int,@Rejected int;
 SELECT @Service=s.ServiceID,@Version=v.VersionID FROM dbo.ServiceMaster s
 JOIN dbo.ServiceVersion v ON v.ServiceID=s.ServiceID AND v.VersionStatus='PUBLISHED'
 WHERE s.ServiceCode='LOCAL_DEV_TEST' AND s.IsActive=1;
 IF @Version IS NULL THROW 53500,'Existing published LOCAL_DEV_TEST service is required.',1;
 SELECT @Pending=StatusID FROM dbo.TicketStatusMaster WHERE StatusCode='PENDING_APPROVAL' AND IsActive=1;
 SELECT @Approved=StatusID FROM dbo.TicketStatusMaster WHERE StatusCode='APPROVED' AND IsActive=1;
 SELECT @Rejected=StatusID FROM dbo.TicketStatusMaster WHERE StatusCode='REJECTED' AND IsActive=1;
 IF @Pending IS NULL OR @Approved IS NULL OR @Rejected IS NULL THROW 53500,'Required status seeds are missing.',1;
 DECLARE @n int=1,@id bigint,@ticket varchar(30),@priority int,@state varchar(20),@status int,@created datetime2(3),@decisionAt datetime2(3),@approval bigint;
 WHILE @n<=36
 BEGIN
  SET @ticket=CONCAT('MGRTEST-',RIGHT('000'+CONVERT(varchar(3),@n),3));
  IF NOT EXISTS(SELECT 1 FROM dbo.ServiceRequest WHERE TicketNumber=@ticket)
  BEGIN
   SET @state=CASE WHEN @n<=24 THEN 'PENDING' WHEN @n<=30 THEN 'APPROVED' ELSE 'REJECTED' END;
   SET @status=CASE @state WHEN 'PENDING' THEN @Pending WHEN 'APPROVED' THEN @Approved ELSE @Rejected END;
   SELECT @priority=PriorityID FROM dbo.PriorityMaster WHERE PriorityCode=CASE @n%4 WHEN 0 THEN 'CRITICAL' WHEN 1 THEN 'HIGH' WHEN 2 THEN 'NORMAL' ELSE 'LOW' END AND IsActive=1;
   IF @priority IS NULL THROW 53500,'Required priority seeds are missing.',1;
   SET @created=DATEADD(hour,-@n,SYSUTCDATETIME());
   SET @decisionAt=DATEADD(minute,10,@created);
   INSERT dbo.ServiceRequest(TicketNumber,ServiceID,VersionID,RequestTitle,RequestSourceCode,RequestDescription,CustomerName,CustomerMobile,PriorityID,CurrentStatusID,ApprovalStatus,ApprovalDueAt,ResolutionDueAt,ApprovedAt,ClosedAt,CreatedByAgentID,CreatedByAgentName,AvayaInteractionID,CreatedAt,FollowUpRequired)
   VALUES(@ticket,@Service,@Version,CONCAT(N'[MANAGER TEST] Synthetic request ',@n),'AVAYA_AGENT',N'Synthetic fixture for Manager approval testing. No real banking operation or customer.',CONCAT(N'Test Customer ',@n),'00000000000',@priority,@status,@state,DATEADD(hour,CASE WHEN @n%2=0 THEN -2 ELSE 24 END,SYSUTCDATETIME()),DATEADD(hour,CASE WHEN @n%3=0 THEN -1 ELSE 48 END,SYSUTCDATETIME()),CASE WHEN @state='APPROVED' THEN @decisionAt END,CASE WHEN @state='REJECTED' THEN @decisionAt END,'MGRTEST_AGENT',N'Synthetic Test Agent',CONCAT('MGRTEST-INTERACTION-',@n),@created,0);
   SET @id=SCOPE_IDENTITY();
   INSERT dbo.ServiceRequestFieldValue(RequestID,FieldID,FieldKeySnapshot,FieldLabelSnapshot,FieldTypeSnapshot,FieldValue)
   SELECT @id,FieldID,FieldKey,FieldLabel,FieldType,N'Synthetic Manager testing only' FROM dbo.ServiceField WHERE VersionID=@Version AND FieldKey='LOCAL_DEV_NOTE';
   INSERT dbo.ServiceRequestStatusHistory(RequestID,FromStatusID,ToStatusID,ChangedByID,ChangedByName,ChangedByRole,ChangeRemarks,ChangedAt)
   VALUES(@id,NULL,@Pending,'MGRTEST_AGENT',N'Synthetic Test Agent','AGENT',N'Synthetic fixture created',@created);
   INSERT dbo.ServiceRequestActivity(RequestID,ActivityType,ActivityTitle,ActivityDescription,PerformedByID,PerformedByName,PerformedByRole,ActivityAt)
   VALUES(@id,'TEST_FIXTURE',N'Synthetic request created',N'Local Manager test data; no delivery jobs created.','MGRTEST_AGENT',N'Synthetic Test Agent','AGENT',@created);
   IF @state<>'PENDING'
   BEGIN
    INSERT dbo.ServiceRequestApproval(RequestID,Decision,ManagerID,ManagerName,ManagerRole,DecisionRemarks,DecisionAt,AuthenticationSource)
    VALUES(@id,@state,'MGR001',N'Local Test Manager','MANAGER',N'Synthetic historical decision',@decisionAt,'EXTERNAL_MANAGER');
    SET @approval=SCOPE_IDENTITY();
    INSERT dbo.ServiceRequestStatusHistory(RequestID,FromStatusID,ToStatusID,ChangedByID,ChangedByName,ChangedByRole,ChangeRemarks,ChangedAt,RelatedApprovalID)
    VALUES(@id,@Pending,@status,'MGR001',N'Local Test Manager','MANAGER',N'Synthetic historical decision',@decisionAt,@approval);
   END;
  END;
  SET @n+=1;
 END;
 COMMIT TRANSACTION;
 SELECT ApprovalStatus,COUNT(*) AS TestTickets FROM dbo.ServiceRequest WHERE TicketNumber LIKE 'MGRTEST-%' GROUP BY ApprovalStatus;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;

