using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Customer360.Application;
using Customer360.Contracts;
using Customer360.Controllers;
using Customer360.Data;
using Customer360.Integrations;
using Customer360.Security;
using Customer360.Workers;

if(args.Length==2&&args[0]=="--export-openapi"){File.WriteAllText(args[1],Customer360.Documentation.OpenApiDocument.Generate());return;}
var builder=WebApplication.CreateBuilder(args);
if(!builder.Environment.IsDevelopment())throw new InvalidOperationException("This Manager test host is local Development only");
builder.WebHost.ConfigureKestrel(o=>o.Limits.MaxRequestBodySize=1_048_576);
if((builder.Environment.IsDevelopment()||builder.Environment.IsEnvironment("Testing"))&&builder.Configuration["DevelopmentTls:PemPath"] is {} pemPath&&builder.Configuration["DevelopmentTls:KeyPath"] is {} keyFile)
{
 var certificate=System.Security.Cryptography.X509Certificates.X509Certificate2.CreateFromPemFile(pemPath,keyFile);
 builder.WebHost.ConfigureKestrel(o=>o.ListenLocalhost(builder.Configuration.GetValue<int>("DevelopmentTls:Port"),listen=>listen.UseHttps(certificate)));
}
var mockDb=builder.Configuration.GetValue<bool>("Development:EnableMockDatabase");
var mockAuth=builder.Configuration.GetValue<bool>("Development:EnableMockAuth");
var mockIntegrations=builder.Configuration.GetValue<bool>("Development:EnableMockIntegrations");
FeatureSafety.Validate(builder.Environment.EnvironmentName,mockDb,mockAuth,mockIntegrations,builder.Configuration.GetValue<bool>("Workers:Enabled"));
var loopbackHttp=builder.Configuration.GetValue<bool>("Testing:AllowLoopbackHttp");
var localDevelopmentHttp=builder.Configuration.GetValue<bool>("Development:AllowLoopbackHttp");
if(localDevelopmentHttp)
{
 if(!builder.Environment.IsDevelopment())throw new InvalidOperationException("Development loopback HTTP requires Development environment");
 if(loopbackHttp)throw new InvalidOperationException("Choose one loopback HTTP mode");
 if(builder.Configuration["DevelopmentTls:PemPath"] is not null)throw new InvalidOperationException("Remove DevelopmentTls settings when using loopback HTTP");
 builder.WebHost.ConfigureKestrel(o=>o.ListenLocalhost(builder.Configuration.GetValue<int>("Development:Port",7246)));
}
if(loopbackHttp)
{
 if(!builder.Environment.IsEnvironment("Testing")||!mockDb||!mockAuth||!mockIntegrations)throw new InvalidOperationException("Loopback HTTP is restricted to all-mock Testing");
 builder.WebHost.ConfigureKestrel(o=>o.ListenLocalhost(builder.Configuration.GetValue<int>("Testing:Port",7246)));
}
builder.Logging.ClearProviders();builder.Logging.AddJsonConsole();
builder.Services.AddControllers().AddJsonOptions(o=>o.JsonSerializerOptions.UnmappedMemberHandling=JsonUnmappedMemberHandling.Disallow);
builder.Services.Configure<ApiBehaviorOptions>(o=>o.InvalidModelStateResponseFactory=c=>new BadRequestObjectResult(ApiResponse<object>.Error("Request validation failed",c.HttpContext.TraceIdentifier)));
builder.Services.Configure<DatabaseOptions>(builder.Configuration.GetSection("Database"));
builder.Services.AddHttpContextAccessor();builder.Services.AddScoped<ActorAccessor>();
var protection=builder.Services.AddDataProtection().SetApplicationName("JamunaCustomer360.Api");
if(builder.Environment.IsDevelopment()||builder.Environment.IsEnvironment("Testing"))protection.UseEphemeralDataProtectionProvider();
else if(OperatingSystem.IsWindows()&&builder.Configuration["Security:DataProtectionKeyPath"] is {} keyPath)protection.PersistKeysToFileSystem(new DirectoryInfo(keyPath)).ProtectKeysWithDpapi();
else throw new InvalidOperationException("Production requires protected persistent Data Protection keys");
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o=>{
 o.Cookie.Name="C360-LOCAL-MANAGER";o.Cookie.HttpOnly=true;o.Cookie.SecurePolicy=loopbackHttp||localDevelopmentHttp?CookieSecurePolicy.None:CookieSecurePolicy.Always;o.Cookie.SameSite=SameSiteMode.Strict;o.Cookie.Path="/";o.SlidingExpiration=false;
 o.Events.OnRedirectToLogin=async c=>{c.Response.StatusCode=401;await c.Response.WriteAsJsonAsync(ApiResponse<object>.Error("Authentication required",c.HttpContext.TraceIdentifier));};
 o.Events.OnRedirectToAccessDenied=async c=>{c.Response.StatusCode=403;await c.Response.WriteAsJsonAsync(ApiResponse<object>.Error("Access denied",c.HttpContext.TraceIdentifier));};
});
builder.Services.AddAuthorization(o=>{foreach(var capability in new[]{"AGENT","MANAGER","CONFIG","WORKER","PUBLIC","AUDIT","READ","TRUSTED"})o.AddPolicy(capability,p=>p.RequireAuthenticatedUser().RequireAssertion(c=>{
 var a=c.User.FindFirst("capability")?.Value;var expiry=c.User.FindFirst("verified_until")?.Value;if(!long.TryParse(expiry,out var e)||DateTimeOffset.FromUnixTimeSeconds(e)<=DateTimeOffset.UtcNow)return false;
 return capability switch{"READ"=>a is "AGENT" or "MANAGER" or "CONFIG","TRUSTED"=>a is "AGENT" or "MANAGER" or "CONFIG" or "WORKER",_=>a==capability};}));});
