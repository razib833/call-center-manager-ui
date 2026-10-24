using System.Security.Cryptography;
using System.Text;
using Customer360.Contracts;
using Customer360.Security;
namespace Customer360.Integrations;

// Local development host only; never registered by the Agent API.
public sealed class LocalManagerAuthentication(IHostEnvironment environment, IHttpContextAccessor accessor) : IManagerAuthentication
{
 public Task<Actor> AuthenticateAsync(ManagerCredentials credentials, CancellationToken ct)
 {
  ct.ThrowIfCancellationRequested();
  var ip=accessor.HttpContext?.Connection.RemoteIpAddress;
  if(!environment.IsDevelopment() || ip is null || !System.Net.IPAddress.IsLoopback(ip))
   throw new ApiFault(403,"LOCAL_ONLY","Local development Manager login required");
  var expected=SHA256.HashData(Encoding.UTF8.GetBytes("Manager@Test123!"));
  var actual=SHA256.HashData(Encoding.UTF8.GetBytes(credentials.Password));
  if(!string.Equals(credentials.Username,"manager@local.test",StringComparison.OrdinalIgnoreCase) || !CryptographicOperations.FixedTimeEquals(expected,actual))
   throw new ApiFault(401,"INVALID_CREDENTIALS","Incorrect Manager email or password");
  return Task.FromResult(new Actor("MGR001","Local Test Manager","MANAGER","EXTERNAL_MANAGER",DateTime.UtcNow.AddMinutes(15),Guid.NewGuid()));
 }
}
