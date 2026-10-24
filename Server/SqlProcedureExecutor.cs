using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;
using Customer360.Contracts;
using Customer360.Security;
namespace Customer360.Data;
public sealed class SqlProcedureExecutor(IOptions<DatabaseOptions> options,ILogger<SqlProcedureExecutor> logger,IHostEnvironment? environment=null) : IProcedureExecutor
{
 public async Task<ProcedureResult> ExecuteAsync(ProcedureSpec procedure,IReadOnlyDictionary<string,object?> parameters,Actor actor,CancellationToken ct)
 {
  actor.Demand(procedure.Capability);
  if(!ProcedureCatalog.All.ContainsKey(procedure.Name))throw new ApiFault(403,"UNKNOWN_PROCEDURE","Access denied");
  if(!options.Value.Connections.TryGetValue(actor.Capability,out var text)||string.IsNullOrWhiteSpace(text))throw new ApiFault(503,"DATABASE_UNCONFIGURED","Database integration is not configured");
  var builder=new SqlConnectionStringBuilder(text){Pooling=false,Encrypt=SqlConnectionEncryptOption.Mandatory,TrustServerCertificate=false,MultipleActiveResultSets=false};
  if(options.Value.AllowUnencryptedLocalDevelopment)
  {
   if(environment?.IsDevelopment()!=true || !new[]{Environment.MachineName,"localhost","127.0.0.1","."}.Contains(builder.DataSource,StringComparer.OrdinalIgnoreCase))throw new ApiFault(503,"DATABASE_TARGET","Unencrypted SQL is restricted to local Development");
   builder.Encrypt=SqlConnectionEncryptOption.Optional;
   builder.TrustServerCertificate=true;
  }
  if(!string.Equals(builder.DataSource,options.Value.ExpectedServer,StringComparison.OrdinalIgnoreCase))throw new ApiFault(503,"DATABASE_TARGET","Database server differs from approved configuration");
  if(!string.Equals(builder.InitialCatalog,options.Value.ExpectedDatabase,StringComparison.Ordinal)||!options.Value.ExpectedUsers.TryGetValue(actor.Capability,out var expectedUser))throw new ApiFault(503,"DATABASE_TARGET","Database identity configuration is incomplete");
  await using var connection=new SqlConnection(builder.ConnectionString);
  RequireApprovedIdentity(actor,expectedUser);
  try
  {
   await connection.OpenAsync(ct);
   // Local test host: constrain every request to the Manager procedure role.
   await using(var identity=new SqlCommand("EXECUTE AS USER = 'Customer360_LocalManager'; IF USER_NAME() <> 'Customer360_LocalManager' OR IS_ROLEMEMBER('Customer360_ManagerExecRole') <> 1 THROW 53501, 'Manager SQL identity verification failed', 1;",connection)){await identity.ExecuteNonQueryAsync(ct);}
   foreach(var (key,value) in Context(actor))
   {
    await using var context=new SqlCommand("sys.sp_set_session_context",connection){CommandType=CommandType.StoredProcedure};
    context.Parameters.Add(new("@key",SqlDbType.NVarChar,128){Value=key});
    context.Parameters.Add(new("@value",SqlDbType.Variant){Value=value??DBNull.Value});
    context.Parameters.Add(new("@read_only",SqlDbType.Bit){Value=true});
    await context.ExecuteNonQueryAsync(ct);
   }
   await using var command=BuildCommand(procedure,parameters,connection);
   var result=new ProcedureResult();
   await using(var reader=await command.ExecuteReaderAsync(ct))
   {
    do
    {
     if(reader.FieldCount==0)continue;
     if(result.Sets.Count>=procedure.Columns.Count||!Enumerable.Range(0,reader.FieldCount).Select(reader.GetName).SequenceEqual(procedure.Columns[result.Sets.Count],StringComparer.OrdinalIgnoreCase))throw new ApiFault(503,"CONTRACT_MISMATCH","Database result columns differ");
     var rows=new List<Dictionary<string,object?>>();
     while(await reader.ReadAsync(ct)){var row=new Dictionary<string,object?>(StringComparer.OrdinalIgnoreCase);for(var i=0;i<reader.FieldCount;i++)row.Add(reader.GetName(i),await reader.IsDBNullAsync(i,ct)?null:reader.GetValue(i));rows.Add(row);}
     result.Sets.Add(rows);
    }while(await reader.NextResultAsync(ct));
   }
   if(result.Sets.Count!=procedure.ResultSets)throw new ApiFault(503,"CONTRACT_MISMATCH","Database result contract differs");
   foreach(SqlParameter p in command.Parameters)if(p.Direction==ParameterDirection.Output)result.Outputs[p.ParameterName.TrimStart('@')]=p.Value is DBNull?null:p.Value;
   return result;
  }
  catch(SqlException ex){logger.LogWarning("Stored procedure {Procedure} failed with SQL code {Code}; correlation {Correlation}",procedure.Name,ex.Number,actor.CorrelationId);throw DatabaseErrors.Map(ex.Number);}
 }
 private void RequireApprovedIdentity(Actor actor,string expectedUser)
 {
  if(string.IsNullOrWhiteSpace(expectedUser)||actor.Capability=="PUBLIC"&&expectedUser.Contains("dbo",StringComparison.OrdinalIgnoreCase))throw new ApiFault(503,"IDENTITY_UNVERIFIED","SQL execution identity is unverified");
  // Existing business procedures cannot attest ORIGINAL_LOGIN/USER_NAME without ad-hoc SQL.
  // Require externally reviewed live identity evidence; this reference is not runtime proof.
  if(!options.Value.LiveValidationApproved||!options.Value.IdentityVerificationReferences.TryGetValue(actor.Capability,out var reference)||string.IsNullOrWhiteSpace(reference))throw new ApiFault(503,"IDENTITY_UNVERIFIED","Live SQL identity verification is pending");
 }
 public static SqlCommand BuildCommand(ProcedureSpec procedure,IReadOnlyDictionary<string,object?> values,SqlConnection? connection=null)
 {
  var command=new SqlCommand("dbo."+procedure.Name,connection){CommandType=CommandType.StoredProcedure,CommandTimeout=30};
  foreach(var p in procedure.Parameters)
  {
   var type=p.SqlType switch {"int"=>SqlDbType.Int,"bigint"=>SqlDbType.BigInt,"smallint"=>SqlDbType.SmallInt,"tinyint"=>SqlDbType.TinyInt,"bit"=>SqlDbType.Bit,"varchar"=>SqlDbType.VarChar,"nvarchar"=>SqlDbType.NVarChar,"binary"=>SqlDbType.Binary,"varbinary"=>SqlDbType.VarBinary,"uniqueidentifier"=>SqlDbType.UniqueIdentifier,"datetime2"=>SqlDbType.DateTime2,_=>throw new InvalidOperationException("Unsupported SQL parameter type")};
   var arg=new SqlParameter("@"+p.Name,type){Direction=p.Output?ParameterDirection.Output:ParameterDirection.Input};
   if(p.Size!=0 && p.SqlType!="datetime2")arg.Size=p.Size;
   if(p.SqlType=="datetime2")arg.Scale=3;
   if(!p.Output){if(!values.TryGetValue(p.Name,out var value))throw new ApiFault(400,"PARAMETER_MISSING","Required request field missing");arg.Value=value??DBNull.Value;}
   command.Parameters.Add(arg);
  }
  return command;
 }
 public static IReadOnlyDictionary<string,object?> Context(Actor actor)=>new Dictionary<string,object?>{
  ["Customer360.ActorID"]=actor.Id,["Customer360.ActorName"]=actor.Name,["Customer360.ActorRole"]=actor.SqlRole,["Customer360.AuthenticationSource"]=actor.Source,["Customer360.VerifiedUntil"]=actor.VerifiedUntil,["Customer360.CorrelationID"]=actor.CorrelationId};
}
public static class DatabaseErrors
{
 public static ApiFault Map(int code)=>code switch {
  52000 or 229=>new(403,"ACCESS_DENIED","Access denied"),52001=>new(400,"VALIDATION","Request validation failed"),
  52004=>new(409,"STALE_OR_MISSING","Resource is missing or has changed; refresh before retrying"),
  52005 or 52006 or 52010=>new(422,"BUSINESS_RULE","Operation violates the current configuration or workflow"),
  52009 or 2601 or 2627=>new(409,"CONFLICT","Operation conflicts with existing state"),
  52011=>new(410,"EXPIRED","The permitted operation window has expired"),1205=>new(409,"CONCURRENT_UPDATE","Concurrent operation; refresh before retrying"),
  _=>new(503,"DATABASE_UNAVAILABLE","Database operation is unavailable")};
}