builder.Services.AddAntiforgery(o=>{o.Cookie.Name="C360-LOCAL-MANAGER-CSRF";o.HeaderName="X-CSRF-TOKEN";o.Cookie.SecurePolicy=loopbackHttp||localDevelopmentHttp?CookieSecurePolicy.None:CookieSecurePolicy.Always;o.Cookie.SameSite=SameSiteMode.Strict;});
builder.Services.AddRateLimiter(o=>{o.GlobalLimiter=PartitionedRateLimiter.Create<HttpContext,string>(ctx=>RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString()??"unknown",_=>new(){PermitLimit=60,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));o.RejectionStatusCode=429;o.OnRejected=async (c,ct)=>await c.HttpContext.Response.WriteAsJsonAsync(ApiResponse<object>.Error("Request limit exceeded",c.HttpContext.TraceIdentifier),ct);});
builder.Services.AddSingleton<MockProcedureExecutor>();
if(mockDb)builder.Services.AddSingleton<IProcedureExecutor>(s=>s.GetRequiredService<MockProcedureExecutor>());
else builder.Services.AddScoped<IProcedureExecutor,SqlProcedureExecutor>();
builder.Services.AddScoped<Procedures>();builder.Services.AddScoped<TicketApplication>();
builder.Services.AddScoped<IntegrationAudit>();
builder.Services.AddSingleton<UnconfiguredIntegrations>();builder.Services.AddSingleton<DevelopmentIntegrations>();
builder.Services.AddSingleton<IAvayaIntegration>(s=>s.GetRequiredService<UnconfiguredIntegrations>());builder.Services.AddSingleton<IManagerAuthentication,LocalManagerAuthentication>();
builder.Services.AddSingleton<ICbsMiddleware>(s=>mockIntegrations?s.GetRequiredService<DevelopmentIntegrations>():s.GetRequiredService<UnconfiguredIntegrations>());
builder.Services.AddSingleton<IAccountStatementDelivery>(s=>mockIntegrations?s.GetRequiredService<DevelopmentIntegrations>():s.GetRequiredService<UnconfiguredIntegrations>());
builder.Services.AddSingleton<ICardMiddleware>(s=>mockIntegrations?s.GetRequiredService<DevelopmentIntegrations>():s.GetRequiredService<UnconfiguredIntegrations>());
builder.Services.AddSingleton<IInternetBankingMiddleware>(s=>mockIntegrations?s.GetRequiredService<DevelopmentIntegrations>():s.GetRequiredService<UnconfiguredIntegrations>());
builder.Services.AddSingleton<IDeliveryProtector>(s=>mockIntegrations?s.GetRequiredService<DevelopmentIntegrations>():s.GetRequiredService<UnconfiguredIntegrations>());
builder.Services.AddSingleton<ISmsProvider>(s=>mockIntegrations?s.GetRequiredService<DevelopmentIntegrations>():s.GetRequiredService<UnconfiguredIntegrations>());
builder.Services.AddSingleton<IEmailProvider>(s=>mockIntegrations?s.GetRequiredService<DevelopmentIntegrations>():s.GetRequiredService<UnconfiguredIntegrations>());
builder.Services.AddScoped<CommunicationProcessor>();builder.Services.AddSingleton<IReconciliationBacklog,UnconfiguredReconciliationBacklog>();
// Neither background worker is registered. Enabling Workers is rejected until reviewed integration is complete.
var app=builder.Build();
app.Use(async (ctx,next)=>{
 ctx.TraceIdentifier=Guid.NewGuid().ToString();ctx.Response.Headers["X-Correlation-ID"]=ctx.TraceIdentifier;
 ctx.Response.Headers.CacheControl="no-store";ctx.Response.Headers["X-Content-Type-Options"]="nosniff";ctx.Response.Headers["Referrer-Policy"]="no-referrer";
 try{await next();}
 catch(ApiFault fault){ctx.Response.StatusCode=fault.Status;await ctx.Response.WriteAsJsonAsync(ApiResponse<object>.Error(fault.Message,ctx.TraceIdentifier));}
 catch(AntiforgeryValidationException){ctx.Response.StatusCode=400;await ctx.Response.WriteAsJsonAsync(ApiResponse<object>.Error("Request verification failed",ctx.TraceIdentifier));}
 catch(OperationCanceledException) when(ctx.RequestAborted.IsCancellationRequested){}
 catch(Exception){app.Logger.LogError("Unhandled request failure; correlation {Correlation}",ctx.TraceIdentifier);ctx.Response.StatusCode=500;await ctx.Response.WriteAsJsonAsync(ApiResponse<object>.Error("Request could not be completed",ctx.TraceIdentifier));}
});
if(!app.Environment.IsDevelopment()&&!app.Environment.IsEnvironment("Testing")){app.UseHsts();app.UseHttpsRedirection();}
app.UseRateLimiter();app.UseAuthentication();app.UseAuthorization();
app.UseStaticFiles();

app.UseStatusCodePages(async status=>{await status.HttpContext.Response.WriteAsJsonAsync(ApiResponse<object>.Error("Requested operation is unavailable",status.HttpContext.TraceIdentifier));});
app.Use(async(ctx,next)=>{if(HttpMethods.IsPost(ctx.Request.Method)&&ctx.Request.Path.StartsWithSegments("/api/v1")&&ctx.Request.Path!="/api/v1/tracking")await ctx.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(ctx);await next();});
app.MapControllers();
app.MapGet("/health",()=>Results.Json(new{status="alive",service="customer360-local-manager",database="JamunaCustomer360",databaseIntegration="CONFIGURED_NOT_PROBED",workersEnabled=false,mockDatabase=mockDb}));
if(app.Environment.IsDevelopment()||app.Environment.IsEnvironment("Testing"))app.MapGet("/openapi/v1.json",()=>Results.File(Path.Combine(app.Environment.ContentRootPath,"OpenApi","openapi.json"),"application/json"));
app.Run();
public partial class Program;


